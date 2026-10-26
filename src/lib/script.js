const pick = (items, n) => (items || []).slice(0, n);
const line = value => String(value || '').length <= 42 ? String(value || '') : `${String(value || '').slice(0, 39).trimEnd()}…`;
export function mockScript(page, { intentionallyInvalid = false, permanentlyInvalid = false, attempt = 1 } = {}) {
  const benefits = pick(page.benefits, 3); const steps = pick(page.steps, 3);
  const middle = steps.length
    ? { type: 'numbered-steps', label: 'How it works', line: 'A clear path from brief to outcome', items: steps.slice(0, 2) }
    : { type: 'phone-mockup', label: 'Built for your team', line: line(page.summary) };
  const proofItems = page.clients?.length ? pick(page.clients, 4) : pick(page.facts, 3);
  const proof = { type: 'ticker', label: 'Built with experience', line: page.clients?.length ? 'Names you may know' : 'Signals worth tracking', items: proofItems };
  const scenes = [
    { type: 'kinetic-headline', label: page.page.service, line: line(page.headline), accentWord: page.headline.split(/\s+/).at(-1) },
    { type: 'big-statement', label: page.page.area, line: line(page.summary) },
    { type: 'checklist', label: 'Built around outcomes', line: line(benefits[0] || page.summary), items: benefits.slice(0, 2) },
    middle,
    proof,
    { type: 'end-card', label: 'Ready when you are', line: page.cta.label, cta: page.cta.label }
  ];
  const voiceover = `${page.headline}. ${page.summary} ${benefits.slice(0, 2).join('. ')}. ${steps.slice(0, 2).join('. ')}. ${page.cta.label}.`;
  const script = { version: 1, sceneLibrary: ['kinetic-headline', 'checklist', 'numbered-steps', 'phone-mockup', 'ticker', 'big-statement', 'end-card'], scenes, voiceover, captions: voiceover, claims: [] };
  if (intentionallyInvalid && (attempt === 1 || permanentlyInvalid)) script.voiceover += ' Guaranteed overnight results.';
  return script;
}
