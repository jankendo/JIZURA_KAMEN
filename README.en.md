# KAMEN 2.1.0

KAMEN makes lyric videos from a background image, audio and LRC/TXT lyrics in the browser. New videos use the original [JIZURA 0.10.1](https://github.com/852wa/JIZURA/tree/fc16bfe43ea4a6c25a21f1caf04d17326de14f00) generator and renderer, with typographic, kinetic and horror expression sets and themes. KAMEN's Japanese input workflow is retained.

Existing project files retain the legacy KAMEN engine. Only an explicit regeneration switches their generator. MP4 export uses Mediabunny, positioned writes in memory blocks, H.264/AAC, software retries and cancellation. Standard exports retain the selected cuts; creative scores do not block saving. Completed video/audio tracks, output settings and decoded samples are checked before offering a download.

## Development

Use Node.js 24, npm, FFmpeg/FFprobe and Google Chrome for browser verification.

```bash
npm ci
npm run build:media
npm run build
npm run preview
```

In another terminal:

```bash
npm test
KAMEN_CHROME=/path/to/chrome KAMEN_LONG_EXPORT=1 npm run test:upstream -- http://127.0.0.1:4173/ /tmp/kamen-upstream-qa
```

See the [Japanese guide](README.md), [upgrade and validation notes](docs/UPSTREAM_0_10_1.md), [storage documentation](docs/STORAGE.md), and [third-party notices](THIRD_PARTY_NOTICES.md). Browser tests run on Linux Chrome; OS-native dialogs, Windows/macOS Edge and mobile browsers require separate platform testing. Materials are processed locally; no new backend is introduced.
