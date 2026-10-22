# Song-causal composition v7

## Implementation and causes

- v4 assigned the same cut/still compatibility fields to every generated lyric.
  v6 inherited these fields; v5/v6 returned one proposal and the search only
  observed that solution. v7 retains compatibility operators but renders saved
  numeric entry/exit and composition trajectories at actual frame time.
- v6 ended smoothstep at an acoustic event, placing peak velocity before it.
  Its observer selected individual frames, potentially dropping the paired
  endpoints. v7 centers local transitions and reserves complete event triplets.
- v6 compared normalized coordinates with a composite glyph/pixel distance, and
  background pixel differences with scaled camera coordinates. Those quantities
  have different units. v7 uses projected centroid displacement for geometry,
  and an independent reference raster for background plan realization.
- The inherited koma clock could collapse a short numeric trajectory into one
  drawing time. v7 generated cuts use actual time. The legacy hype wrapper also
  mutated v7 cut parameters because its bypass stopped at v6; v7 now bypasses it.

## Search and contracts

Up to eight deterministic low-discrepancy numerical starts use the existing
SSM/DTW and FFT-derived trajectory. Bounded coordinate search accounts for
acoustic targets, neighboring sections, recurrence, image detail/brightness,
text extent and crop relations. Near-duplicate numerical trajectories are
removed before the best three feasible solutions reach isolated glyph and
background Canvas observation. Input-dependent objective weights rank feasible
solutions. The chosen direction records actual attempted/distinct/safe/observed
counts, candidate IDs, objective values and raster observations. These counts
are never padded. A single distinct solution is explicitly reported.

The chosen direction, seed, motions and selection summary use schema/renderer 7.
No PCM, Canvas images or candidate pool is persisted. An in-memory single-input
pool reuses numerical work; only the chosen plan receives the full final QA.
Legacy schema and rendering dispatch remain intact. Manual cuts keep their
existing layout and camera. Quality repair rebinds retained selection only for
compatible changes. Spectral input changes affect v7 input identity; generated
selection and diagnostic flags do not.

## Bounded validation

`node dev/kamen_song_native_v7_fast_test.cjs` covers four groups:

1. Real entry pixels, cut trajectories, exact UI source, immutable preview, locks.
2. Different Canvas geometry, deterministic multistart, duplicate rejection,
   numeric/Canvas safety, optimal selection among observed candidates, cancellation.
3. Same BPM/loudness/lyrics/image with different acoustic order; real local
   changes, complete event triplets, missing coverage, static-raster rejection,
   quiet hold; background production/reference raster agreement.
4. Japanese grapheme order, exact LRC timing, both aspects, v7/legacy persistence,
   diagnostic/source identity separation, quality-fix finalization, export paths.

The unchanged FAST contract checks for v3/v4/v5/v6 and export UI, production
build, and Chromium real-UI generation/quality/save/restore smoke are also run.
No full regression run, full MP4 encode or performance benchmark is required.

## Limits and self-review

The supplied request contains scores but no original PCM, image, LRC, or raw
observation report. Exact reproduction of 10/100 or 20/100, and a before/after
score for that material, cannot be established. The changes above resolve
identifiable renderer/measurement defects and have synthetic Canvas evidence.

Background realization, actual pixel novelty, text/background relation and
musical merit are separate. Background musical merit remains UNMEASURED: no
calibrated pixel-distance/acoustic-distance mapping is asserted. Unobserved
acoustic events remain explicitly uncovered. Numerical music fit is a model
objective, not an audience assessment. Inherited readability gates/thresholds
are preserved and missing evidence never grants certification.

Director: per-cut numeric animation is visible in real Canvas. Music: local
transitions follow measured times and measured silence holds. Algorithm:
solutions vary in continuous geometry, not named templates. QA: scores do not
receive a fixed bonus; stationary pixels fail positive movement expectations.
Performance: no second FFT, no intermediate encode, bounded candidate/Canvas
budgets. Release: schema isolation, final-plan QA and existing main-push Pages
workflow remain in use.

Long real-material completion, all-frame MP4 quality, speedup ratio, and human
artistic quality remain UNVERIFIED.
