# Decisions

This take-home intentionally uses local files for its queue, artifact store and approval record. That keeps the required mock-LLM and local-voice route runnable with no API keys. A deployed version would replace `jobs/`, `output/` and `public/` with Postgres plus object storage.

Brand profiles are editable JSON. The current text logos are explicit safe fallbacks and should be replaced with verified vector assets after a production brand review. The profiles also record font source and any later contrast correction.

Kokoro supplies local speech. FFmpeg generates the original procedural ambient bed, ducks it under voice, and normalises the final mix. Whisper timings drive the visible caption words while the scripted spelling remains unchanged.

The composition has a shared frame, six-plus scene types, deterministic GSAP timing and no network calls while rendering. HyperFrames visual checks pass runtime, frame-bound, layout and motion validation for all generated formats. It warns that the scene elements are not split into sub-composition files; this is a deliberate small-project simplification, not a runtime failure. Splitting them is the first renderer refactor I would make for a larger scene library.

Three supplied data files exceed the specified source-field limits. They are reported as `needs-human` rather than silently shortened. Docker assets remain in the repository for the requested deployment shape; the intended submission deployment is Railway.
