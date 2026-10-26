import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const slugFor = page => `${page.customer}-${page.page.service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
export async function listReviews(root) {
  const pages = await Promise.all((await readdir(join(root, 'data'))).filter(x => x.endsWith('.json')).map(async file => JSON.parse(await readFile(join(root, 'data', file), 'utf8'))));
  return Promise.all(pages.map(async page => { const slug = slugFor(page); try { const manifest = JSON.parse(await readFile(join(root, 'output', slug, 'manifest.json'), 'utf8')); let review = null; try { review = JSON.parse(await readFile(join(root, 'reviews', `${slug}.json`), 'utf8')); } catch {} return { slug, page, script: manifest.script, status: review?.decision || manifest.status, review }; } catch { return { slug, page, status: 'needs-human' }; } }));
}
export async function decideReview(root, slug, decision, note = '') { await mkdir(join(root, 'reviews'), { recursive: true }); const record = { slug, decision, note, reviewer: 'local-reviewer', decidedAt: new Date().toISOString() }; await writeFile(join(root, 'reviews', `${slug}.json`), JSON.stringify(record, null, 2)); return record; }
