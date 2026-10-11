# PR #6 evidence

See [the consolidated report](../../../CINEMA_V3_RELEASE_HARDENING.md) for causes,
acceptance, uncertainty and the release checklist. Original PR #5 files are
unchanged. `frozen-variants.json` identifies the exact standalone runtimes.

- `benchmark-summary.json`: all original 24 inputs plus four repeated trials,
  three builds, two complete counterbalanced rounds; paired deltas and profiles.
- `generalized-summary.json`: eight additional inputs, separate from performance
  acceptance. The manual case asserts actual locked cuts/camera and typography.
- `*-results.json.gz`: unmodified full raw rows, not a replacement dataset.
- `root-cause.json`, compressed experiments and `frames/manifest.json`: observed
  causes, rejected experiments, and SHA-verified decoded/reference/mask/background
  pixel evidence. Canvas estimates never certify a final MP4.
- `tests.json`, `browser-export.json`, `browser-report.json`,
  `cancellation-retry.json`: actual local engine and shipping browser checks.
- `blind-manifest.json`, `blind-ratings.csv`, `human-evaluation.json`: anonymous
  pair metadata and empty responses. The private answer key is deliberately
  excluded. The participant ZIP includes 48 actual videos and review HTML.

Reproduction requires Node 24, locked npm dependencies, Canvas, Chromium,
FFmpeg/ffprobe and three separately served frozen standalone builds. Keep normal
TLS verification. Run heavy suites sequentially, preserving the original input,
seed, output profile, audio and observer thresholds.

```sh
npm ci
npm run test
npm run build
KAMEN_MATRIX_PR5_URL=http://127.0.0.1:4200/ KAMEN_MATRIX_FRAME_EVIDENCE=1 \
  node dev/cinema_v3_hardening_benchmark.cjs http://127.0.0.1:4206/ \
  http://127.0.0.1:4200/baseline.html /tmp/kamen-round-0
KAMEN_MATRIX_PR5_URL=http://127.0.0.1:4200/ KAMEN_MATRIX_FRAME_EVIDENCE=1 \
  KAMEN_MATRIX_ROUND=1 node dev/cinema_v3_hardening_benchmark.cjs \
  http://127.0.0.1:4206/ http://127.0.0.1:4200/baseline.html /tmp/kamen-round-1
node dev/cinema_v3_compare_hardening.cjs /tmp/kamen-summary.json \
  /tmp/kamen-round-0 /tmp/kamen-round-1
KAMEN_MATRIX_EXTRA=1 KAMEN_MATRIX_EXTRA_ONLY=1 \
  node dev/cinema_v3_hardening_benchmark.cjs http://127.0.0.1:4206/ \
  http://127.0.0.1:4200/baseline.html /tmp/kamen-generalized
npm run test:cinema-export -- http://127.0.0.1:4206/ /tmp/kamen-browser
```

The separately supplied evidence ZIP retains actual MP4s, frame artifacts, raw
rows and frozen builds; binaries are not committed to Git. Anonymous participant
media and the private correspondence key are separate downloads. Archive names
and hashes are listed in the final delivery manifest. No actual human preference
ratings exist yet.
