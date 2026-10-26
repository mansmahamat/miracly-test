# Architecture

## Goal

This is a deliberately small, file-backed video kit. It turns one landing-page JSON file into two branded, reviewable MP4s without API keys. The same code runs locally, in Docker, or as separate web and worker services on Railway.

```text
data/<page>.json
      │
      ▼
validate page → create/check script → compose HTML + GSAP
      │                                   │
      │                                   ▼
      │                         HyperFrames → video.mp4
      │                                   │
      ▼                                   ▼
Kokoro TTS → Whisper word timings → FFmpeg voice/music mix
                                          │
                                          ▼
                               output/<slug>/{16x9,9x16}/
                                          │
                                          ▼
                                  reviewer decision → public/<slug>/
```

## Main folders

| Folder | Responsibility |
| --- | --- |
| `data/` | Source page JSON supplied to the pipeline. |
| `brands/` | Editable profile per customer: verified logo, colours, font and radius. |
| `assets/logos/` | Local customer logo assets copied beside each generated composition. |
| `scripts/` | Deterministic script artifacts, useful for review and debugging. |
| `output/` | Draft videos, captions, audio, manifests, posters and batch report. |
| `reviews/` | Human review decisions and notes. |
| `public/` | Only approved stable embeds, JSON-LD and sitemap output. |

## Code map

| File | Responsibility |
| --- | --- |
| `src/lib/validation.js` | Schema, field-limit, banned-phrase and script-rule checks. |
| `src/lib/script.js` | Local mock script writer; chooses non-repeating scene types from page data. |
| `src/lib/render.js` | Page → HTML/VTT/manifest adapter and content-hash comparison. |
| `src/lib/audio.js` | Local Kokoro voice, Whisper-compatible caption VTT, original music bed and FFmpeg mix. |
| `src/scenes/library.js` | Scene contracts, safe areas and immutable disclosure. |
| `src/scenes/composition.js` | The shared brand-driven HTML/GSAP composition and word-timed item reveal logic. |
| `src/batch.js` | Sequential, failure-tolerant batch pipeline for all input pages. |
| `src/server.js` | Review UI, API and approval/publish boundary. |
| `src/worker.js` | Claims queued API jobs and performs the full render pipeline. |
| `src/lib/publish.js` | Stable approved artifact, embed, JSON-LD and sitemap generation. |

## Service boundary

The web service is intentionally fast: it receives jobs, returns their status, and serves the review UI. The worker is the only process that performs voice generation, Whisper transcription, HyperFrames rendering and FFmpeg muxing.

For this take-home, `jobs/*.json` is the queue and named Docker volumes provide shared storage. In production, replace these adapters with a transactional queue plus object storage while keeping the same web/worker boundary.

## Determinism and safety

- The composition uses no clock, randomness or network call at render time.
- A changed data hash is the only reason a page must re-render.
- Brand profile values are the only source for visual brand styling.
- Human approval is recorded before public publishing is allowed.
- The end-card disclosure is built from brand data, never editable page data.

## Useful commands

```sh
npm test                # fast unit and safety checks
npm run check:templates # visual/runtime checks across generated templates
npm run batch           # all valid page inputs, both formats
npm run posters         # end-card poster files
npm run dev             # web/review service
npm run worker          # queue/render worker
```
