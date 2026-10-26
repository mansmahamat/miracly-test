import { readdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createLocalVoice, muxVoice } from './lib/audio.js';
import { renderPage } from './lib/render.js';

const root = resolve('.');
const jobsDir = join(root, 'jobs');
const slugFor = page => `${page.customer}-${page.page.service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

function run(command, args) {
  return new Promise((done, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', code => code === 0 ? done() : reject(new Error(`${command} exited ${code}`)));
  });
}

async function renderJob(job) {
  const slug = slugFor(job.page);
  let draft = await renderPage(job.page, root, { slug });
  if (draft.status !== 'draft') return draft;
  await createLocalVoice({ root, slug, script: draft.script });
  await run('npx', ['hyperframes@0.8.139', 'transcribe', join('output', slug, 'audio', 'voice.wav'), '--model', 'small.en', '--output', join('output', slug, 'audio', 'transcript.json')]);
  draft = await renderPage(job.page, root, { slug });
  for (const format of ['16x9', '9x16']) {
    await run('npx', ['hyperframes@0.8.139', 'render', '-c', join('output', slug, format, 'index.html'), '-o', join('output', slug, format, 'video.mp4'), '-q', 'draft', '-w', '2']);
    await muxVoice({ root, slug, format });
  }
  return { ...draft, outputLinks: Object.fromEntries(['16x9', '9x16'].map(format => [format, `/output/${slug}/${format}/video-with-voice.mp4`])) };
}

async function tick() {
  for (const file of await readdir(jobsDir).catch(() => [])) {
    if (!file.endsWith('.json')) continue;
    const path = join(jobsDir, file);
    const job = JSON.parse(await readFile(path, 'utf8'));
    if (job.status !== 'queued') continue;
    job.status = 'rendering';
    await writeFile(path, JSON.stringify(job, null, 2));
    try {
      job.result = await renderJob(job);
      job.status = job.result.status === 'draft' ? 'review' : 'needs-human';
    } catch (error) {
      job.status = 'needs-human';
      job.result = { status: 'needs-human', errors: [error.message] };
    }
    await writeFile(path, JSON.stringify(job, null, 2));
    console.log(`${job.id}: ${job.status}`);
  }
}

await tick();
setInterval(tick, 1500);
