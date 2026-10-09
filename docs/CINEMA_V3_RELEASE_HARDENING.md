# Cinema V3 release hardening — PR #6

Scope: `codex/cinema-v3-release-hardening`, based on PR #5 HEAD
`36048e497a089b0649a7f7dfddd1986d98f99266`. PR base is
`codex/cinema-v3-quality`. Main, the five preceding branches, production and
Pages configuration are preserved. No merge or deployment is part of this work.

## Root cause: observations and limits

The original Stage C observer rendered lyric reference masks at the requested
seek time, while the 10fps H.264 decoder returned a frame at a different time.
The sampling adapter discarded the decoded timestamp. Controlled comparisons
found every Stage C finalist rejected for encoded lyric presence in the
investigated regressions. V3 then selected the best Stage B candidate, although
Stage B had no encoded contrast evidence. In case-15 that changed the second
phrase from a framed image with dark surrounding space to a hero image behind
the lyrics. Decoded frame captures show the changed composition; this is not
only a score difference. Case-10 also regressed in the original cohort.

Aligning the proxy's six phrase samples with its actual frame cadence and
reference masks with decoded timestamps makes candidates measurable. That
change alone did **not** fix case-15: all three proxy candidates had contrast
100 despite a low-contrast final output. A Canvas guard initially confused the fixed design coordinates (1920×1080 or
1440×1440) with the actual delivered raster (640×360 or 360×360); that experiment
failed to predict the output. The adopted guard instead uses dimensions from
`J.outputSize(project)`, stored as optional `cinemaDelivery` plan metadata.
It simulates the actual frame cadence and the unchanged final observer mask
times at the real delivery raster. In the investigated cases it distinguishes
case-15 baseline/change 95/78 and case-21 96/82 before encoding; the final MP4s
retain 94 and 96 respectively. These Canvas estimates are separate evidence,
not claims of final decoded measurement. Size/FPS changes invalidate search. Proxy evidence cannot certify final output quality.

The adopted selection rule protects the baseline delivery-raster readability
measurement independently of proxy motion improvement. It also preserves the incumbent when the complete measured
Stage C rank ties. A proxy tie does not establish that changing composition is
beneficial. The global minimum and already-readable sampled phrase intervals are protected
separately; a better minimum cannot conceal a loss in an existing strong
interval. Measurably stronger eligible candidates can still win. If all Stage
C candidates fail, the initial baseline draft is retained rather than promoting
an unmeasured Stage B composition. These rules use evidence and candidate roles,
not material identifiers, image patterns or hand-coded case numbers.

The final 384px contrast observer keeps its original sampling cadence,
calculation, core/ring definitions and thresholds. Native decoded timestamps
are used for proxy reference alignment only. Real full-export QA remains the
authority; unknown observations remain null, and failed repairs retain the
verified plan/Blob/QA/hash bundle through the existing state machine. The real browser cancellation probe aborts after
   native frame submission, verifies closed frame/encoder objects and the
   original plan/QA hash, then retries and independently decodes H.264/AAC. No global
black band, thick outline, resolution reduction or quality-threshold change was
introduced.

## Performance changes and attribution

Layer verification needs luma and alpha, but previously computed edge, palette,
saliency and foreground arrays for each reference frame, and converted the
entire RGBA mask through several intermediate arrays. Dedicated extraction
preserves Float32 luma rounding and alpha values. Contrast extraction now
accumulates scalar counts/sums instead of allocating neighbor/core/ring arrays
and invoking callbacks per pixel. A differential oracle verifies the old and
new formulas, including insufficient-mask UNMEASURED results, on 240 fixtures.

The 32→8→3 search and all independent final QA are retained. No new cache is
claimed. A profiled long-loop ablation spent 7,924.9ms on native guards
for proxies already ineligible. Stage C now decodes all three proxies first.
If none can be promoted it omits the irrelevant extra Canvas pass; if another
can be promoted it still measures the baseline as comparison evidence, even
when that baseline proxy is ineligible. Candidate counts and final MP4 QA are
unchanged. Reference-renderer ImageBitmaps are explicitly closed in finally. Peak process/GPU memory and cache-hit rate remain UNMEASURED. Matrix
profiles report inclusive wall time, so nested functions must not be added.
The encoder callback timer includes the shipping decode QA and other export
wrappers. Its reported residual subtracts nested certification and decode QA
wall time; media preparation, rendering, codec drain, muxing and provenance/
quality-report overhead remain included. It is not an isolated codec or GPU
time. Stage A/B/C boundary timing is reported where collected; missing stage
events remain unreported, not inferred from aggregate costs. Saving in the matrix is an external file write,
not a measurement of the application's user-facing save operation.

