ワンクリックMP4復旧作業は [AUTO_CINEMA_ONE_CLICK.md](AUTO_CINEMA_ONE_CLICK.md) を参照。過去の実測は保全し、今回の証拠と区別する。

# Cinema V3 implementation status

Latest final-quality work: [CINEMA_V3_FINAL_QUALITY.md](CINEMA_V3_FINAL_QUALITY.md), with separate evidence under `docs/qa/cinema-v3/final-quality/`. Validation and the conditional technical-release gate are in progress; no production deployment is approved by the evidence yet. Prior cohorts and decisions below remain historical.

基準: `ef829f93a933794c337bf1a37c39fcfb8d4de0f4`。2026-10-08のfetchでmainと一致。
設計書: ユーザー添付「KAMEN_v2.0.26_汎用歌詞MV品質改善_詳細設計書.md」全文確認。
本作業の許可範囲はfeature branchのコミットとPRまで。mainへのpush、マージ、リリース、本番デプロイは行わない。

## PR #6 release hardening

Latest work: [CINEMA_V3_RELEASE_HARDENING.md](CINEMA_V3_RELEASE_HARDENING.md). Delivery-raster readability protection, proxy decoded-time alignment, conservative baseline selection and equivalent extraction optimizations extend PR #5; the five preceding differences are not reimplemented. The original performance and failure history below remain historical, not the new acceptance result. Human evaluation is **HUMAN_EVALUATION_PENDING**.

## Baseline and execution audit

- Node 24、npmのlockfile、Canvas/Playwright、Chromium、FFmpegを再利用。外部AI・素材送信・追加依存なし。
- 基準の全回帰: **179 suites / 177 PASS / 0 FAIL / 2 SKIP**。SKIPは別途取得するブラウザー詳細証拠を要求する旧テスト2件。実UI E2Eは独立して実行し、SKIPを合格へ換算しない。
- 新規基準E2E: 画像/TXT/LRC/音源のアップロード、生成、再生、保存・復元、再生成、下書きMP4、ffprobeとFFmpeg完全デコードを完了。H.264/AAC、1280×720、24fps、216フレーム、映像9秒/AAC9.024秒。創作品質は基準未達のまま記録。
- 辞書順83 modules / 静的`J.*`代入761 sites。`plan`19、`checkMVQuality`20、`applyTypography5`14。台帳は `docs/qa/cinema-v3/baseline-source-audit.json`。一時差し替えも含む静的代入箇所であり、すべてを恒久ラッパーと呼ばない。
- 実呼び出し: `12_ui.runExport` → preflight → `analyzeRenderedFrames` → `11zzq.repairCinemaSequence` → 後続proxy/video search → `preparePhotoExport` → `exportMP4` → 既存`refinePhotoExport` → encoder → container/certification → `observeExportedMP4` → decoded layers/contrast/HOLD/beat/endpoints → quality target → repair/encode → provenance/sidecar → saveFile。
- 既存修復は既に完成MP4を再エンコードする。V3は重複実装せず、この入口の比較と復元を強化する。
- Canvas評価は128pxのRGB差・alpha・glyph安全性。Stage Bは320px/10fps HOLD block-flow。Stage Cは640px/10fps H.264、96px連続動作と320px文字/レイヤー観測。数値の単位を混ぜない。
- 完成MP4は96px連続デコード、384px文字コントラスト、160px強拍付近、AAC端点を独立観測。局所ブロックフローは3Dカメラ推定ではない。文字マスクはOCRではない。歌唱同期・意味理解・主題分離・人間の美的評価は未測定。
- `cinemaLowerTailScore`は同一score尺度の中央値と下位20%平均。`rank`のRGB距離との直接加算をV3に持ち込まない。既存の一次90/詳細80などは保持。
- `certified100`と旧JSONは維持し、`artistic100Established=false`。下書き分岐とヘッドレス保存ピッカー修正は維持。

## Requirement traceability

「既存」は全素材への達成保証ではない。段階の検証結果で更新する。

