# Miracly Video Kit

A local, keyless landing-page-to-video pipeline for the Miracly take-home. It turns each valid JSON page in `data/` into a 25-second branded video in 16:9 and 9:16, with Kokoro voiceover, an original procedural music bed, Whisper word-timed captions, and a human review gate.

## What is included

- Brand profiles for Confetti and Tonar in `brands/`
- A shared GSAP / HyperFrames scene composition, styled solely from the profile
- Deterministic mock scripts and validation for source facts, limits and banned phrases
- Local Kokoro TTS, FFmpeg loudness normalisation and ducked music
- Whisper timestamps used to time captions and on-screen content
- Batch rendering that continues past invalid pages and reports the reasons
- Review UI at `http://localhost:3000`, with side-by-side 16:9 and 9:16 review
- Approval-only local publishing with embed HTML, VideoObject JSON-LD and sitemap

## Setup

Requirements: Node 22+, Google Chrome, FFmpeg and Python 3.12 for local Whisper/Kokoro.

```sh
npm install
npx hyperframes@0.8.139 doctor
```

The render path uses `--mock-llm` and local voice tooling, so no API keys are required.

## Run locally

```sh
npm run batch       # renders every valid page in both formats, with voice and captions
npm run posters     # creates end-card poster.jpg files for both formats
npm run dev         # opens the review/API at http://localhost:3000
npm run worker      # optional separate terminal for queued API jobs
```

To submit a job through the API:

```sh
curl -X POST http://localhost:3000/jobs \
  -H 'content-type: application/json' \
  --data-binary @data/confetti-kol-marketing-agency-services-singapore.json
```

Use `GET /jobs/:id` to inspect its status. The worker records a draft or a `needs-human` result. Jobs must be approved before `POST /jobs/:id/publish` can create public artifacts.

## Quality checks

```sh
npm test                # validation, approval gate, disclosure and safe-area unit checks
npm run check:templates # HyperFrames runtime, layout, motion and WCAG checks for all outputs
npm run verify          # both commands, suitable for CI
```

The visual checker also samples transitions and treats frame-bound breaches as errors. Its PNG snapshots are saved below each output folder during a run.

## Output and publishing

Each passing page produces:

```text
output/<slug>/16x9/video-with-voice.mp4
output/<slug>/16x9/poster.jpg
output/<slug>/16x9.vtt
output/<slug>/9x16/video-with-voice.mp4
output/<slug>/9x16/poster.jpg
output/<slug>/9x16.vtt
```

`output/batch-report.json` records all pages, including rejected source data and its reason. An approved page is published to `public/<slug>/` with `embed.html`, `poster.jpg`, `video.jsonld`, captions and a shared `public/video-sitemap.xml`.

## Deployment

`Dockerfile` and `compose.yml` provide the web and worker processes from the same image. The image includes Chromium, FFmpeg, Kokoro and faster-whisper. With Docker Desktop installed, start both services with:

```sh
docker compose up --build
```

The named volumes keep the local file-backed job queue, review records, output and published artifacts shared between web and worker. For Railway, deploy the same repository as two services: `npm run dev` for web and `npm run worker` for the worker. Persist `jobs/`, `output/` and `public/` with a volume or replace the local-file adapters with managed storage before production.

This take-home remains intentionally file-backed so it runs locally without accounts or secrets. Architecture and trade-offs are in [ARCHITECTURE.md](ARCHITECTURE.md) and [DECISIONS.md](DECISIONS.md).

