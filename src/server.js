import http from 'node:http';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { publishApproved } from './lib/publish.js';
import { decideReview, listReviews } from './lib/reviews.js';
import { reviewPage } from './review-ui.js';

const root = resolve('.');
const jobsDir = join(root, 'jobs');
await mkdir(jobsDir, { recursive: true });

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
};

async function getJobs() {
  const files = await readdir(jobsDir);
  return Promise.all(files.filter(file => file.endsWith('.json')).map(async file => JSON.parse(await readFile(join(jobsDir, file), 'utf8'))));
}

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
      return res.end(await readFile(path));
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
    try { return json(res, 200, JSON.parse(await readFile(join(jobsDir, `${jobMatch[1]}.json`), 'utf8'))); }
    catch { return json(res, 404, { error: 'Job not found' }); }
  }

  if (req.method === 'POST' && url.pathname === '/jobs') {
    const body = await requestBody(req);
    const job = { id: randomUUID(), status: 'queued', createdAt: new Date().toISOString(), ...body };
    await writeFile(join(jobsDir, `${job.id}.json`), JSON.stringify(job, null, 2));
    return json(res, 201, job);
  }

  const jobDecision = url.pathname.match(/^\/jobs\/([^/]+)\/(approve|reject)$/);
  if (req.method === 'POST' && jobDecision) {
    const path = join(jobsDir, `${jobDecision[1]}.json`);
    try {
      const job = JSON.parse(await readFile(path, 'utf8'));
      job.status = jobDecision[2] === 'approve' ? 'approved' : 'rejected';
      job.decidedAt = new Date().toISOString();
      await writeFile(path, JSON.stringify(job, null, 2));
      return json(res, 200, job);
    } catch { return json(res, 404, { error: 'Job not found' }); }
  }

  const publishMatch = url.pathname.match(/^\/jobs\/([^/]+)\/publish$/);
  if (req.method === 'POST' && publishMatch) {
    try {
      const job = JSON.parse(await readFile(join(jobsDir, `${publishMatch[1]}.json`), 'utf8'));
      if (job.status !== 'approved') return json(res, 409, { error: 'Human approval required before publishing' });
      return json(res, 200, await publishApproved({ root, job }));
    } catch { return json(res, 404, { error: 'Job not found' }); }
  }

  return json(res, 404, { error: 'Not found' });
});

server.listen(process.env.PORT || 3000, () => console.log('Review UI: http://localhost:3000'));
