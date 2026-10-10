# Cinema V3 final quality — PR #7

## PR #7 現行ビルドの最終検証: PARTIAL / NO-GO

現行ランタイム SHA-256 は `316c5cb224f670898f929bb6b2e1d3cca9b7ea9afdafd5f2c5a39bd94716a843`。main は `ef829f93a933794c337bf1a37c39fcfb8d4de0f4` のままで、集約リリースPR・マージ・本番デプロイは実施していない。以下を現行判定とし、後続の開発履歴にある「実行中」「未完了」はその時点の記録として読む。

元24素材＋4反復を各エンジン2回、追加8素材を各2回、独立6素材を各1回で比較し、計234本のH.264/AAC MP4がffprobe・FFmpeg完全デコード・入力PCM/LRC/画像/手動指定の記録済み不変性検査にPASSした。追加12本で同一Blobを各3回再観測し、独立エンコードと区別した。正式UI10項目、保存/復元、Draft Export、実WebCodecsキャンセル/再試行/復元、黒動画拒否と失敗Blob保持もPASS。全回帰試験は184 PASS / 0 FAIL / 2環境依存SKIP。SKIPをPASSへ書き換えていない。

可読性: 比較可能な元18素材の素材別中央値は main 63 → PR #7 94（従来の反復込み集計は84→94）。短文密集はmain 43 / PR #6 31 →68、手動ロック素材は49 / 48 →54を両反復で確認。元24素材の有限な全体指標でmain比後退は0件。一方、actual-time背景一致のフレーズ/時刻比較はmain比960点中1点で77→76。既存の高品質点（85以上）の測定済み比較に後退はないが、欠損/時刻不一致は合格に含めない。同一main Blobの観測値も77/76/77と変動したが、この事実だけでPR #7の1点差を解消済みとは扱わない。

| 元24素材＋4反復、各2試行（ms） | main | PR #6 | PR #7 |
| --- | ---: | ---: | ---: |
| Total P50 / P95 | 8,761.75 / 20,605.0 | 7,387.45 / 17,746.9 | 13,803.75 / 42,222.8 |
| Search P50 / P95 | 5,599.1 / 15,581.1 | 4,862.5 / 13,929.5 | 10,923.05 / 36,556.3 |
| Export P50 / P95 | 2,103.45 / 4,528.9 | 1,446.55 / 2,700.7 | 2,124.15 / 4,772.3 |
| 最遅Total | 55,309.8 | 54,974.7 | 129,729.4 |

速度目標は未達。混合素材P95だけではなく、素材ごとの2試行中央値で元24素材中22素材がmainより遅い。共有EPYCホスト、cgroup 4 CPU/32 GiB、Chrome154.0.8037.97 / Node24.19.0、固定入力・seed・24fps・解像度・音源/LRC・出力範囲、順序を入れ替えた試行。独占CPUではなく、素材ごと2試行からP95の精密な信頼区間や統計的有意差は主張しない。ピーク/GPUメモリとキャッシュヒット率はUNMEASURED。長時間素材では23回のnative可読性計測が約43秒、旧候補比較が約56秒だった。これらは入れ子の包括時間で足し合わせられない。品質を後退させた単一探索/候補間引き試作は不採用。

元24素材のhistorical localContrastは5素材がUNMEASURED（main/PR #6は6素材）。独立素材は2素材がUNMEASUREDで、うち短文素材はhistorical投影失敗とactual-time観測MEASUREDが併存する。既存のhistorical尺度を新観測で上書きしていない。旧経路のローカル最終候補を再利用したが、描画/観測修正により旧mainと候補IDが常に同一になる保証はない。短文密集の今回のmain最終候補ID15に対し、修正版ローカル旧経路の候補IDは12だった。同じ素材/seed/Profileの実MP4で品質を比較した結果として68を報告する。

