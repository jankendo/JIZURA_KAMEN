# Auto Cinema V4 — quality-preserving computation

Base: PR #8 `3b7388491d058f9fe6d36fb9fc2a04e368d0f365`; production main `ef829f93a933794c337bf1a37c39fcfb8d4de0f4`.

## Rejected experiment

Sharing a Renderer across Stage C, readability repair and legacy-finalist comparison caused a completed-MP4 regression on a bright high-quality fixture: PR #8 99 → shared Renderer plus per-time evidence 95. With per-time reuse disabled, shared Renderer still measured 90; all three measurements of that same Blob were 90. Keeping independent Renderer scopes restored 99, including three same-Blob measurements. The experiment was stopped before full validation. Both scope sharing and per-time candidate evidence reuse were removed by a normal follow-up commit; their earlier commit is retained for audit. The exact internal drawing-state dependency is not yet isolated, so candidate-level Renderer state is not assumed immutable from a plan hash alone.

## Current candidate

The existing independent rendering/selection paths remain intact. Luma extraction directly produces the same Float32-rounded plain array, avoiding an intermediate array copy. A bounded mathematical stencil cache stores only core/ring indices derived from alpha threshold classes. Dimensions, hash and full byte-for-byte class equality protect reuse, including hash collisions; foreground/background pixels and every contrast score are recomputed. No candidate quality evidence is reused across changed rendering conditions. This pure mask geometry does not certify source pixels, plans or videos.

1084 differential comparisons against the PR #8 full-mask algorithm pass, including mask mutation, all threshold boundaries, three aspects and forced hash collisions. All 65536 tested luma values match the previous Float32 extraction exactly. The stencil retains at most 16 entries; peak browser/process memory is still UNMEASURED. No search count, mask threshold, rendering resolution, FPS, glyph, ranking, independent final-MP4 QA or one-click rule is changed.

Final-MP4 comparison and full validation are pending. Performance improvement and aesthetic improvement are not established. Existing adaptive Scene Grammar remains in use; no new direction rules have been adopted without evidence of a safe improvement. Human evaluation remains HUMAN_EVALUATION_PENDING. Pending acceptance conditions mean NO-GO; main and Pages remain unchanged.
