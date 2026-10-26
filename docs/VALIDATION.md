# KAMEN 2.4 validation

Use Node.js 24, FFmpeg/FFprobe and Chrome/Chromium. Install locked dependencies with `npm ci`; missing required dependencies fail checks.

```bash
npm test
npm run build:media
npm run build
KAMEN_CHROME=/usr/bin/chromium KAMEN_QA_OUT=/tmp/kamen-browser-qa npm run test:e2e
```

`npm test` runs five current-browser contract groups: audio identity, H.264 attempts/track completeness, encoder lifecycle/timeouts/cancellation, positioned MP4 writes/incremental hashing, and legacy source conversion/current project compatibility. No historical engine tests are used to certify the release.

`test:e2e` starts an isolated server on port 4187 (`KAMEN_QA_PORT` overrides it) and runs:

- UX: 375/768/1024/1100/1440px, normal/detail/processing/error states, control sizes, help focus/Escape, quantized lyric onset, stale sharing after metadata edits, genuine legacy format-3 conversion, regeneration gating and invalid import recovery.
- MV readability: every cut of a long Japanese lyric with punctuation, all three standard aspects, white/black photographic backgrounds, glyph bounds and contrasting separation pixels.
- Storage: two tabs, atomic forks and media isolation, fonts, quota/retry, generation cancellation/stale inputs, work switching, localStorage/format-2 migration, unavailable IndexedDB.
- Credits/layout: timing phases, Unicode, native metadata compatibility/morphs, light/dark contrast, undo/redo/reload, real H.264/AAC partial output, encoder retries and decoded PNG/transparent ZIP.
- Native generation/output: pinned source checksums, seed/theme/timing/locks parity, real file imports/downloads, settings matrix, actual video/audio fallback, cancellation and terminal corrupt-output rejection.

Set `KAMEN_LONG_EXPORT=1` to include a 180-second H.264/AAC movie; CI enables it. FFprobe checks streams/settings and FFmpeg decodes entire test movies. Browser tests disable native file-save pickers to exercise the download path. Synthetic test assets only; media/screenshots stay outside the repository. JSON evidence and screenshots identify the tested build hash; do not treat historical reports as fresh results.

Acceptance: all current checks pass, no browser page errors, no horizontal overflow/control overlap at the tested sizes, old records remain byte-equivalent, source-import output remains disabled until generation, and the real outputs decode. Creativity is inspected visually and does not use a score-based save gate. Automatic credit placement estimates sampled lyric bounds; it cannot guarantee zero overlap for every artistic layout.

Windows/macOS native dialogs, Edge, physical mobile devices and the complete creative registry across every possible lyric/seed are not certified by Linux Chromium tests. Validate those manually before claiming support beyond the documented baseline.

PR/main/manual runs use the same current validation workflow. Only a successful main push publishes Pages; this local audit does not deploy. Roll back through a revert PR using the same checks.
