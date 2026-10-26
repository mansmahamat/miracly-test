import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve('.');
const output = join(root, 'output');
const slugs = (await readdir(output, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);

function check(directory) {
  return new Promise((done, reject) => {
    const child = spawn('npx', ['hyperframes@0.8.139', 'check', directory, '--samples=5', '--at-transitions', '--frame-check=severity=error;seek=.25,.75'], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', code => code === 0 ? done() : reject(new Error(`Template check failed: ${directory}`)));
  });
}

for (const slug of slugs) for (const format of ['16x9', '9x16']) await check(join(output, slug, format));
