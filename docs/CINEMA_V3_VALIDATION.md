# Cinema V3 — verification and review

## PR #6 evidence

The current hardening work is described in [CINEMA_V3_RELEASE_HARDENING.md](CINEMA_V3_RELEASE_HARDENING.md). Its new data lives under `docs/qa/cinema-v3/release-hardening/`; the original 3.0.0/3.0.1 cohorts below remain historical evidence and are not overwritten. Final acceptance uses the original final-MP4 observer cadence and thresholds. Human evaluation remains **HUMAN_EVALUATION_PENDING**.

## Scope and commands

Baseline is `ef829f93a933794c337bf1a37c39fcfb8d4de0f4`. Main, release and production Pages are unchanged. Six feature PRs are stacked; publishing requires a separate instruction.

```sh
npm ci --cache /workspace/cinema-v3/npm-cache
npm test
npm run build
npm run test:cinema-export -- http://127.0.0.1:4173/ /tmp/kamen-cinema-e2e
npm run test:cinema-matrix -- http://127.0.0.1:4180/ http://127.0.0.1:4180/baseline.html /tmp/kamen-cinema-matrix
node dev/cinema_v3_summarize_benchmark.cjs /tmp/kamen-cinema-matrix /tmp/kamen-cinema-review
```

Start the repository's `scripts/serve.mjs` for the built app. For comparisons, serve a **frozen** copy of final `dist` and baseline `index.html` with the same assets on a separate local server. Do not overwrite that copy during a run. Use the same `KAMEN_CHROME` path for both versions; retain TLS verification and the previously approved proxy CA. No worktree, additional runtime dependency, external AI or media upload is needed.

Six Cinema V3 engine tests are registered in `scripts/run-tests.mjs`. `cinema_v3_export_e2e.cjs` is registered as `test:cinema-export` and executes in GitHub CI after build. It reuses the existing real UI/download test; `--verify` only verifies an already generated actual MP4 and clearly records that mode. It never substitutes mock artifacts for browser export. The state-machine unit test labels its Blob artifacts as synthetic unit data.

## Evidence and limits

- Foundation: 181 suites, 179 PASS, 0 FAIL, 2 SKIP; old source order and 83 module bytes retained; exact plan/pixel equality on 15 frames/3 aspects.
- Selection: 182 suites, 180 PASS, 0 FAIL, 2 SKIP; real UI E2E 10 PASS; hard failures, stale evidence, missing evidence, incomparable units/profiles and protected regressions rejected.
- Repair: real UI E2E 10 PASS; four actual encodes, two measured improvements accepted, final regression rejected; selected Blob SHA matches provenance. GitHub PR #3 CI passed.
- Grammar: real UI E2E 10 PASS; existing 20-song raster diversity, architecture, grammar and contract checks passed. A no-Canvas regression was found and repaired; unavailable text measurement is UNMEASURED, never a fabricated width. The fix is included in PR #4.
- Initial isolated Phase 3/4 installation used an unwritable home npm cache and failed. The resulting fallback to global dependencies is **not** accepted as clean-install evidence. Explicit writable cache and `set -e` are used for the rerun. Initial failure logs remain available.
- Final 184-suite regression, formal export, final-code performance comparison and final PR CI are recorded by their own completion artifacts. A running check is not PASS. Two old browser-specific engine suites remain SKIP unless their dedicated legacy report is supplied; independent UI E2E does not convert those skips.

The final rendering cohort used Cinema engine 3.0.1, frozen bundle SHA256 `7525994e8630ca64133afb2f20993a7762f533cdb6c0d9efad98dea35d2fc629`: 24 distinct inputs plus four repeats, 28 paired trials / 56 real MP4s. All passed H.264/AAC certification, ffprobe, complete FFmpeg decode and duration checks; no missing frames or failed attempts in this cohort. Five repetitions produced identical planHashes within each engine. Later failure-retention/evidence guards change failure handling, not these rendering curves; final exact-head CI remains authoritative for those guards.

Total P50: baseline 11,530.8 ms → V3 10,940.45 ms (−5.1%). P95: 25,085.9 → 28,512.9 ms (+13.7%). Search P50/P95: 7,323.85/18,711.9 → 7,055.3/21,623 ms. Export P50/P95: 2,789.55/5,795.7 → 2,902.05/6,026.9 ms. This does not establish universal speed improvement.

An earlier 3.0.0 cohort encountered one native certification failure before a successful retry (1/57 attempts overall, 1/29 V3 attempts). Its original failed Blob was not retained, so the cause remains unresolved. It is not erased by the later cohort. Added independent decoder recovery uses the same four 96×54 frame times and original brightness threshold; controls with a real valid MP4 plus injected native black paint pass, while a genuinely black encoded MP4 still fails. These controls demonstrate the recovery behavior, not the cause of the original failure. Failed repair encodes now retain the best previously verified artifact; initial failure, cancellation or changed input still fail safely.

The benchmark excludes the initial registry/style tournament equally from both engines. It performs real PCM analysis, deterministic initial registry setup, bounded candidate search and one full encode. It measures analysis/plan, search and export wall times. Rendering-only time, peak process/GPU memory and cache hit rate are UNMEASURED. A browser heap snapshot is not peak memory. Concurrent cloud test load and one host limit generalization; mixed-case P95 is not the repeated latency of every case.