| Requirement | Existing path | V3 implementation / verification | Status |
|---|---|---|---|
| FR-01 入力モード | planner / multi-image / single-image | adapters; real upload/export matrix | 実装・実動画検証完了 |
| FR-02 信頼度付き適応 | auto_direction / localMusic / story | Phase 4 normalized features/grammar tests | 実装・専用試験完了 |
| FR-03 意図的静止・反復 | observed_quality intentionalHold | Phase 2 applicability / Phase 4 policies | 実装・専用試験完了 |
| FR-04 手動編集保護 | photoChoreographyLocked / overrides | snapshot + repair invariants tests | 実装・ロック修復拒否/入力不変試験完了 |
| FR-05 PCM/LRC/range不変 | authoritative input / audioHash | full PCM SHA256, LRC/settings/profile snapshot | 基盤実装 |
| FR-06 独立レンダー/MP4 | video_search / observeExportedMP4 | Phase 2 hierarchy / Phase 3 verified repair | 実装・専用試験完了 |
| FR-07 不足の説明/下書き | quality target / Draft UI | retained QA and repair history | 実装・実動画検証完了 |
| FR-08 ブラウザー内処理 | local codecs / canvas | no new network/media transport | 維持 |
| FR-09 比率別検証 | actual output geometry | profile identity; real aspect exports | 実装・3比率実MP4、4:5は契約試験のみ |
| FR-10 決定論 | content seed / registry keys | canonical hashes + stable selection tests | 実装・安定選抜/実動画5試行同一planHash |
| NFR memory/budget | bounded candidates / encoder queue | Phase 3 budget; unknown memory explicit | 実装・専用試験完了 |
| NFR cancellation cleanup | finally encoder/frame/renderer/decoder cleanup | Phase 3 failure/cancel tests | 実装・実動画検証完了 |
| NFR same preview/export plan | render plan / provenance | working/confirmed separation + hash binding | 基盤実装 |
| NFR old project/LRC/ZIP/MP4 | migration/save pipeline | old formats and E2E regression | 既存回帰・実UI保存復元完了 |
| P0-A 階層選抜 | encoded.score selection | PR-2: hierarchy/Pareto, evidence guards, baseline protection | 完了: 182 suites / 180 PASS / 0 FAIL / 2 SKIP、実MP4 E2E 10 PASS |
| P0-B 完成動画修復 | refinePhotoExport / plateau | PR-3: targeted operators, measured acceptance, complete rollback | 実装・状態/失敗/キャンセル試験完了、実MP4 E2E 10 PASS、実4回エンコードと後退棄却を確認 |
| P0-C ラップ/状態 | sorted build / J wrappers | PR-1 manifest, boundary identity audit, contracts | 完了: 181 suites / 179 PASS / 0 FAIL / 2 SKIP、実MP4 E2E 10 PASS |
| P1-A grammar | story/temporal architecture | PR-4: policies, roles, phases, confidence fallback | 実装・専用/旧試験・実MP4完了 |
| P1-B typography | compose/fit/safe/contrast | PR-4: pre-scene widths/duration/safe-area constraints | 実装、cmap全字形は未測定 |
| P1-C image conditions | intact image / asset deck | PR-4: input-mode/capability; PR-5 real MP4 matrix | 24種類実MP4完了、主題分離未提供 |
| P1-D music/lyrics sync | onset/beat evidence | PR-4: tempo confidence / normalized envelope | 実装、歌唱同期は未測定 |
| P1-E output profiles | existing profile policy | PR-4: exact aspect, explicit loop, actual range | 実装・3比率実MP4、4:5/芸術的ループは未証明 |
| P2 matrix/calibration/performance | dev QA suites | PR-5: real MP4 matrix, formal E2E, benchmark/review generation | 56実MP4/性能/比較資料完了、最終exact-head CIをPRで確認、人間評価未実施 |

## Phases

