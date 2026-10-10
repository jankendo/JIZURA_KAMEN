# Auto Cinema V4 — quality-preserving evaluation reuse

Base: PR #8 `3b7388491d058f9fe6d36fb9fc2a04e368d0f365`; production main `ef829f93a933794c337bf1a37c39fcfb8d4de0f4`.

The initial optimization shares the existing Renderer scope between Stage C, readability repair and legacy-finalist comparison. It also reuses completed per-time native measurement evidence when input, complete plan hash, output profile, renderer version, font/glyph state, texture, requested/actual time and observation method all match. Changed time collections reconstruct their own supplemental status. Cached values are cloned and bounded to 512 samples; cancelled observations clear scoped evidence. Drawing, masks, scaling, candidate counts, ranking, thresholds and final MP4 QA are unchanged.

Targeted tests pass for synthetic and shipping Renderer equivalence across three aspects, time-set expansion, input/plan/font invalidation, cancellation, independent cache copies, one-click UI and native save behavior. Representative final-MP4 comparison is pending; performance improvement and aesthetic improvement are not established. Existing adaptive Scene Grammar remains in use; no new direction rules have been adopted without evidence of a safe improvement.

Release gate: pending measurements mean NO-GO. Keep main and Pages unchanged until the final-source full matrix, required tests, exact-HEAD CI and recovery checks establish the specified acceptance conditions. Human evaluation remains HUMAN_EVALUATION_PENDING.