Low coarse `navigator.deviceMemory` (≤2 GiB) reduces Stage B from 8 to 4, Stage C from 3 to 2, and full encodes to at most 2. Unknown memory keeps the original 8/3 search. The configured 128/256 MiB **soft planning budget** is not an enforced process memory cap. The default full-MP4 loop remains bounded by existing attempts and 120–300 second time budget. Budget exhaustion restores the best artifact and terminates as BUDGET_EXHAUSTED. Automatic FPS changes invalidate and remeasure QA before binding the immutable snapshot.

## Risk-based matrix and metamorphic mapping

| Risk / axis | Executed evidence | Scope / remaining gap |
|---|---|---|
| Calm / standard / intense / variable / silence / ambiguous beat | 24-fixture browser benchmark, audio tests | Synthesized PCM; no real-song corpus |
| Short / long / repeated / dense / mixed language / ruby | benchmark and grammar preflight tests | Ruby syntax/measurement, not proof of full typographic ruby semantics |
| Long intentional HOLD / repeated lyric count | grammar + state + phase_quality tests; 8s fixture | No generic motion/novelty repair of intentional HOLD; aesthetic judgment unmeasured |
| Dark / bright / abstract / transparency / text / people shapes | browser fixtures | People are geometric silhouettes; no segmentation or photographic identity claim |
| Multiple images / no image | existing multi-image suite; actual API exports | Editor still has intentional single-background policy; API multi mode is explicitly enabled, archived assets are not counted as active multi evidence |
| 16:9 / 9:16 / 1:1 / 4:5 | actual 3-aspect exports; 4:5 contract/preflight | 4:5 real MP4 not covered |
| Full / short / explicit loop | full exports and complete-phrase 12s short from 13s source | Technical export is not proof of seamless/artistic loop; missing loop evidence remains missing |
| Generate / regenerate / save / restore / draft | actual UI E2E | Legacy project and native headless picker probe retained |
| Manual font/color/camera/time lock | snapshot, override tests, state repair rejection | Full cut signature is compared; never rewrite source PCM/LRC |
| Cancellation / encode error / retry / disposal / budget | state-machine + encoder_liveness + machine_refinement | Low-memory policy unit checked; no physical low-memory mobile device run |
| Determinism | stable hierarchy ties, input Hash tests, five actual export planHashes | Same source/settings/engine/**budget/environment**; codec byte determinism not asserted |
| Volume-only normalization | normalized features equality | No claim across clipped PCM or different analysis implementations |
| Language/aspect change | glyph/safe-area raster suites, mixed/ruby preflight, actual aspect exports | Invalid/unreadable short intervals remain draft deficits |
| Proxy unavailable / stale QA | calibration tests, evidence statuses | UNMEASURED/null, no promotion to measured 0 or 100 |
| Missing MP4 frames / AAC endpoint mismatch | existing sequential_decode/export_certification/closed_loop + finalEvaluation hard failures | Complete final decode mandatory; actual missing-frame injections are tested separately from valid browser outputs |
| No improvement / protected regression | state-machine and real repair history | Entire best plan, QA, selected video and Hash restored |

An initial 3s short fixture had no eligible 12–15s complete phrase interval and was correctly rejected by both versions. The corrected short uses the selected source range (0.2–12.2 seconds), never moved LRC timestamps or a fabricated crop. Earlier invalid range/short fixtures are diagnosed harness precondition failures and excluded from the final valid-fixture failure-rate denominator; they are not silently marked successful.

## Blind comparison protocol

`cinema_v3_summarize_benchmark.cjs` generates 24 randomized anonymous A/B pairs, an offline `review.html`, blank ratings CSV, manifest and a **separate** answer key. Keep the answer key out of the reviewer ZIP. No human ratings or win rate have been filled in. Review UI software test data is labeled QA_ONLY_NOT_HUMAN and excluded.

Pre-register at least 3 independent evaluators; use the same display size, headphones/volume and complete playback of A/B. Counterbalance A/B order and shuffle case order independently for each evaluator. Rate readability, music fit, visual coherence and interest from 1–5, then choose A/B/equal and enter a reason. First reject technical failures; report those separately from preference. Keep source case as the paired unit and evaluator as a repeated factor. Publish paired effects with uncertainty, including equal preferences and every case; do not cherry-pick wins or sum different metric units. A gain claim requires completed human data and no protected technical/readability regression. Human evaluation and aesthetic calibration are **UNPERFORMED**.

## Deployment and recovery

Merge order: #1 → #2 → #3 → #4 → #5, only after explicit authorization and final checks. PR workflows cannot upload Pages artifacts or deploy. The current main remains the published 2.0.26 version. Recheck main and Pages SHA before any future release.

Feature-off recovery: set internal `J.cinemaV3.enabled=false`; clear derived QA and regenerate the plan before exporting. Selection and repair then return to their legacy paths; existing app formats/QA/sidecar fields remain. Full recovery: revert feature commits in reverse dependency order (5→4→3→2→1), rebuild, run the same regression and actual export checks, then deploy only when separately authorized. Runtime functions should not be replaced by console edits in a published site. Back up project files and keep the last accepted artifact/history before release.

Unresolved: licensed real music/portrait corpus, full font cmap/character coverage, verified subject segmentation, sung-onset synchronization, complete low-memory device testing, peak memory/cache/renderer-only instrumentation, statistical calibration against human scores, human blind evaluation, and any artistic-100 claim. The engine exposes these limits and preserves a usable technical draft; it does not declare universal success.
