# KAMEN 2.1.0 — original JIZURA generation and MP4 modernization

## Implementation

The reference is JIZURA 0.10.1 at `fc16bfe43ea4a6c25a21f1caf04d17326de14f00`. `vendor/jizura/upstream.json` lists SHA-256 checksums of all copied sources. Build fails on source drift. Upstream code runs in its own lexical namespace. The build changes only namespace initialization and adds one background-image drawing hook; the original files remain byte-identical. KAMEN's final adapter owns engine selection, legacy compatibility and shared technical export verification.

New generation calls the upstream omakase, planner and renderer, including the 153 expression-set parts, three associated palettes, themes, mixed LRC timing and word handling. UI includes per-cut time/technique settings, line and parameter/group locks, tap playback speed/countdown/cut synchronization, decorative-number/time toggles and deferred creation of closed technique groups and line-layout choices. KAMEN's image/audio/lyrics inputs, portable project files, downloads and supported sharing remain available.

Saved `generation` metadata selects the engine. Unmarked projects retain KAMEN; new projects select JIZURA. Original legacy catalogs are retained while planning old projects, so adding upstream parts does not expand their random pools. Explicit regeneration converts an old project, remaps pre-0.10 lyric indices, and clears optimizer state. The standard export path does not invoke legacy candidate search, automatic creative repair or artistic certification. Its technical checks remain mandatory; artistic quality is unscored/advisory.

The shared encoder now writes H.264/AAC through Mediabunny `StreamTarget` into 1 MiB positioned pages. Each track has its own backpressure queue. The audio WASM bridge awaits packet writes too. Finalization patches pages; BlobSource inspection avoids a whole-video ArrayBuffer. This removes the earlier contiguous video allocation and buffer-target finalization copy. Blob construction may still copy the pages, and output pages and source PCM consume memory proportional to size. Large-file direct-to-disk streaming is not provided in this version: validation finishes before offering a file.

A single retry coordinator tries supported automatic video configurations before software configurations, retries AAC failures using the audio fallback with the same video configuration, and retains the selected plan/settings. Cancellation and malformed output are terminal. Time spent in a hidden tab does not consume the encoder stall budget. Failed attempts and the original error are available as a local diagnostic download. MP4 success is distinct from saving to disk.

## Dependencies and CI

Mediabunny and its AAC extension: 1.62.1; esbuild: 0.28.2; playwright-core: 1.64.1; acorn: 8.19.0. Canvas QA uses the latest compatible 0.1 release, **0.1.100**, rather than 1.0.13: the 1.0 major changed raster results enough to make the existing real-render story test fail. The same test passes on 0.1.100 and the old 0.1.80. This compatibility limit affects Node QA tools, not browser rendering. Dependency versions and integrity hashes are locked.

The deprecated mp4-muxer binary is retained only as an historical asset and is not embedded in production. AAC/media bundles and license notices are regenerated. GitHub Actions remain pinned to verified current release commits; the new MP4 job uploads its evidence for seven days and includes a 180-second encode. Pull requests do not deploy Pages.

## Verification

Run:

```bash
npm ci
npm run build:media
npm run build
node dev/mp4_block_store_test.mjs
node dev/upstream_export_regression_test.js
node dev/kamen_encoder_liveness_test.cjs
npm run preview
# separate terminal
KAMEN_CHROME=/path/to/chrome KAMEN_LONG_EXPORT=1 npm run test:upstream -- http://127.0.0.1:4173/ /tmp/kamen-upstream-qa
```

The browser suite checks the shipping bundle, checksum provenance, fixed-seed/theme parity with the upstream planner, mixed LRC rows, locks, save compatibility, real input imports and generation, cancellation, video initialization failure/retry, invalid MP4 rejection, and actual MP4 downloads. Its matrix includes 720p silent output, 1080p audio, vertical video, a partial-range WASM AAC encode and a 180-second audio encode. FFprobe inspects codecs, dimensions, timing and tracks; FFmpeg decodes every completed file. Runtime certification decodes first/middle/last video samples and AAC endpoints; it does not claim full-frame artistic or singing-sync certification.

[Recorded browser evidence](qa/upstream-0.10.1.json): 17 checks pass, including 21 seed/theme comparisons, eight real downloaded MP4s, 180-second audio, whole-file FFmpeg decoding, save/reopen/audio reload, cancellation, video/AAC failure recovery and corrupt-output rejection. Native AAC failure is a synthetic capability/configuration fault; AAC fallback output is real. No Windows/macOS/native-dialog success or mobile compatibility is claimed.

The full historical engine suite was also run: **196/212 pass, 14 fail, 2 skip**. Two failing test adapters (ES module extraction and the changed stale-progress-outcome policy) were corrected and pass on targeted reruns. The other **12 failures reproduce in the original `8b2dd69` checkout with its original lockfile**. They concern legacy camera/scene expectations, font/storage mocks, old candidate counts and missing fixture fields. The historical suite remains red; this is not an all-tests-pass claim. [Failure inventory](qa/upstream-legacy-regressions.json) records the exact names. No aesthetic thresholds were weakened to pass the update.

Current targeted checks pass: streaming page writes, H.264 negotiation/retry order, encoder lifecycle/hidden-page timeouts, sequential observer decoding, save pipeline, one-click export behavior, processing outcome lifecycle, immutable source hashes, syntax of every source/build script, and real Chrome legacy persistence/reload/cross-tab protection. Historical documents elsewhere under `docs/qa` are not evidence for this release.

## Compatibility and limits

Linux Chrome is the automated browser environment. Windows/macOS Chrome/Edge, OS-native dialog interaction, mobile Safari/Android and the MediaRecorder fallback need separate platform checks; unsupported codecs are reported instead of emitting a mislabeled file. The supported native-picker cancellation is tested; normal automated downloads test the no-picker browser capability.

Old KAMEN renderers and archival AE/CEP tools remain in the repository. AE/CEP products and multilingual sites were not rebuilt. Revert this change through a normal PR to roll back; no database version or destructive storage migration was added. Preserve project backups before opting an old MV into regeneration.
