export const pageSchema = {
  type: 'object', required: ['customer', 'market', 'brand', 'page', 'headline', 'summary', 'facts', 'benefits', 'cta', 'lastChecked'],
  properties: {
    customer: { enum: ['confetti', 'tonar'] }, market: { type: 'string', minLength: 2 },
    brand: { type: 'object', required: ['name', 'website'], properties: { name: { type: 'string' }, website: { type: 'string' } } },
    page: { type: 'object', required: ['service', 'area', 'url'], properties: { service: { type: 'string' }, area: { type: 'string' }, url: { type: 'string' } } },
    headline: { type: 'string', maxLength: 60 }, summary: { type: 'string', minLength: 1 }, facts: { type: 'array', minItems: 1, items: { type: 'string' } },
    benefits: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string', maxLength: 48 } }, steps: { type: 'array', items: { type: 'string', maxLength: 48 } },
    clients: { type: 'array', items: { type: 'string', maxLength: 48 } }, cta: { type: 'object', required: ['label', 'url'], properties: { label: { type: 'string', maxLength: 32 }, url: { type: 'string' } } },
    lastChecked: { type: 'string' }
  }
};
