import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { validatePage } from './lib/validation.js';
import { renderPage } from './lib/render.js';

const root = resolve('.');
const run = (command, args) => new Promise((resolveRun, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env, HYPERFRAMES_PYTHON: join(root, '.venv', 'bin', 'python') } });
  child.on('error', reject); child.on('close', code => code === 0 ? resolveRun() : reject(new Error(`${command} exited ${code}`)));
});
const slugFor = page => `${page.customer}-${page.page.service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const files = (await readdir(join(root, 'data'))).filter(file => file.endsWith('.json'));
const report = [];
for (const file of files) {
  const page = JSON.parse(await readFile(join(root, 'data', file), 'utf8')); const errors = await validatePage(page); const slug = slugFor(page);
  if (errors.length) { report.push({ file, status: 'needs-human', errors }); continue; }
  try {
    await renderPage(page, root, { slug });
    await run('node', ['src/cli.js', 'voice', join('data', file)]);
    await run('npx', ['hyperframes@0.8.139', 'transcribe', join('output', slug, 'audio', 'voice.wav'), '--model', 'small.en', '--output', join('output', slug, 'audio', 'transcript.json')]);
    await renderPage(page, root, { slug }); // recompose using Whisper timestamps
    for (const format of ['16x9', '9x16']) { await run('npx', ['hyperframes@0.8.139', 'render', '-c', join('output', slug, format, 'index.html'), '-o', join('output', slug, format, 'video.mp4'), '-q', 'draft', '-w', '2']); await run('node', ['src/cli.js', 'mux', slug, format]); }
    report.push({ file, status: 'draft', formats: ['16x9', '9x16'] });
  } catch (error) { report.push({ file, status: 'needs-human', errors: [error.message] }); }
}
await writeFile(join(root, 'output', 'batch-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