## Measured two-round comparison

**Overall verdict: PARTIAL; release blocked by the remaining original case-23 regression, additional manual-case regression and pending human evaluation.**

Each build has 56 trials: the same 24 inputs plus four repeat trials in each of two counterbalanced rounds. All 168 completed MP4s passed H.264/AAC validation and complete FFmpeg decode. Values below are milliseconds; P95 uses nearest rank.

| Build | Total P50 / P95 | Search P50 / P95 | Export P50 / P95 | Contrast median (all trials / original inputs) |
| --- | ---: | ---: | ---: | ---: |
| Main baseline | 8,465.85 / 20,458.40 | 5,510.20 / 15,355.50 | 2,099.70 / 4,454.30 | 84 / 63 |
| PR #5 | 8,748.10 / 21,020.20 | 5,717.80 / 15,805.20 | 2,119.70 / 4,304.90 | 80 / 57.5 |
| PR #6 hardening | 7,130.55 / 17,882.60 | 4,759.95 / 14,281.40 | 1,435.15 / 2,801.60 | 90 / 63 |

Contrast has 44 measured trial observations per build (22 each round), covering 18 of the 24 distinct inputs; six distinct inputs / 12 observations per build remain UNMEASURED. Repeat trials are not additional material. Original-input contrast medians are 63 / 57.5 / 63; the repeat-inclusive medians are 84 / 80 / 90.

Paired decoded contrast regressions against main: PR #5 **6 distinct inputs / 12 trial observations**, hardening **1 distinct input / 2 observations** (case-23). Against PR #5, hardening has three lower-minimum inputs / six observations: case-02 −1, case-12 −4, case-18 −1. Case-12 retains main's 54 and protects previously strong intervals; these deltas are not omitted. Case-15 is **94 / 78 / 94**, case-21 **96 / 82 / 96**, for main / PR #5 / hardening in both rounds.

Total P95 across rounds: main 20,277.2–20,458.4; PR #5 20,806.1–21,020.2; hardening 17,603.4–17,882.6. Thus the measured cohort meets the main-relative P95 target and improves P50. This does not establish a population or interactive/default multi-repair SLA. Case-24 remains very slow: main 53,819.2 / 53,516.1ms, PR #5 56,237.7 / 55,963.4ms, hardening 54,307.2 / 53,627.9ms (round 0 / 1; exact values remain in JSON).

The environment is Chromium 154.0.8037.97, Node 24.19.0, Linux 6.18.44 on AMD EPYC 9V74; affinity exposes five CPUs and the cgroup quota is four CPU cores. CPU is not reserved. Heavy jobs run sequentially. Full per-build standard deviations, round distributions, paired case deltas and ten fixed-input repeat trials are recorded in [benchmark-summary.json](qa/cinema-v3/release-hardening/benchmark-summary.json). All three builds retain one identical plan hash across the ten same-input repeat trials; this confirms those tested repeats, not arbitrary-input determinism. All 28 candidate identities per build match across rounds. Full post-QA plan hashes differ for 5 main inputs, 5 PR #5 inputs and 10 hardening inputs; all varying fields were not isolated. In case-08, retained architecture-search evidence contains baseline proxy score 59 → 60 while selection remains baseline and final contrast remains 39; the complete-plan hash includes that evidence. Artifact/plan/QA linkage is independently verified per export, but bit-identical complete-plan/output reproducibility is not established. See [determinism-and-variability.json](qa/cinema-v3/release-hardening/determinism-and-variability.json).

Peak application/GPU memory and cache-hit rates remain UNMEASURED. Source input hashes are paired and independent from renderer-specific immutable snapshot hashes. Sampling frame evidence includes glyph-mask bounds, local background luma, actual decoded pixels and applied grammar/typography; it is not OCR or a human reading-accuracy measurement.

## Evidence and acceptance

