# KAMEN: general-purpose lyric MV quality audit / 2026-10-12

## Verdict
**NO-GO for artistic 100 or "works optimally for any song".** The tested artifact reports 9 creative hard gates and certified100=false. A verified technical export is not a validated artistic decision.

Evidence under review: attached 28.86-second MP4, its ~24 MB QA JSON, asset pack (single supplied stadium image, audio and 8 timed lyric lines); release baseline main 2e7ed477f88028dbb63aa609e8a11b4052ea8c00. The MP4's SHA-256 exactly matches the QA's videoSHA256 (\`fad51e0173f332d844b69b11c640913c96740ebfe2d67246396fbd4bc9ffb370\`). This is a one-song diagnosis, **not** proof of generalization.

## Findings: pixels, planner, registries
- QA: technical 82, creative 75, musicalDirection 80, typography 62, visualWorld 88; typographyDiversity 28, motion 40.25, motionRealization 50, lyricForegroundNovelty 69, hookNovelty 56, regionalPerceptualNovelty ~78.54; temporalContrast 100 and localContrast 99 do not override missing/failing gates.
- All 8 storyboard cues are **blueprint**, with diagonal typography in first four and giant in last four; camera progresses push/impact, with cut transitions throughout. Single visual source reused. "Climax" runs 15.04–27.15 seconds; its repeated modes risk sustained plateau rather than escalation.
- Independent 0.2-second MP4-frame observations find low within-phrase full-frame pixel change for the first seven phrases (the change score is a physical proxy, not a subjective motion score). The last phrase changes more markedly.
- Selection QA reports one font \`dela\` and one overall style \`blueprint\`. Of 24 font render probes, only 11 were eligible in this browser context; \`mono\` had unavailable requested face. Of 24 style probes, 20 were eligible.
- Current per-song registry: 169 layout IDs, of which 12 are reported \`ELIGIBLE_FOR_MEASURED_PHRASES\`, 146 \`MANUAL_OR_THEMATIC_ONLY\`, 9 \`REJECTED_RENDER\`, 2 title/credit. Excluding a layout as unsafe is legitimate; merely storing it in a catalogue is **not** testing its creative fit. Native dispatch audit covers 724 registered techniques and 24 styles; 15 additional virtual cinema layouts are \`UNMEASURED\` in the attached catalogue. Dispatch does not prove an effect contributes perceivable motion, survives export, or makes sense musically.
- Existing initial selection scores font and style using a small representative phrase sample, then selects layouts greedily. Many entry choices are excluded by an absolute "complete lyric visible at onset" safety policy; only five hold IDs enter the late selection shortlist. This can lead to a safe but under-directed cinematic result.
- Semantic direction, impact-beat alignment and calibrated human ratings are missing/UNMEASURED. DO NOT turn null into zero or 100. A single background photo cannot support unverified subject segmentation, parallax or inferred image meanings.

## Experimental PR: safe cross-phrase selection
- Add glyph-mask signatures to candidates that have already passed actual render evidence, and use bounded beam-search to optimize the whole phrase sequence with audio energy changes, section roles, continuity and fatigue penalties.
- Permit adoption only when a variant is close to the best local fit **and** passes six re-render safety checks across entry/body/release. Otherwise retain the incumbent.
- Emit a decision trail with accepted/rejected variants; deterministic unit test covers safety, distinctness, quiet sections, and input immutability.
- This is a **scope-limited change to the single-background photographic registry path**, not a completed all-method optimizer. Preserve manual/Director locks and existing final MP4 gates.

## Required generalized direction engine after the experimental change
1. **Represent the song, not its template:** tempo with confidence, onset/beat salience, section energy/change-points, rests, syllable timing when actually measured, line semantics when validated, foreground/background capacity, user locks and target profile. Unknown features stay unknown.
2. **Typed capabilities for every renderer ID:** supported aspect, lyrics-safe phases, entry/hold/exit timing, whether motion survives encodes, image requirements, foreground-mask requirement, semantic affordances, platform/browser dependencies, cost and provenance. Native dispatch, browser font availability and physical effect visibility are separate evidence. Fail closed for unmeasured.
3. **Factorized compositional search:** propose style arc (including coherent single-style candidates), typography hierarchy, layout, background world, motion, camera, transitions, and motifs; constrain by asset rights, input text, safe area, face availability and decoding capabilities. Use song-conditioned priors, never global popular-style bonuses or random rotation.
4. **Global narrative optimization:** choose shot grammar by music/lyric structure; use dynamic programming or beam search to avoid local decisions causing prolonged plateaus. Reward meaningful phrase-to-phrase *observed* change and purposeful stillness. Repeated lyrics need development, but a lyrical quiet passage must not be forcibly animated.
5. **Renderer-in-the-loop competition:** inexpensive correct-renderer candidates -> representative actual pixels -> encode/decode finalists -> compare independently derived lower-tail quality, glyph integrity, temporal narrative, sync and asset/semantic confidence. Preserve baseline as a candidate and reject regressions.
6. **Counterfactual validation:** for each shortlisted family, compare clean control, effect enabled, and effect removed at the same timestamps. Count only its incremental visual contribution, not scene cuts, audio-independent camera movement or the background photo's static texture.
7. **Independent final verification:** hash-bind source, generated plan and chosen MP4; check full-phrase glyph identity/timing, actual decoded audio continuity, multi-aspect safe areas, lack of unverified fonts, visual energy pacing, global/style change, and no unknown necessary signals. Export success != certified creativity.
8. **Human quality and generalization:** blinded ratings by multiple independent reviewers, comparing against baseline/manual references, with confidence intervals and explicit calibration. Measure whether the changes transfer to previously unseen songs/assets; do not certify 100 from engineering proxies.

## Pre-release multi-song matrix (not executed in this audit)
- Independent **30+ songs**, stratified across ballad/ambient, vocal rock, rap/high syllable density, EDM/percussive, cinematic/orchestral, chant/repetitive, acoustic and other outlier genres. No fixed song-specific exceptions.
- Cover real 16:9, 9:16, 1:1, 4:5 and long/short/quiet-intro edge cases using systematic pairwise coverage; include no-image, single-image and multi-image contexts, JPG/PNG/transparency, supplied user fonts and font-loading failure.
- For each technique family, run native dispatch, browser availability, lyric-safe phase matrix and decoded MP4 counterfactual. "Not applicable" is valid; never silently count it as PASS or pretend every effect should be used.
- Compare **hold-out songs**, unchanged input, same settings and identical source commits. Report per-domain distributions plus worst-decile/tail, actual examples and raw encoded-media evidence; preserve manual locks.
- Release only when existing measurable original hard gates pass, required evidence is complete and human comparison is validated. Until then keep Draft PR and Pages/main unchanged.

## Critical distinction
The attached evidence supports a real quality regression/limitation diagnosis and a specific improvement experiment. It does NOT support certifying every possible style/motion combination, claiming improved 100-point results from this PR before CI/E2E, or promising artistic 100 for arbitrary songs.
