import { access, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve('.');
const output = join(root, 'output');
const slugs = (await readdir(output, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);

function poster(slug, format) {
  const video = join(output, slug, format, 'video-with-voice.mp4');
  const target = join(output, slug, format, 'poster.jpg');
  return new Promise((done, reject) => {
    const child = spawn('ffmpeg', ['-y', '-ss', '23', '-i', video, '-frames:v', '1', '-update', '1', '-q:v', '2', target], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', code => code === 0 ? done(target) : reject(new Error(`Poster failed for ${slug}/${format}`)));
  });
}

const created = [];
for (const slug of slugs) for (const format of ['16x9', '9x16']) {
  const video = join(output, slug, format, 'video-with-voice.mp4');
  try { await access(video); } catch { continue; }
  created.push(await poster(slug, format));
}
console.log(JSON.stringify({ posters: created }, null, 2));
