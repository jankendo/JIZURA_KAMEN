# Song-Generated Visual Grammar v4

New `autoDirection()` and alternative generation call `generateSongVisualGrammarV4`.
The proposal and `makeArtDirection` use drawing primitives, bypassing archetypes,
registry style tournaments, four-mode song profiles and the complete dynamic Story
chain. Legacy projects retain their v3 planner and renderer.

Audio's existing FFT now retains six normalized logarithmic bands in its detailed
frames. v4 reuses those frames, envelopes, onset and RMS. Normalization, bounded
self-similarity (at most 192 samples), local novelty and nonadjacent phase-aligned
section comparisons infer boundaries and recurrence without naming song sections.
Only summaries, feature availability, sparse relationships and adopted states are
saved; PCM, FFT buffers and the temporary matrix are excluded. Unchanged acoustic
summaries are reused through replan; input identity excludes generated direction
and transient QA while retaining actual media and rendering inputs.

Continuous glyph centers, widths, spacing, camera and crop coupling are computed
from acoustic vectors, lyric density and local image detail. Recurrence couples
related sections; bounded gradient refinement discourages image clutter and abrupt
motion. Numerical regularization alternatives are compared on music fit, recurrence,
continuity, excess and observed foreground geometry. Representative Canvas masks
must contain ink and meet the existing safe-area evidence predicate. Full existing
quality observation and Hard Gates still follow in the UI. This is not a human
artistic-quality certification.

The version 4 resolved payload uses `kamen-song-grammar-renderer-4`, preserving the
existing version 3 renderer identifier. Resolved capture builds its baseline from
the final adopted grammar; local quality repairs retain the adopted trajectory.
Saved decisions are validated against input, baseline, lock and render identities.
Rejected data remains available to the existing restore notice. The containing
project/IndexedDB schema is unchanged because only the independently versioned
Song-Native payload changed.

FAST checks:

```
npm ci
node dev/kamen_song_native_v4_fast_test.cjs
node dev/kamen_song_native_v3_fast_test.cjs
node dev/kamen_export_ui_test.cjs
npm run build
KAMEN_CHROME=/usr/bin/google-chrome node dev/browser_startup_smoke.cjs http://127.0.0.1:4173/
```

The v4 test covers four contracts: fixed-profile bypass; same lyrics/image/BPM/mean
energy with reordered synthetic acoustic blocks and different real Canvas pixels;
recurrence/determinism/boundedness/cancel; timing, both aspects, locks, v4/v3 restore,
stale rejection and quality-fix commit. Browser smoke clicks the real MV creation button for a one-second synthetic
image/audio/LRC fixture, completes quality observation and restores its decisions.
It also guards against legacy hook rendering mutating generated cut inputs. No full suite, long video generation,
benchmark or speed ratio is part of this release.

Known limits: spectral descriptors infer acoustic similarity rather than musical
form, semantic understanding, faces or depth. A 192-sample cap reduces long-song
time resolution. Sparse/missing descriptors remain explicitly unmeasured. Artistic
judgment and all-frame long MP4 quality remain unverified.