Measurement results, individual input/plan/video hashes, paired deltas,
selection evidence and profiles are stored under
`docs/qa/cinema-v3/release-hardening/`. Original PR #5 results remain intact.
The experiment record distinguishes altered-observer ablations from acceptance
measurements. Existing inputs and additional generalized inputs are reported
separately. Both repeat variability and mixed-input P95 are required when
interpreting speed; a shared host does not establish a production tail SLA.

Performance trials retain the original one-full-encode benchmark. The initial
style tournament is excluded equally for all three builds. Thus these timings
are not full interactive import/style-selection/default multi-repair latency;
the shipping UI path is validated separately. Raw `heap` values, when available,
are browser JS-heap point samples after artifact extraction (including test
instrumentation), not application/GPU peak measurements. They are not used to
claim a memory improvement.

Human evaluation is **HUMAN_EVALUATION_PENDING**. The anonymous 24-pair package
uses the new videos, random A/B order, a separate answer key, empty ratings,
review HTML and `dev/cinema_v3_aggregate_blind.cjs`. Internal engineering scores
do not establish human preference or artistic quality 100.

## Initial-plan adaptation: a second protection boundary

The minimum-only and later interval-protected ablations identified a different
regression in case-12 (main 54, PR #5 58, hardening 50) and case-22 (39, 38, 34).
The selector correctly rejected changed candidates and kept its incumbent, but
that incumbent had already been adapted by V3. Captures show `lyric_first`
reducing the initial grammar motion level (case-12's first phrase 0.635963 →
0.274948), moving different background pixels under unchanged typography.
The native guard predicted 50 for the retained plan. This was an initial-plan
regression, not an unexplained codec discrepancy.

The fix retains the internal pre-adaptation grammar as optional plan metadata.
Before the unchanged 32→8→3 search, only unlocked phrases whose motion was
actually reduced are compared at the requested delivery raster. An adaptation
must retain the legacy global minimum and already-readable sample intervals.
Otherwise the internal legacy grammar becomes the baseline. Unknown evidence
cannot justify the adaptation. Manual locks are excluded; cancellation restores
the original plan; storyboard and grammar metadata follow the selected state.
The plan is still independently encoded and decoded before quality is accepted.
There is no call to another repository or older website.

Focused real-output controls restored case-12 to 54 and case-22 to 39. The
pre-adaptation guard adds measurable work and is included in the new total,
search, Stage A and nested profiles, rather than hidden from performance costs.
Its result is retained as `compositionSearch.initialGrammarProtection`.
Compared with PR #5, an individual minimum can still be lower when a change
would lose an already-readable interval; all such paired deltas must be reported.

## Remaining dense-phrase regression — release blocker

Case-23 remains below main: decoded localContrast 43 → 31 (PR #5 is also 31).
Its short/dense phrases leave the proxy creative lower-tail unmeasured. The
initial V3 baseline is not the same as the legacy engine's selected candidate.
No eligible Stage C finalist therefore falls back to the initial draft. This
is an observed remaining regression, not a passing case.

Controlled, **unadopted** experiments compared a readability-only draft and
legacy motion persistence. A different composition reached Canvas minimum
41/43, but two already-strong samples fell from 100 to 99. The protective rule
rejected it; it was not independently measured as a completed final MP4.
Removing that protection or filling the unknown lower-tail would manufacture
acceptance. The experiment-only source was removed and the adopted runtime
restored byte-for-byte to the frozen measured build.

A follow-up needs the legacy engine's selected internal candidate (not merely
its initial grammar) connected to final decoded comparison, with a local
readability repair that preserves the other strong intervals. Until this is
proven, readability acceptance is PARTIAL and this PR must not be released.

The historical 84 → 80 contrast medians include four repeat trials: 22 measured
observations among 28 exports. Across the 24 distinct inputs, 18 have this
metric and the historical medians are 63 → 57.5. Both populations are reported;
repeat trials must not be presented as additional distinct material. Missing
contrast observations remain missing. This is a cohort distinction, not a
changed formula or lowered threshold.

## Final automated acceptance

`npm ci`, `npm run test` and `npm run build` pass. The complete working-tree and
independent clean-restore suites each have **185 tests: 183 PASS, 0 FAIL, 2 SKIP**.
The two environment skips (`variable_font_browser_test.js`,
`browser_export_e2e_test.js`) remain skips; the separately executed shipping
browser suite is not counted as a replacement PASS for them. Native browser,
real MP4 and recovery checks below are independently PASS.

**186 positive exported artifacts** receive ffprobe H.264/AAC checks and full
FFmpeg decode: 168 original-matrix exports, 16 additional-matrix exports,
one selected shipping-UI artifact and one native-cancellation retry. Of these,
66 use the hardening engine. A genuine-black negative control is separate.
The 14 successful exports preceding the earlier manual-fixture error and all
other development ablations are excluded from this acceptance count, with
records preserved. The generated synthetic engine-quality snapshot is retained
outside Git; the pre-existing tracked snapshot is restored, not substituted
for decoded-video evidence.

See [acceptance.json](qa/cinema-v3/release-hardening/acceptance.json),
[tests.json](qa/cinema-v3/release-hardening/tests.json) and
[browser-export.json](qa/cinema-v3/release-hardening/browser-export.json).

## Shipping browser and real recovery checks

The frozen adopted runtime passed all ten shipping UI checks: actual uploads,
TXT/LRC timing, audio analysis, generation, playback, local save/restore,
regeneration and download. The selected 1280×720 / 24fps MP4 contains H.264/AAC,
216 frames and 9.024 seconds; ffprobe, AV-track endpoints and complete FFmpeg
decode pass with zero page/resource errors. The UI uses formal Draft Export.
Four real refinement attempts record initial draft, two verified improvements
and a protected regression rejection; the final `BUDGET_EXHAUSTED` artifact
retains the best verified video/plan/QA/hash instead of the rejected last one.
Only the selected UI artifact is counted as one FFmpeg-verified export.

Two independent-decoder controls recover an injected native Canvas black-paint
failure using the actual valid UI MP4, and reject a genuinely black H.264 control
under unchanged thresholds. They do not explain the historical lost-Blob
failure. Native cancellation after frame submission closes every tracked encoder
and frame, restores the plan **and explicitly serialized pixel QA/quality target**,
and preserves glyph resource policy. Ordinary canonical plan hashes exclude QA,
so that test adds QA separately. The following real H.264/AAC retry passes full
decode. A native ImageBitmap guard probe confirms owned 640×360 bitmaps close to
0×0. No peak-memory reduction is inferred from closure.

The existing actual-FFmpeg proxy test originally checked repair pixels at fixed
4.8 seconds, outside the newly measured weakest HOLD. Observed weak line 0 has
score 46 at 1.4–2.8 seconds, while line 1 at 3.4–4.8 scores 100 and is untouched.
Its corrected test supplies actual frame timestamps, selects the measured weak
HOLD, asserts that repair targets that line, and verifies changed production
pixels inside it. Full authoritative lyric-onset checks are retained. The initial
failed clean-restore test and its logs remain preserved; this correction changes
neither the frozen production runtime nor quality thresholds.

## P95 profile

Stage boundaries are wall times, including their nested work. Each stage has 46 measured architecture-search trials per build; absent stage events are not imputed. Stage A includes the added initial-grammar protection.

| Stage | Main P50/P95 ms | PR #5 P50/P95 ms | Hardening P50/P95 ms |
| --- | ---: | ---: | ---: |
| A | 1,132.8 / 1,537.0 | 1,177.2 / 1,753.4 | 1,532.7 / 2,671.6 |
| B | 1,213.9 / 4,969.2 | 1,605.1 / 5,095.1 | 1,550.0 / 5,105.9 |
| C | 3,144.3 / 8,619.2 | 3,109.5 / 8,246.1 | 2,027.2 / 5,806.1 |

Hardening inclusive function totals below must not be summed with parent stages. No new cache is introduced.

| Function / residual | Trials measured | P50 ms | P95 ms |
| --- | ---: | ---: | ---: |
| analyzeAudio | 56 | 52.6 | 101.1 |
| plan | 56 | 35.9 | 45.4 |
| ensureFonts | 56 | 700.1 | 919.3 |
| renderer_loadCustomBackground | 56 | 237.2 | 354.7 |
| renderer_loadAssetDeck | 56 | 120.1 | 194.6 |
| initialGrammarProtection | 46 | 479.5 | 1,294.4 |
| rankCinemaCandidateV2 | 46 | 0.8 | 1.1 |
| encodeCinemaVisualProxy | 46 | 438.1 | 1,327.7 |
| measureCinemaOutputReadability | 42 | 1,024.4 | 2,799.2 |
| observeExportedMP4 | 56 | 813.0 | 2,037.1 |
| certifyExport | 56 | 37.7 | 59.9 |
| Final encoder callback residual | 56 | 536.3 | 1,291.1 |

The residual is callback time minus nested certification and decoded QA; it includes preparation/rendering/codec drain/muxing/provenance overhead and is not isolated hardware encoding. Matrix saving is outside its timed export. The real UI separately reports download persistence wall time, which does not measure native File System Access picker duration. Full per-case profiling and call counts remain in JSON.

## Additional generalized cohort

All 64 hardening exports in the original and additional matrix cohorts retain `UNREPAIRABLE` (Draft) state under the one-full-encode test budget. The measured creative-minimum flag is false for 54 exports and unmeasured for 10; these are successful technical exports, not creative qualification or readiness to publish. The shipping UI validates formal Draft Export separately.

Eight separate paired inputs cover dark/bright backgrounds, high-frequency
texture, geometric multiple-person silhouettes, text in the background, dense
mixed lyrics, a long HOLD and manually fixed typography/camera. All 16 real
H.264/AAC MP4s passed complete decode. Contrast before/after is 36/36, 42/44,
63/63, 36/36, 66/68, 27/27, 78/78 and **49/48** respectively. The manual case
retains two genuinely locked cuts, their registered `stillCamera`, and the
fixed font/alignment/width; nevertheless its one-point decoded contrast loss
is an additional unresolved regression, not waived as noise. Its causal
attribution remains unmeasured. The original-24 release blocker and this extra
regression are reported separately. These eight inputs do not replace the
original performance cohort.

A first run failed two pre-encode assertions because the fixture expected the
legacy `hold` camera alias after the shipping planner had normalized it to
`stillCamera`. Both failed rows and the preceding 14 successful exports are
preserved under `manual-fixture-failed-run.json.gz`. The test now requests and
asserts the registered camera name; all eight pairs were rerun in a new folder.
This development fixture error changed neither the original 24 inputs nor the
frozen production runtime. It is not recorded as an encoding success.

## Historical certification failure

The earlier 3.0.0 case-07 native certification failure occurred before a
successful retry. The initial failed Blob was not retained. Its cause remains
UNRESOLVED; later successful exports and injected native-black recovery controls
cannot identify the original failure. Existing certification checks, true-black
rejection and independent decoder recovery remain in place. The matrix retains
future failed certification Blobs and failure history, including full-decode
results, rather than dropping failed attempts.

## Release checklist (requires a later explicit instruction)

1. Review the dependency chain: #1 Foundation → #2 Candidate Selection →
   #3 Closed-loop Repair → #4 Adaptive Scene Grammar → #5 Quality/Performance
   → #6 Release Hardening. Do not merge #6 directly into main.
2. Fetch main and every PR head; verify reviews and CI for those exact SHAs.
   Recheck conflicts in each stacked dependency before proceeding in order.
   After each predecessor is merged, retarget the next PR to main and obtain
   fresh CI against that new base; do not merge successors only into obsolete
   feature branches. Keep the existing PRs and branch histories intact.
3. Resolve changes on feature branches without deleting/recreating or force
   pushing the existing five PRs. Re-run engine, build and real UI/MP4 checks
   whenever a conflict resolution changes runtime code.
4. Obtain human ratings and address remaining quality targets before claiming
   creative release readiness. Technical draft export and creative acceptance
   are different results.
5. Confirm the Pages workflow still uploads/deploys only from main, with
   permissions, licenses, font notices and standalone layout preserved. PR CI
   must show deployment skipped.
6. Only after authorization, merge in dependency order, confirm main Actions,
   then run production upload/restore/playback/export E2E with H.264/AAC/full
   decode and TLS verification. Compare delivered build/hash with the approved
   revision and inspect resource failures.
7. Recovery: retain the currently working main SHA and deployed artifact;
   revert the authorized release commits using ordinary history and rerun the
   same workflow/E2E. Do not rewrite old branches or silently accept invalid
   encodes. No production recovery/deployment action was executed here.