1. Foundation: explicit 84-entry manifest (83 unchanged modules + additive adapter); identity observations between modules; all nine contracts; immutable owned metadata and editable candidate copy; new tests registered. Existing 83 source bytes verified unchanged in `foundation-source-equivalence.json`.
2. Selection: 既存32→8→3の候補探索へ安全性・測定証拠・下位区間・可読性の階層/Pareto比較を統合。未知値はnull、単位/プロフィール/Hash不一致は拒否。高品質と既存raster rankを保護し、静止意図を扱う。実UI E2E 10 PASS、ページ例外0、外部リソース失敗0。全回帰の結果は後続の検証記録で確定する。
3. Verified repair: 既存refinePhotoExportを再利用。CREATED→PROXY_MEASURED→SELECTED→FULL_ENCODED→DECODED_QAの状態を記録し、同一入力・ロック・単位・出力条件の実測改善だけ採用。許可行のMICRO/ARCHITECTURE/GRAMMAR_RESETへ限定し、全plan/QA/hash/artifactを復元する。単体試験のBlobは実MP4と区別。非cinema描画は既存経路を維持し、独立cinema観測の適用不可を明示する。
4. Adaptive grammar: 既存plan/architecture/temporal/social入口を編集し、追加ラッパーなしで信頼度付きPCM特徴と歌詞密度/反復を統合。未知の歌唱同期/主題分離/cmapはUNMEASURED。低拍信頼度ではlyric_first、静止意図を維持。六段階phaseと文字組制約を記録し、アスペクトは実寸の最大公約数、ループは明示opt-in。全PCM/LRC/画像/手動設定は変更しない。専用メタモルフィック、既存grammar/contract/architecture、実UI MP4 E2E 10 PASS。
5. Quality/performance: 六つの指定試験を正式経路へ登録。実UI export/Hash/full decode、24素材+同一入力5試行、ブラインドA/B資料生成を実装。184-suite回帰は182 PASS / 0 FAIL / 2 SKIP。3.0.1描画の56実動画比較は全成功。最終追加ガードはexact-head CIで確認。 Human blind evaluation **未実施**。実評価者・実素材を捏造しない。

## Recovery and remaining work

各PRは前段をbaseとするstack。マージ順は1→2→3→4→5、追加承認後のみ。
内部の `J.cinemaV3.enabled` をfalseにする切り戻しと、個別PRの `git revert` を用意する。Phase 2以降は候補選抜で有効。false時は従来の選抜へ戻る。
一時`J.drawItem`差し替え、プロキシのサンプル不足、未知の端末メモリ、人間評価、全素材の美的改善は未証明。検証結果を得るまでSUCCESSとはしない。

Phase 1検証: 隔離コピーのnpm ci/test/build完了。NSS初期化のsandbox拒否を解消しTLS検証を維持したE2Eは外部リソース失敗0・ページ例外0。固定入力/3比率/15フレームのプランと画素は基準と完全一致。フォント取得に失敗した先行E2Eは同条件比較から除外し、成功したと偽装しない。

最終性能: total P50 11,530.8→10,940.45ms、P95 25,085.9→28,512.9ms。中央値改善・末尾遅延悪化を両方記録。人間評価、全cmap/字形、写真主題分離、歌唱同期、実低メモリ端末、peak memory/cache/render-onlyは未検証。3.0.0先行試行の認証失敗1件は原因未確定として保持。詳細はCINEMA_V3_VALIDATION.md。

## PR #7 final-quality status

Local legacy-finalist reuse, actual-frame/background-consistent native guards, protected final decoded timestamps/video Hash, selective local repair, deterministic procedural textures, shared raster resources, zero-duration lyric entrance and completed-failure Blob retention are implemented. Full suite: 184 PASS / 0 FAIL / 2 environment-dependent SKIP. 234 same-condition three-version exports and 12 same-Blob/independent-encode repeat exports completed technical validation; formal UI/cancel/retry/restore and black-video controls passed.

**PARTIAL / NO-GO**: short/dense 43→68 and manual 49→54 improved, but one main interval 77→76 is not resolved and original Total P95 20,605→42,222.8 ms misses the performance target. Missing historical metrics remain null. Rejected fast prototypes are preserved as evidence and excluded from product source. Latest commit CI must complete after the observed 60-minute job-budget cancellation is corrected. [Final-quality report](CINEMA_V3_FINAL_QUALITY.md) and its linked JSON are authoritative; no main merge or production deployment has occurred. HUMAN_EVALUATION_PENDING; historical lost-Blob certification cause UNRESOLVED.
