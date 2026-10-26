import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'; import { resolve, join } from 'node:path';
import { validatePage } from './lib/validation.js'; import { renderPage, dataChanged } from './lib/render.js';
import { createLocalVoice, muxVoice } from './lib/audio.js';
const root = resolve('.'); const [command, input] = process.argv.slice(2);
async function pageFrom(path) { return JSON.parse(await readFile(path, 'utf8')); }
if (command === 'validate') { const page = await pageFrom(input); const errors = await validatePage(page); console.log(errors.length ? errors.join('\n') : 'Valid'); process.exitCode = errors.length ? 1 : 0; }
else if (command === 'render') { console.log(JSON.stringify(await renderPage(await pageFrom(input), root, { intentionallyInvalid: process.argv.includes('--invalid-mock') }), null, 2)); }
else if (command === 'voice') { const page = await pageFrom(input); const slug = `${page.customer}-${page.page.service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; const script = JSON.parse(await readFile(join(root, 'scripts', `${slug}.json`), 'utf8')); console.log(JSON.stringify(await createLocalVoice({ root, slug, script }), null, 2)); }
else if (command === 'mux') { console.log(await muxVoice({ root, slug: process.argv[3], format: process.argv[4] || '16x9' })); }
else if (command === 'render-all') { const paths = (await readdir(join(root, 'data'))).filter(x => x.endsWith('.json')); const report = []; const force = process.argv.includes('--force'); for (const file of paths) { const page = await pageFrom(join(root, 'data', file)); const slug = `${page.customer}-${page.page.service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; if (force || await dataChanged(page, root, slug)) report.push({ file, ...(await renderPage(page, root, { slug })) }); else report.push({ file, status: 'unchanged' }); } await mkdir(join(root, 'output'), { recursive: true }); await writeFile(join(root, 'output', 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); }
else { console.error('Usage: validate <data.json> | render <data.json> | render-all | voice <data.json> | mux <slug> [16x9|9x16]'); process.exitCode = 1; }
