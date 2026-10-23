# v15 ENTRY contrast recovery

The reported diagnostic identifies line 2 (`ララーラーラー`) at 6.171 s:
`paper / curtain / stamp / echoTrail / driftDiag / splitDiag / gradientV`, no FX,
complete glyphs and safe bounds, but composed contrast P10 = 1 during ENTRY.
Line 1 also failed contrast and had a repair candidate; the whole sequence was
correctly left uncommitted when line 2 exhausted recovery.

The previous contrast recovery tried FX even when the cut had no FX, then
text treatment/background, and considered entry last. It never considered a
layout for contrast failures. `curtain` can paint panels after its primary text;
pre-glyph color/shadow/scrim alone cannot always restore the composed text.
Two additional issues limited partial repairs: the initial deficit used only
failed phases while candidates used all phases, and merged 640px evidence hid
256px-only failures. Newly rerolled layouts were discarded before fitting.

## Change

- Keep the v15-only final gate and all existing safety thresholds.
- Compare complete phase schedules; eligible bounded transients add no deficit.
- Use the failing resolution's evidence and verify 640px in the final installed
  sequence context, rather than changing the plan's global style for that check.
- Skip inactive FX and other inactive roles. Include layout for contrast failures;
  complete opaque glyph geometry with near-zero composed contrast prioritizes
  a layout occlusion check. ENTRY/EXIT remain explicit causal candidates.
- Fit each local technique candidate using its own measurements. Retain the best
  measured improvement rather than restarting on the first small improvement.
- After two random layout alternatives, the existing eligible `center` layout
  may serve as a no-panel control; it preserves all other technique identities.
- Limit recovery to 24 candidate states per failed line, with no all-song retry.
  Each returned candidate must pass both resolutions and the final combined gate.
- Record bounded per-attempt failure/scale diagnostics and cut seeds/layout
  parameters. No image raster or raw audio is included in these diagnostics.

v11–v14 final confirmation, manual locks, preserveCurrent and persistence schemas
are unchanged.

## Validation

1. Actual Chromium Canvas reconstruction of the reported technique combination,
   with an additional synthetic background/entry geometry case: recovered within
   16/24 states, with only causal layout/entry changes, other lines frozen, and
   both resolutions passing. The existing scale-dependent FX wash regression
   still verifies 256px PASS / 640px FAIL and subsequent composed recovery.
2. Supplied audio/background/LRC, 37.276735 s, 15 lines. A candidate replay places
   the reported third-line technique combination into the previously saved safe
   sequence, then runs the production search finalization and save/restore path.
   All 15 lines / 120 final 640px phases pass; line 2 recovers in 2 candidates by
   changing layout only; all other 14 cuts remain byte-for-byte identical, and
   compact persistence restores identical render decisions. This fixture replays
   candidates; it does not claim to regenerate the user's unknown original seed.
3. Syntax/build and the existing required FAST CI provide regression coverage.
   The new ENTRY case runs in the existing v15 Chrome test group.

Focused commands:

```sh
KAMEN_V12_COMPARE=v15 KAMEN_V15_ENTRY_ONLY=1 node dev/kamen_song_native_v11_fast_test.cjs
KAMEN_V12_COMPARE=v15 KAMEN_V15_SCALE_ONLY=1 node dev/kamen_song_native_v11_fast_test.cjs
```

The original full saved project/cut seed remains unavailable. The supplied
techniques and timings are reconstructed and kept distinct from an exact replay.
