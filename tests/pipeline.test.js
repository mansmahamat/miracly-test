import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validatePage, validateScript } from '../src/lib/validation.js';
import { mockScript } from '../src/lib/script.js';
import { endCardDisclosure } from '../src/scenes/library.js';
import { publishApproved } from '../src/lib/publish.js';
import { composition } from '../src/scenes/composition.js';
import { renderPage } from '../src/lib/render.js';

const page = JSON.parse(await readFile(new URL('../data/confetti-kol-marketing-agency-services-singapore.json', import.meta.url), 'utf8'));
const brand = JSON.parse(await readFile(new URL('../brands/confetti.json', import.meta.url), 'utf8'));

test('valid page data passes the field-limit gate', async () => {
  assert.deepEqual(await validatePage(page), []);
});

test('the intentionally broken mock script is rejected', async () => {
  const errors = await validateScript(page, mockScript(page, { intentionallyInvalid: true }));
  assert.ok(errors.some(error => error.includes('banned phrase: guaranteed')));
});

test('a failed script check retries once before creating a draft', async () => {
  const result = await renderPage(page, process.cwd(), { slug: 'test-retry-script', intentionallyInvalid: true });
  assert.equal(result.status, 'draft');
  assert.equal(result.attempts, 2);
});

test('a script that still fails after one retry is marked needs-human', async () => {
  const result = await renderPage(page, process.cwd(), { slug: 'test-permanent-script', intentionallyInvalid: true, permanentlyInvalid: true });
  assert.equal(result.status, 'needs-human');
  assert.equal(result.attempts, 2);
  assert.ok(result.errors.some(error => error.includes('banned phrase')));
});

test('end-card disclosure is assembled solely from profile data', () => {
  assert.equal(endCardDisclosure(brand), 'Confetti · confettisg.com · The voice in this video is AI-generated.');
});

test('a job cannot publish before human approval', async () => {
  await assert.rejects(() => publishApproved({ root: process.cwd(), job: { status: 'review', page } }), /Only approved jobs/);
});

test('both formats use the required safe-area padding', () => {
  const script = mockScript(page);
  for (const [format, padding] of [['16x9', '96px'], ['9x16', '120px 72px 288px']]) {
    const html = composition({ page, profile: brand, script, format, wordTimings: [] });
    assert.ok(html.includes(`padding:${padding}`));
  }
});

test('the rendered template includes every scripted scene and its protected disclosure', () => {
  const script = mockScript(page);
  const html = composition({ page, profile: brand, script, format: '16x9', wordTimings: [] });
  for (const scene of script.scenes) assert.ok(html.includes(`scene--${scene.type}`));
  assert.ok(html.includes('The voice in this video is AI-generated.'));
});

test('spoken checklist items use Whisper word timestamps for their reveal', () => {
  const script = mockScript(page);
  const timings = script.captions.split(/\s+/).map((word, index) => ({ word, start: index * .4, end: index * .4 + .3 }));
  const html = composition({ page, profile: brand, script, format: '16x9', wordTimings: timings });
  assert.ok(html.includes('class="timed-item check-row"'));
  assert.ok(html.includes('data-item-start="'));
});
