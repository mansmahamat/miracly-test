// Renderer-independent scene contracts. The HyperFrames adapter consumes these
// objects and is the only place allowed to turn them into DOM/GSAP timelines.
export const sceneTypes = {
  'kinetic-headline': { required: ['label', 'line', 'accentWord'], motion: 'word-stagger' },
  checklist: { required: ['label', 'line', 'items'], motion: 'row-reveal' },
  'numbered-steps': { required: ['label', 'line', 'items'], motion: 'step-snap' },
  'phone-mockup': { required: ['label', 'line'], motion: 'device-slide' },
  ticker: { required: ['label', 'line', 'items'], motion: 'marquee' },
  'big-statement': { required: ['label', 'line'], motion: 'scale-in' },
  'end-card': { required: ['label', 'line', 'cta'], motion: 'button-settle' }
};

export function safeArea(format) {
  return format === '9x16'
    ? { top: 120, right: 72, bottom: 288, left: 72, width: 1080, height: 1920 }
    : { top: 96, right: 96, bottom: 96, left: 96, width: 1920, height: 1080 };
}

export function endCardDisclosure(profile) {
  return `${profile.name} · ${profile.domain} · The voice in this video is AI-generated.`;
}
