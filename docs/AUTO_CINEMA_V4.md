# Auto Cinema V4 — quality-preserving computation

Base: PR #8 `3b7388491d058f9fe6d36fb9fc2a04e368d0f365`; production main `ef829f93a933794c337bf1a37c39fcfb8d4de0f4`.

## Rejected experiment

Sharing a Renderer across Stage C, readability repair and legacy-finalist comparison caused a completed-MP4 regression on a bright high-quality fixture: PR #8 99 → shared Renderer plus per-time evidence 95. With per-time reuse disabled, shared Renderer still measured 90; all three measurements of that same Blob were 90. Keeping independent Renderer scopes restored 99, including three same-Blob measurements. The experiment was stopped before full validation. Both scope sharing and per-time candidate evidence reuse were removed by a normal follow-up commit; their earlier commit is retained for audit. The exact internal drawing-state dependency is not yet isolated, so candidate-level Renderer state is not assumed immutable from a plan hash alone.

## Current candidate

The existing independent rendering/selection paths remain intact. Luma extraction directly produces the same Float32-rounded plain array, avoiding an intermediate array copy. A bounded mathematical stencil cache stores only core/ring indices derived from alpha threshold classes. Dimensions, hash and full byte-for-byte class equality protect reuse, including hash collisions; foreground/background pixels and every contrast score are recomputed. No candidate quality evidence is reused across changed rendering conditions. This pure mask geometry does not certify source pixels, plans or videos.

1084 differential comparisons against the PR #8 full-mask algorithm pass, including mask mutation, all threshold boundaries, three aspects and forced hash collisions. All 65536 tested luma values match the previous Float32 extraction exactly. The stencil retains at most 16 entries; peak browser/process memory is still UNMEASURED. No search count, mask threshold, rendering resolution, FPS, glyph, ranking, independent final-MP4 QA or one-click rule is changed.

Existing adaptive Scene Grammar remains in use; no new direction rules have been adopted without evidence of a safe improvement. Human evaluation remains HUMAN_EVALUATION_PENDING.

## Interrupted acceptance — PARTIAL / NO-GO

`npm ci`, full engine regression tests (187 PASS / 0 FAIL / 2 SKIPPED_ENVIRONMENT_MISSING), isolated restore and production build completed. The two environment-dependent browser skips are supplemented by the formal real-browser export: 10 UI checks, project save/reload, BELOW_TARGET MP4 download with one click, no Draft approval, H.264/AAC full decode, black-video rejection, retained failed Blob, actual WebCodecs cancellation/resource closure/restoration and independently decoded healthy retry. JavaScript exceptions and unexpected resource failures were zero in this completed browser run. Synthetic acceptance/save boundaries are reported separately and perform zero fresh encodes. See [local validation](qa/auto-cinema-v4/local-validation.json).

The final matrix was interrupted after outbound Google Fonts and GitHub requests both returned HTTP 503 with `cloudflare_https_tunnel` upstream connection failure. Preserve the interrupted dataset: 66 fully validated MP4s, 5 failed runs, 55 of 126 planned runs not completed. The status API still reported connected/running; actual outbound HTTP probes establish the blocker. Earlier normal external-font loading passed; intentional network failure correctly reported REQUESTED_FACE_UNAVAILABLE and kept the embedded font. This does not resolve the old offline incident. See [network evidence](qa/auto-cinema-v4/network-blocker.json) and [font controls](qa/auto-cinema-v4/font-probe.json).

For the completed first 22 original materials only, localContrast is measured on 17 and UNMEASURED on 5 per variant. Paired measured medians are main 69 / PR #8 94 / current 94. No measured global or physical-interval loss versus PR #8 was observed in this subset. One main-relative interval remains 75 → 74, with PR #8 and current both 74; it is not waived as noise, and requires same-Blob remeasurement plus independent repeat encoding. Short/dense and manual preliminary controls separately retained PR #8 scores 68 and 54. Final case-23/case-24, additional, independent and repeated cohorts remain incomplete; preliminary controls cannot replace the missing final set.

| Completed 22-material subset only | main | PR #8 | current |
| --- | ---: | ---: | ---: |
| Total P50, ms | 10694 | 14236 | 14736 |
| Total P95, ms | 20108 | 35509 | 32847 |
| Maximum in this subset, ms | 22766 | 41696 | 37001 |

These incomplete order statistics do not establish the requested full-set performance target or statistical improvement. The separate representative long material still took 118407 ms versus PR #8 123876 ms; native rendering/observation duplication remains unresolved. Inclusive profile times must not be added. Hardware capacity is recorded separately from UNMEASURED peak browser/process/GPU memory. See [benchmark summary](qa/auto-cinema-v4/benchmark-summary.json), [representative comparison](qa/auto-cinema-v4/representative-summary.json) and [compressed observations](qa/auto-cinema-v4/observations.json.gz); original raw data and videos remain outside Git with a [hash manifest](qa/auto-cinema-v4/raw-manifest.json).

Final-HEAD PR creation/CI and deployment are blocked by outbound connectivity. Main and Pages remain unchanged. Resume by restoring connectivity without resetting the workspace, pushing the protected local evidence, creating the requested PR against `codex/kamen-one-click-auto-cinema`, and completing failed/remaining comparisons in a separately identified dataset. Do not turn the interrupted rows into PASS or reuse prior CI as final-HEAD validation. Historical 3.0.0 certification failure, Renderer state-sharing cause, aesthetic assessment and peak memory remain unresolved/unmeasured.

## Recovery continuation, 2026-10-11

The available environment started at production main, without the unsent `d5791a1` object or the original V4 raw-video directory. Recovery therefore uses the GitHub-saved `c3e504d` source and retains its committed evidence unchanged. The local Git bundle was verified before switching branches. Normal Git fetch/push, verified HTTPS to GitHub and Google Fonts CSS, and DNS resolution now pass; the historical tunnel/offline causes remain unresolved. See `qa/auto-cinema-v4/recovery-2026-10-11.json`.

The retained continuation change reuses aligned contrast only for repeated requested timestamps inside one actual-frame observation, with independently owned result objects and no extra copies on unique frames. The existing mathematical stencil/luma optimization is unchanged. Fresh requested-time references, independent Renderer scopes, all candidate budgets and final MP4 QA remain required. No cross-candidate pixels or Renderer state are reused. Differential tests compare independent fresh measurements across three aspects, cancellation/invalidation/mutation controls, alpha threshold boundaries and forced hash collisions. New Chromium 151 measurements cannot be pooled with the historical Chromium 154 timings.

The draft-release asset upload endpoint rejected the environment credential with HTTP 401, although normal Git push works. No release asset backup is claimed. Continuation evidence and completed MP4 archives will therefore be protected through a separate normal-push evidence branch, linked from PR #9. The source branch will remain fixed while its exact-HEAD CI runs the complete regression suite, isolated restore and browser export; local timing runs use an immutable separately served build with the same runtime hash.

The alpha-allocation trial at `88af768` was rejected after a counterbalanced real-browser math probe: same-alpha hits improved, but alternating masks and twenty distinct masks regressed by approximately 40% and 146%. Its eight completed comparison MP4s and exact-equality evidence are retained as rejected-trial evidence, not final release acceptance. The final candidate restores the previously adopted stencil and retains only invocation-local repeated-frame contrast reuse.
