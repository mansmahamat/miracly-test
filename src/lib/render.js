import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';
import { mockScript } from './script.js';
import { whisperVtt } from './audio.js';
import { validatePage, validateScript } from './validation.js';
import { composition } from '../scenes/composition.js';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const vtt = text => `WEBVTT\n\n00:00.000 --> 00:25.000\n${text}\n`;
export async function renderPage(page, root, opts = {}) {
  const pageErrors = await validatePage(page); if (pageErrors.length) return { status: 'needs-human', errors: pageErrors };
  let script, scriptErrors = [], attempts = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    attempts = attempt;
    script = mockScript(page, { ...opts, attempt });
    scriptErrors = await validateScript(page, script);
    if (!scriptErrors.length) break;
  }
  if (scriptErrors.length) return { status: 'needs-human', script, errors: scriptErrors, attempts };
  const slug = opts.slug || `${page.customer}-${page.page.service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const dataHash = hash(page); const dir = join(root, 'output', slug); await mkdir(dir, { recursive: true });
  const profile = JSON.parse(await readFile(join(root, 'brands', `${page.customer}.json`), 'utf8'));
  await writeFile(join(root, 'scripts', `${slug}.json`), JSON.stringify(script, null, 2));
  let wordTimings = []; try { wordTimings = JSON.parse(await readFile(join(dir, 'audio', 'transcript.json'), 'utf8')); } catch { /* no Whisper output yet; initial draft uses a marked provisional VTT */ }
  if (wordTimings.length < script.captions.trim().split(/\s+/).length) wordTimings = [];
  const captions = wordTimings.length ? whisperVtt(script.captions, wordTimings) : vtt(script.captions);
  const logoFile = profile.logo.type === 'image' ? basename(profile.logo.path) : null;
  if (logoFile) profile.logo.renderFile = logoFile;
  for (const format of ['16x9', '9x16']) { const formatDir = join(dir, format); await mkdir(formatDir, { recursive: true }); await writeFile(join(dir, `${format}.vtt`), captions); await writeFile(join(formatDir, 'index.html'), composition({ page, profile, script, format, wordTimings })); await copyFile(join(root, 'node_modules', 'gsap', 'dist', 'gsap.min.js'), join(formatDir, 'gsap.min.js')); if (logoFile) await copyFile(join(root, profile.logo.path), join(formatDir, logoFile)); }
  const manifest = { slug, status: 'draft', sourceUrl: page.page.url, lastChecked: page.lastChecked, dataHash, script, formats: ['16x9', '9x16'], attempts, renderedAt: new Date().toISOString() };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2)); return manifest;
}
export async function dataChanged(page, root, slug) { try { const old = JSON.parse(await readFile(join(root, 'output', slug, 'manifest.json'))); return old.dataHash !== hash(page); } catch { return true; } }
