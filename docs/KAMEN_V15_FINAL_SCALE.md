# v15 final 640px recovery hotfix

Historical first hotfix validation. The subsequent ENTRY contrast/exhaustion fix
and current 24-state per-line recovery are documented in [KAMEN_V15_ENTRY_RECOVERY.md](KAMEN_V15_ENTRY_RECOVERY.md).

`searchJizuraDirectionV8` explicitly dispatches v15 to
`confirmRandomDirectionScaleV15`; v11–v14 keep `confirmDirectionScaleV11`.
Missing v15 confirmation is an error. The existing v11.2 wrapper already has a
recovery hook; the original v11 implementation has the immediate singleton
exhaustion path. The dedicated v15 gate avoids depending on that legacy dispatch.

The new gate measures the complete installed sequence at 640px, supplies actual
failed phase checks to `sample.recoverLine`, and replaces only failed lines.
The v15 `recoverDirectionLineV112` implementation tries existing color, scrim,
position, size and timing repairs before bounded causal role alternatives.
A neutral role is accepted only after two alternatives fail and its actual
removal control passes. There is one expansion of at most 12 candidates per
failed line. No whole-song reselection or safety threshold changes are introduced.
Final sequence checks, rejected states, recovery counts and original/final
creative genomes are retained; diagnostic evidence excludes pixel/audio data.

## Validation

- A — Chromium production Canvas, synthetic scale-dependent FX wash: 256px PASS,
  640px FAIL (composited contrast P10 1.225, threshold 3). Recovery reached the
  existing hook, tried 8 states within budget 12, repaired the causal FX locally,
  preserved the other two lines and passed the final three-line composed gate.
  Empty recovery and renderer-error paths reject explicitly. Production dispatch
  checks cover v11–v15 and final-scale cancellation.
- B — supplied `KAMEN_ASSET_PACK.zip`, decoded audio 37.276735 seconds, actual
  background and 15 LRC lines, 16:9, seed 15072: all 15 final 640px lines PASS;
  compact save and exact render-decision restore PASS. Third line
  `ララーラーラー`: nine phases, complete HOLD glyphs, safe bounds and minimum
  HOLD composited contrast P10 6.900. This generated sequence needed no final
  recovery; the forced failure in A separately verifies recovery. The ZIP has
  no complete saved project/seed and CURRENT_STORYBOARD is empty, so this is
  **not** an exact replay of the user's original 28-cut project.
- C — existing v15 checks cover seeded replay, preserveCurrent, locks, both
  aspect ratios, LRC, save/restore and visible random roles. Local production
  build, syntax checks, Chrome startup/UI/rollback/quota-save protection and
  IndexedDB persistence smoke PASS. Required FAST CI also runs the updated
  final-scale regression in the existing v15 check group before deployment.

Focused rerun: `KAMEN_V12_COMPARE=v15 KAMEN_V15_SCALE_ONLY=1 node dev/kamen_song_native_v11_fast_test.cjs`.
Real assets: `KAMEN_V11_ASSET_DIR=/path/to/unpacked/assets KAMEN_V15_ASSETS=1 node dev/kamen_song_native_v11_fast_test.cjs`.
No full regression, catalog sweep or MP4 batch was run for this hotfix.
