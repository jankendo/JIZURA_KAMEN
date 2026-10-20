# Song-Native Director v2 — bounded release verification

## Change and saved contract

`artDirection.songNativeResolved.version=2` stores the input identity, renderer/source-tree identity, Song-Native direction, lock signature, baseline/final decision fingerprints and JSON path overrides against deterministic `J.plan()`. It does not store the complete plan, images, PCM, Canvas, VideoFrame, QA reports or architecture-search evidence. Cut decisions include geometry, typography, camera, seeds, grammar and accepted repair values. Storyboard and renderer world decisions are included when changed.

Restoration runs last in the Song-Native planner. JSON overrides apply to a dealiased rendering projection: the planner shares some anchors between cut parameters and direction contracts, and applying a leaf override to those shared objects would otherwise modify an unrelated contract. Baseline, input, renderer, final decision and lock mismatches fall back to current planning. Repeated restore/save/replan is idempotent. Every restored plan invalidates QA. Portable-project migration metadata and local audio storage references are excluded from the rendering input identity.

The UI commits the resolved payload after search, observation, accepted bounded repair and reobservation. It checks project/audio identity, plan reference, observation binding and font/render state before committing. Async results are held locally until those guards pass. A project-level correction rebuilds and searches the corrected plan before its final observation; a saved unchanged project does not rerun that search at export.

## Direction and ranking

Existing temporal roles and motion principles survive. Song-Native modulates their travel curve and level using inferred silence, accumulation, release, repetition and sustain; it delegates to the existing camera trajectory before adding a bounded adjustment. Intentional holds and manual locks take priority. Authored section plans keep their previous opt-out from native modulation while receiving the v2 persistence contract. Drawing uses fresh item values rather than cumulative scale changes.

`negativeSpace` reduces primary text occupancy within existing safe-layout guards. `contrastIntent` strengthens the existing local readability edge under the glyph fill, then applies the geometry guard again. `transitionIntensity` modulates the existing impact envelope and camera adjustment. No readability or timing thresholds change.

Structure uses existing energy/RMS, onset and spectral-flux changes and lyric repetition. Numeric section blocks become coarse time samples, not eight asserted music sections. Musical intentions are INFERRED; missing acoustic evidence remains UNMEASURED.

For technically eligible sparse-render candidates with the same observation population, rank is lexicographic: glyph safety, style pixel eligibility, acoustic/Canvas fit, diversity, style rank. Fit is the fraction of comparable pairs whose acoustic-motion ordering agrees with measured within-phrase primary-mask motion, plus correctly still quiet observations. Ties do not claim movement. When evidence/populations are missing or incomparable, the original safe ranking applies. Semantic interpretation and artistic quality are not claimed as measured.

Binary section lookup supports reverse seeks and half-open boundaries. Binary sample slicing replaces repeated whole-array filtering without regrouping sums. Existing 32-candidate raster/proxy/encoded deduplication is retained; OPT-07 adds no new early exit or candidate-count reduction.

## Limited checks

- T-01/T-03: synthetic search/repair changes, project JSON and migration roundtrip, both aspects, three representative Canvas times per aspect, repeated save/replan, locks/timing, stale input/renderer and invalid payload fallback, QA invalidation.
- T-02: deterministic synthetic songs with equal BPM/mean energy and different structure; motion intent, boundaries and climax differ without seed changes. Individual negative-space, contrast and transition controls change actual Canvas pixels.
- Existing production observer/search/repair and sparse-tournament contracts in `dev/kamen_song_native_director_test.cjs` remain covered.
- `dev/kamen_story_director_test.cjs --song-native` checks the affected ranking contract without its full 49-second fixture. FAST CI runs this subset alongside the Song-Native test.
- Changed-JS syntax, production build and browser-startup smoke; FAST CI and Pages deployment are required release gates.

No full regression, FULL CI, long MV generation, bulk MP4 generation or performance benchmark is run. Speedup is unmeasured; physical GPU use is unconfirmed; overall artistic quality and human evaluation of song uniqueness are UNVERIFIED.