リリース判定と根拠は [release-decision.json](qa/cinema-v3/final-quality/release-decision.json)、[final-benchmark-summary.json](qa/cinema-v3/final-quality/final-benchmark-summary.json)、[final-root-cause.json](qa/cinema-v3/final-quality/final-root-cause.json)、[final-missing-observations.json](qa/cinema-v3/final-quality/final-missing-observations.json)、[observer-reproducibility.json](qa/cinema-v3/final-quality/observer-reproducibility.json) に集約した。圧縮した元JSONのHashは [final-raw-manifest.json](qa/cinema-v3/final-quality/final-raw-manifest.json)、全比較は `final-comparison.json.gz`、長時間の包括プロファイルは [final-tail-profile.json](qa/cinema-v3/final-quality/final-tail-profile.json)。正式UIの実出力Hashは `completed-ui-export-test.json` と `completed-ui-report.json.gz` で追跡できる。

24組の匿名A/Bを現行動画で再生成し、別管理の回答キー、空CSV、評価HTML、集計スクリプトを用意した。実ChromiumでCSVダウンロード/BOM/改行/24組を確認した。人間の回答は0件で **HUMAN_EVALUATION_PENDING**。これだけをNO-GO理由にせず、可読性証拠の未解決と性能の重大な悪化を区別して判断する。過去の失われた認証失敗Blobは復元できず、原因はUNRESOLVED。

