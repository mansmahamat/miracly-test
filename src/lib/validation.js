import { readFile } from 'node:fs/promises';
export async function validatePage(page) {
  const errors = [];
  if (!page || typeof page !== 'object') return ['schema / must be an object'];
  for (const key of ['customer', 'market', 'brand', 'page', 'headline', 'summary', 'facts', 'benefits', 'cta', 'lastChecked']) if (page[key] === undefined) errors.push(`schema / missing required ${key}`);
  if (!['confetti', 'tonar'].includes(page.customer)) errors.push('schema /customer must be confetti or tonar');
  if (typeof page.headline !== 'string' || page.headline.length > 60) errors.push('headline must be at most 60 characters');
  if (!page.brand?.name || !page.brand?.website) errors.push('schema /brand requires name and website');
  if (!page.page?.service || !page.page?.area || !page.page?.url) errors.push('schema /page requires service, area and url');
  if (!Array.isArray(page.facts) || !page.facts.length) errors.push('schema /facts needs at least one item');
  if (!Array.isArray(page.benefits) || page.benefits.length < 2 || page.benefits.length > 5) errors.push('schema /benefits needs 2–5 items');
  if (typeof page.cta?.label !== 'string' || page.cta.label.length > 32 || !page.cta?.url) errors.push('schema /cta requires a label of 32 chars or fewer and URL');
  for (const [key, values] of Object.entries({ benefits: page.benefits, steps: page.steps || [], clients: page.clients || [] })) for (const value of values || []) if (value.length > 48) errors.push(`${key} item exceeds 48 characters: “${value}”`);
  return errors;
}
export async function validateScript(page, script) {
  const banned = (await readFile(new URL('../../banned-phrases.txt', import.meta.url), 'utf8')).split('\n').filter(Boolean);
  const errors = [];
  if ((script.voiceover || '').trim().split(/\s+/).filter(Boolean).length > 75) errors.push('voiceover exceeds 75 words');
  for (const scene of script.scenes || []) { if ((scene.line || '').length > 42) errors.push(`scene line exceeds 42: ${scene.line}`); if ((scene.label || '').length > 32) errors.push(`scene label exceeds 32: ${scene.label}`); }
  const text = JSON.stringify(script).toLowerCase();
  for (const phrase of banned) if (text.includes(phrase.toLowerCase())) errors.push(`banned phrase: ${phrase}`);
  const source = JSON.stringify(page).toLowerCase();
  for (const token of (script.claims || [])) if (!source.includes(token.toLowerCase())) errors.push(`unsupported claim: ${token}`);
  if (!script.scenes?.length || script.scenes.length < 4 || script.scenes.length > 6) errors.push('script needs 4–6 scenes');
  for (let i = 1; i < (script.scenes || []).length; i++) if (script.scenes[i].type === script.scenes[i - 1].type) errors.push('adjacent scenes repeat a type');
  return errors;
}
