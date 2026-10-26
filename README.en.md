# KAMEN

**v2.4.0** is a browser application for Japanese lyric videos made from one background image, audio and LRC/TXT. Generation and lyric rendering use pinned [JIZURA v0.10.1](https://github.com/852wa/JIZURA/tree/fc16bfe43ea4a6c25a21f1caf04d17326de14f00). Themes, typography/kinetic/horror sets, timing edits, title/artist credits, MP4 and PNG exports are supported.

[Public application](https://jankendo.github.io/JIZURA_KAMEN/). Production updates are published by GitHub Actions after validation of main.

Choose image, audio and lyrics; generate; inspect and adjust the preview; then export. The application validates output tracks, duration, frame count and decoded samples before offering an MP4 download. Creative scores do not block saving. Metadata placement is estimated: inspect full-screen lyrics for overlaps.

The modern browser engine is now the only supported engine. Legacy projects import source image, lyrics, line timing, metadata and available fonts/audio into a **new work** and require explicit regeneration. Original stored records and JSON inputs are preserved. Legacy rendering, optimizers, After Effects/CEP integration and their tools/tests are removed. Current work restoration, undo/redo and concurrent-tab conflict forks remain supported.

Use Node.js 24, npm, FFmpeg/FFprobe and Chrome/Chromium:

```bash
npm ci
npm run dev
# Production and validation
npm run build:media
npm run build
npm test
KAMEN_CHROME=/usr/bin/chromium npm run test:e2e
```

Development uses port 5173. `npm run preview` serves `dist/` on port 4173. E2E starts its own server and writes evidence to `/tmp/kamen-browser-qa` (`KAMEN_QA_OUT` overrides it). Set `KAMEN_LONG_EXPORT=1` for the 180-second export. Required missing tools fail validation.

Edit `app/` and `src/`; the source manifest validates module inclusion/order. Build generates root and distribution HTML with embedded code, fonts and codecs. GitHub Actions validates PRs and main pushes; deployment occurs only after successful validation on a main push. Revert through a normal PR for rollback.

Processing is local; additional fonts may be requested from Google Fonts. Browser storage is origin/profile specific and is not a durable backup. Portable JSON includes image, lyrics, settings and available custom fonts, **not audio bytes**: retain the original audio separately. HTTPS or localhost and Chrome/Edge are recommended. Long/high-resolution exports require memory proportional to output size.

See [storage](docs/STORAGE.md), [validation](docs/VALIDATION.md), [UX audit](docs/UX_AUDIT_2_4_0.md) and [historical records](docs/HISTORY.md). Physical mobile devices, Edge and Windows/macOS native save dialogs require separate manual verification.

MIT application license; OFL fonts; MPL-2.0 Mediabunny/AAC; LGPL FFmpeg. Preserve [third-party notices](THIRD_PARTY_NOTICES.md), including the unresolved upstream FFmpeg source correspondence note. Users must hold rights to their media.
