import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { publishApproved } from './lib/publish.js';
import { decideReview, listReviews } from './lib/reviews.js';
import { reviewPage } from './review-ui.js';
import { jobStore } from './lib/job-store.js';
import { cloudArtifacts, readArtifact } from './lib/artifacts.js';

const root = resolve('.');
const jobs = jobStore(root);

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
};

async function requestBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  try { return JSON.parse(body); } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname.startsWith('/output/')) {
    const path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!path.startsWith(join(root, 'output'))) return json(res, 403, { error: 'Forbidden' });
    try {
      const mime = { '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.json': 'application/json' }[extname(path)] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': mime });
      return res.end(cloudArtifacts ? await readArtifact(decodeURIComponent(url.pathname).replace(/^\/output\//, '')) : await readFile(path));
    } catch { return json(res, 404, { error: 'File not found' }); }
  }

  if (req.method === 'GET' && url.pathname === '/') {
    const reviews = await listReviews(root);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(reviewPage(reviews));
  }

  const reviewMatch = url.pathname.match(/^\/reviews\/([^/]+)\/(approved|rejected)$/);
  if (req.method === 'POST' && reviewMatch) {
    const body = await requestBody(req);
    return json(res, 200, await decideReview(root, reviewMatch[1], reviewMatch[2], body.note || ''));
  }

  const jobMatch = url.pathname.match(/^\/jobs\/([^/]+)$/);
  if (req.method === 'GET' && jobMatch) {
    const job = await jobs.get(jobMatch[1]); return job ? json(res, 200, job) : json(res, 404, { error: 'Job not found' });
  }

  if (req.method === 'POST' && url.pathname === '/jobs') {
    const body = await requestBody(req);
    const job = { id: randomUUID(), status: 'queued', createdAt: new Date().toISOString(), ...body };
    await jobs.create(job);
    return json(res, 201, job);
  }

  const jobDecision = url.pathname.match(/^\/jobs\/([^/]+)\/(approve|reject)$/);
  if (req.method === 'POST' && jobDecision) {
    try {
      const job = await jobs.get(jobDecision[1]); if (!job) throw new Error('Job not found');
      job.status = jobDecision[2] === 'approve' ? 'approved' : 'rejected';
      job.decidedAt = new Date().toISOString();
      await jobs.save(job);
      return json(res, 200, job);
    } catch { return json(res, 404, { error: 'Job not found' }); }
  }

  const publishMatch = url.pathname.match(/^\/jobs\/([^/]+)\/publish$/);
  if (req.method === 'POST' && publishMatch) {
    try {
      const job = await jobs.get(publishMatch[1]); if (!job) throw new Error('Job not found');
      if (job.status !== 'approved') return json(res, 409, { error: 'Human approval required before publishing' });
      return json(res, 200, await publishApproved({ root, job }));
    } catch { return json(res, 404, { error: 'Job not found' }); }
  }

  return json(res, 404, { error: 'Not found' });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Review UI listening on ${port}`));