実装コミットの[CI](https://github.com/jankendo/JIZURA_KAMEN/actions/runs/38007951825)は成功・deploy SKIPPED。証拠追記HEADの[CI](https://github.com/jankendo/JIZURA_KAMEN/actions/runs/38011710649)は60分のジョブ上限でキャンセルされた。全試験を維持してbuildジョブの枠を120分に修正し、最終コミットの結果は [PR #7のchecks](https://github.com/jankendo/JIZURA_KAMEN/pull/7/checks) で確認する。品質閾値、候補数、12分のブラウザー試験枠、main/Pagesの公開条件は変更していない。

将来の公開は下記の[統合・復旧チェックリスト](qa/cinema-v3/final-quality/release-checklist.md)に従い、全ゲートがGOになった時だけ全stackを含む集約PRをmainへ一度だけmergeする。現在のNO-GOで公開は行わない。

## 開発履歴（過去時点の記録）

## Scope and current decision

This work starts at PR #6 `22d0a9270364bef43b1065740ad292f9d66e2ad1` and compares current main `ef829f93a933794c337bf1a37c39fcfb8d4de0f4`, PR #6 and the final-quality build. Existing PR #1–#6, historical measurements, original licenses and copyright remain intact. No ZIP reintegration is performed.

**Validation is in progress. There is no GO decision or deployment yet.** Human evaluation remains `HUMAN_EVALUATION_PENDING`. The current user instruction permits a `TECHNICAL_RELEASE` only after all mandatory technical gates pass; it does not establish human aesthetic improvement. Historical reports retain their original decisions.

## Root causes: observed facts versus interpretation

1. **Different candidate identities.** An initial V3 candidate is not the old search's final raster-ranked candidate. For structurally empty, non-intentional HOLD windows, the creative lower-tail cannot be measured. The existing generated candidate specifications and a pre-V3 planning snapshot allow the existing legacy ranking to be reused without a second candidate-generation tournament. Candidate identity alone was insufficient: reframing changed the long-loop climax from source time 0.2 s to 6.2 s. Retaining the pre-adaptation source climax restored main's actual legacy finalist 2 and its strong intervals. The earlier raster-only experiment used candidate 15; the shared B/C selection subsequently showed that the actual short/dense legacy finalist is 12. Candidate 15 remains an already encoded Stage C comparison candidate, not a substitute for the recorded legacy finalist. Both are measured through the same local engine and output profile; neither is automatically certified.
2. **Proxy versus final codec.** Experimental thin-shadow configurations improved Canvas measurements but did not consistently improve encoded contrast. These experiments are not proof of final quality. Historical and frame-aligned proxy values remain in the audit. Composition selection now protects each measured background-consistent actual-frame point against both incumbent and legacy roots using an explicitly separate method. The requested-time proxy cannot be substituted for this measurement. Independent final MP4 observations remain authoritative.
3. **Requested versus actual frame time.** The old observer compares a requested-time reference with a decoded earlier frame. A new observation records the actual decoder timestamp and uses that time for the reference. Historical `localContrast` is retained separately, without replacing its formula, cadence or missing values.
4. **LRC boundary versus drawing quantization.** In the long repeated-lyric fixture, export starts at 0.2 s but the absolute drawing clock previously rounded down to 0.166667 s, selecting the preceding intro. The first output frame omitted the active lyric. Drawing now clamps only this boundary crossing to the actual lyric start. This changes neither source PCM nor lyric timing. A no-entry-fade cut also displays its active content immediately.
5. **Observer applicability.** Five historical unmeasured inputs use no image or the multi-image route, outside the old single-image glyph observer. The new all-lyric observer includes manual locks. Insufficient opaque glyph cores/rings remain explicitly unmeasured; visible lyric presence and contrast are distinct observations.

The focused diagnostics measured short/dense final MP4 contrast 46 (main 43, PR #6 31), locked-material contrast 54 (main 49, PR #6 48), and formerly unmeasured long-loop contrast 66. These are development diagnostics, **not the full acceptance verdict**. The first original round had no global-minimum regression but exposed main-relative interval losses: short/dense first sample 61→46; long-loop samples 100→66 and 100→99. These invalidate a release claim. The original round and partially completed next round are preserved as development; validation must restart after a generic fix.

## Changes and safeguards

- Preserve pre-adaptation planning and source climax locally in a WeakMap; reuse existing generated candidate specifications and the local legacy selection path. Do not toggle the engine globally or call an old website.
- Compare native original and frame-aligned masks separately. Missing measurements never become 0 or 100.
- Try three existing local text/background separation recipes (thin edge, shadow alone, and local scrim) on unlocked weak phrases. Reuse one renderer and unchanged samples; reject any measured sample loss, and restore prior parameters on cancellation/error. Store repair parameters in the existing parameter signature.
- Protect each independently decoded phrase/time contrast, including weak intervals, rather than only a global minimum or strong intervals. Manual locks remain untouched.
- Reuse already-decoded frames where possible; close owned frames/renderers/bitmaps in new measurement scopes. No claim is made about peak process/GPU memory or cache-hit rate.
- Preserve the existing 32→8→3 stages, profile, final MP4 certification, Draft Export and old project format.

## Validation cohorts and methodology

The original 24 materials plus four same-input repeats are preserved. The additional eight generalized materials are separate. Six independent confirmation materials were specified before final validation and have not been used to select the repair algorithm; they cover brief/dense lyrics, manual locks, multiple images, long Japanese/English, quiet holds and text-bearing backgrounds. Independent materials must not be relabeled as original benchmark cases.

Three builds are tested with identical input, seed, FPS, resolution, audio, lyrics and range. Two original and two additional rounds reverse the variant order. Every successful export requires H.264/AAC, ffprobe and FFmpeg full decode. Source PCM, lyrics, image and manual settings are checked before and after export. Failed attempts are retained.

The raw runner name `pr5` is an alias for **PR #6** in this experiment. The final-quality summarizer labels it `pr6`; these results are not comparisons with PR #5. The post-export aligned diagnostic is applied consistently to all three builds and excluded from their timed export. Shipping PR #7's own final aligned QA is included in its export time.

P50/P95, trial counts, sample standard deviation, individual-case deltas and the slowest case must be reported. Shared-host CPU scheduling is uncontrolled. Inclusive profiler spans overlap and must not be added as independent phases. Unmeasured peak memory/cache ratios are not inferred from heap samples.

## Evidence and pending checks

New evidence belongs under `docs/qa/cinema-v3/final-quality/`; historical release-hardening data must not be overwritten. The first full original round used runtime `b0c27b5d92ba4c620386f5d57e403332e7e902caf37ad35e3030ab9aff185476`. It is now development evidence, because interval comparisons exposed regressions. No final acceptance runtime is frozen yet.

Pending: complete original/additional/independent comparisons, full automated suite, actual UI export/cancel/retry/decoder controls, PR #7 exact-HEAD CI and explicit release gate. The interrupted earlier development matrix is preserved separately and excluded from acceptance.

## Remaining uncertainty

The historical 3.0.0 certification failure remains **UNRESOLVED**: its failing Blob was not preserved, so later successful decoder controls cannot prove its cause fixed. New failure retention and controls are evaluated independently. No human ratings have been collected. Synthetic short clips do not establish full-song artistic quality or universal recognition accuracy.

## Conditional release and rollback

Only a verified GO permits creating an aggregate release branch/PR containing PR #1–#7 and current main. CI and browser checks must pass on its exact HEAD; Pages deployment must be skipped for PR events. Preserve a unique backup tag and the pre-merge main SHA/production HTML. Merge the single aggregate PR using a merge commit to avoid publishing intermediate stacked versions.

After main Actions/Pages deployment, verify HTTPS production, the approved HTML hash and real UI export including full MP4 decode. A critical production failure requires a normal-history revert and verification of the restored production state. No force push, reset or tag overwrite is permitted. NO-GO preserves main and production and leaves PR #7 reviewable.

## Release checklist for the whole stack

| Gate | Required evidence | Current state |
| --- | --- | --- |
| Exact final-quality source | Built HTML hash, original/additional/independent MP4 comparisons | IN_PROGRESS |
| Readability | No known main regression; locked input and every comparable protected interval reviewed | IN_PROGRESS |
| Technical media | H.264/AAC, full decode, source invariants, QA/plan/video hashes | IN_PROGRESS |
| Compatibility and recovery | UI TXT/LRC, media, generation, preview, save/restore, Draft Export, cancel/retry/best restoration | PENDING |
| Automated checks | `npm ci`, full `npm run test`, `npm run build`, browser controls | IN_PROGRESS |
| PR #7 CI | Exact final commit, build successful, Pages skipped | PENDING |
| Stack inclusion | Ancestry checks for all PR #1–#7 HEADs and current main | PENDING |
| Release candidate | Aggregate main PR, exact-HEAD CI and browser evidence | PENDING |
| Rights and deployment files | Original license/copyright, OFL/notices, Pages configuration preserved | PENDING_FINAL_CHECK |
| Recovery | Unique backup tag, pre-merge main SHA, previous production HTML hash | SHA/HTML_RECORDED; TAG_ONLY_IF_GO |
| Production | Main Actions/Pages success, approved hash, actual HTTPS UI/MP4 E2E | NOT_DEPLOYED |
| Human evaluation | Anonymous updated pairs and empty responses; no invented preference | HUMAN_EVALUATION_PENDING |

PR dependency chain remains `main ← foundation (#1) ← selection (#2) ← repair (#3) ← grammar (#4) ← quality (#5) ← release-hardening (#6) ← final-quality (#7)`. The conditional release operation uses one aggregate main PR containing the entire ancestry, rather than publishing each stacked PR separately. Existing PR review states are recorded independently of their code being present in the aggregate ancestry.

## Subsequent root-cause discovery

After the onset correction, legacy raster candidates were all rejected on the short/dense input. Their minimum-duration internal cuts overlap the next authoritative LRC onset. Raster safety sampled beyond the actually active phrase and compared the next text with the preceding text. The former quantization happened to mask that mismatch. Raster safety now samples each cut only until the next cut onset, retaining the same safety requirement and leaving input/stored cut timing unchanged. This changes preselection sampling explicitly; it does not rewrite historical final-MP4 contrast. Renderer-owned custom background Bitmaps in this raster scope are also closed in `finally`.

The next experiment keeps the existing generated states for legacy comparison, retains only the top safe legacy raster plan, measures bounded local repairs, and tests a phrase composition only when dual native evidence dominates the incumbent phrase at every comparable time. The complete composed plan is measured again before encoded proxy checks. Native evidence still cannot certify the final MP4. Experimental time-local, ink and size operators did not establish a protected improvement and were removed from product code. Their failed development trials remain in the investigation history. These changes are not accepted as quality improvements until actual exports confirm them.

## Later focused evidence (not acceptance)

The source-climax experiment produced real H.264/AAC MP4s with full FFmpeg decode: short/dense 55 (main 43, PR #6 31), long-loop 75 (historical main global metric unmeasured). All comparable main phrase/time points in these two experiments were retained or improved. PR #6 still had protected intervals 100→99 on short/dense and 99→88 on the long-loop final phrase. These differences remain release blockers. Native composition starts from the repaired legacy finalist and falls back to it if the composed plan loses any legacy sample. Exact input/plan/profile/method identities are required for native measurement cache reuse.

A cache experiment exposed an undefined saved-state reference after changing shared candidates to specifications. Both focused attempts failed before export; their results are retained under `cache-probe`. The reference now uses the reconstructed plan. Unit tests cover cache invalidation and rollback, but do not substitute for actual MP4 reruns.

### 継続調査：最終候補と区間保護（開発中）

`development-finalist-comparisons.json` に27件の開発試行を記録した。影のみの追加修復では、case-18の最終localContrast 55という後退を解消できなかった。短文素材でも、全体最小値が改善する一方、一部の十分に読めていた区間が低下した。これらはリリース成功の証拠ではない。

現在の修正は、既存Stage Cで既にエンコードした安全な最終候補を比較に再利用する。創作品質lower-tailの欠損は維持し、候補を自動合格させない。採用時は既存候補の全測定済み区間を保護し、全体最小値だけによる採用を禁止する。低メモリ環境では既存budgetPolicyを共有する。追加時刻の観測は従来cadenceの集計と分離し、キャッシュには背景参照方式と時刻集合を含める。

単体試験、既存240組の差分試験、ビルドは成功した。修正版の実MP4回帰試験は実行中であり、元24素材・追加8素材・独立素材の最終受入試験、GitHub CI、本番検証は未完了。現在の判定はNO-GOで、mainと本番は変更していない。

The subsequent early-exit fix measured case-18 at **86**, using already encoded finalist 22 for protected phrase composition. The original legacy-selected candidate remains recorded independently. This is a single development export, not a completed corpus or release acceptance result. The four-case preceding trial measured case-02 63, case-18 55, case-23 46, and manual 54; its early exit prevented comparison of the alternative finalist for case-18. Full original-cohort comparison is now running with runtime SHA-256 `903ae8a5012e36ff5ae60171eb1f27cd5896f348506ab5805d4f947e923182fa`.

## Latest development experiments (not release acceptance)

The complete original control cohort (`903f` runtime; 84 H.264/AAC exports) still exposed an actual-frame long-loop regression. Reusing renderer assets alone did not remove the dominant duplicated rendering/decoding cost. An optional-finalist pruning experiment was rejected: one good material fell from 99 to 90. All already encoded Stage C finalists therefore remain eligible for physical comparison.

The subsequent physical-composition prototype (`bf86849bc7896153210445cba5fa5ad9a98688578c07b1d6bde362ccd6cc0f21`) produced four independently fully decoded MP4s. Short/dense historical contrast was 68, locked-material contrast 54, and the long-loop actual-frame background-consistent minimum was 100. Its historical long-loop contrast remained 49: these are distinct measurements, not an overwritten score or human aesthetic rating. The former long-loop loss at 7.7 s improved from 66 to 100 in the actual-frame diagnostic. Processing reached 161,474 ms for that material, so this prototype does not establish acceptable tail latency.

Native composition comparisons now offer a separately identified physical-only reference path. It omits unused requested-time reference renders and explicitly leaves those proxy values `UNMEASURED`; it retains the same actual-frame glyph/background formula and timestamps. Default historical measurement and final independent MP4 QA remain enabled. The shipping decoded QA additionally measures the union of protected native timestamps, rather than losing intervals when composition changes a hook time. Its evidence is bound to the actual video hash. Full cohort and latency verification of the latest build are pending.

Post-encode certification failures now retain one bounded diagnostic artifact in `J.lastFailedExportArtifact` and attach it to the original thrown error. It includes the completed Blob, available video/plan hashes, failed inspection and failure stage. This does not return success, overwrite the best verified artifact or certify the historical lost-Blob failure. Controlled wrapper unit checks pass; real-browser failure retention remains pending.

The latest frozen shipping validation runtime is `316c5cb224f670898f929bb6b2e1d3cca9b7ea9afdafd5f2c5a39bd94716a843`. Its running/queued checks are tracked by `docs/qa/cinema-v3/final-quality/current-validation.json`. Earlier `acceptance.json` remains the decision of its recorded development prototype, not approval of this build. The completed physical-only development probe has five PASS exports with historical contrast 99 / 86 / 68 / 49 / 54. Its long-case runtime was 133,409 ms. The locked-text diagnostic minimum of zero is retained and cannot be relabeled as a high-quality scene merely because the manually specified attributes are preserved.

The first full-suite run exposed a constructor-less Renderer compatibility failure in the pre-existing background routing test (`this.grain is not iterable`). Lazy texture initialization now initializes its owned array/cache before use. The existing background test and new regression unit pass; the failed complete run remains evidence and must be followed by a full rerun. Acceptance matrices were paused before starting.

### Rejected single-core search experiment

A local prototype reused one legacy 32→8→3 tournament and compared bounded V3 counterparts, rather than performing two complete tournaments. It reduced development processing time, but a previously readable material fell from 99 to 89; a refined prototype still measured 90. Neither prototype was adopted. Measurements concurrent with the full suite are excluded from release timing conclusions. The first five-case prototype also changed metadata-only HTML during execution; its rows are not represented as one immutable acceptance build.

Instrumented comparison found matching requested/actual frame clocks and matching eroded glyph-core/ring counts. At 0.24 s the native contrast ratio was 3.0818 and the finished MP4 ratio 2.7901, producing scores 100 and 90 with the unchanged formula. Selected, copied and post-analysis cut parameters matched. Fifteen fresh-versus-borrowed Renderer comparisons produced no score differences. These observations reject the tested clock/cut-copy/renderer-scope hypotheses for this fixture; they do not establish the precise contribution of encoding conversion, compression or decoded resampling. Machine-readable paired evidence is in [rejected-single-core-diagnosis.json](qa/cinema-v3/final-quality/rejected-single-core-diagnosis.json). Native-only superiority cannot certify the finished video.

The existing two-tournament implementation remains the shipping candidate. Its final immutable cohorts, corrected full suite, actual UI export and CI must complete before release acceptance. Tail latency is still an open concern, not an achieved target.

### CI implementation evidence

The implementation commit `de4735f01c6c1571a4f20304586cf52467c9473a` passed [CI](https://github.com/jankendo/JIZURA_KAMEN/actions/runs/38007951825): 184 PASS, 0 FAIL, 2 environment-dependent SKIP; build and actual ten-check browser UI/MP4 smoke test passed; deployment was SKIPPED. Downloaded artifacts were independently rechecked locally: the UI export and cancellation retry contain H.264/AAC, and all three retained MP4 files, including the video-only black rejection control, fully decode in FFmpeg. Actual completed-black-Blob failure retention and native WebCodecs cancellation/closed resources/best state restoration/retry passed. This completes the earlier pending real-browser retention check without establishing the cause of the historical lost-Blob failure. Evidence: [ci-implementation-validation.json](qa/cinema-v3/final-quality/ci-implementation-validation.json).

The isolated clean-backup restore also completed its dependency installation, full suite (184 PASS / 0 FAIL / 2 SKIP) and build. The parent checkout suite, documentation HEAD CI and final frozen comparison cohorts remain separate pending checks; neither the CI smoke video nor the restored unit suite substitutes for corpus readability/performance acceptance.

### Direct pre-encode raster isolation

A further instrumented export of the rejected single-core prototype captured native and actual delivery RGBA pixels at the identical 640×360 profile and 5/24 s timestamp. One of 18 native captures exactly matched the actual pre-encode frame: all 691,200 RGB channels matched, maximum difference zero and identical pixel SHA-256. Nevertheless, the corresponding requested 0.24 s evidence measured native contrast 100 and independently decoded contrast 90. The loss is therefore downstream of the matching source raster for this fixture. A separate same-decoded-frame sampling control also found zero RGB difference between direct 384px VideoSample drawing and a 640px decoded RGBA canvas subsequently resized to 384px at all three tested times. Exact contributions from encoding/color conversion are not isolated; no codec setting or threshold was changed. Evidence and development-only instrumentation are preserved in [post-encode-divergence-diagnosis.json](qa/cinema-v3/final-quality/post-encode-divergence-diagnosis.json). The trial remains rejected, and no native score of 100 is described as finished-MP4 certification.
