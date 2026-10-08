# Cinema V3 implementation status

基準: `ef829f93a933794c337bf1a37c39fcfb8d4de0f4`。2026-10-08のfetchでmainと一致。
設計書: ユーザー添付「KAMEN_v2.0.26_汎用歌詞MV品質改善_詳細設計書.md」全文確認。
本作業の許可範囲はfeature branchのコミットとPRまで。mainへのpush、マージ、リリース、本番デプロイは行わない。

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
| FR-01 入力モード | planner / multi-image / single-image | adapters; real upload/export matrix | 既存、追加検証待ち |
| FR-02 信頼度付き適応 | auto_direction / localMusic / story | Phase 4 normalized features/grammar tests | 未完了 |
| FR-03 意図的静止・反復 | observed_quality intentionalHold | Phase 2 applicability / Phase 4 policies | 未完了 |
| FR-04 手動編集保護 | photoChoreographyLocked / overrides | snapshot + repair invariants tests | 基盤実装、修復統合待ち |
| FR-05 PCM/LRC/range不変 | authoritative input / audioHash | full PCM SHA256, LRC/settings/profile snapshot | 基盤実装 |
| FR-06 独立レンダー/MP4 | video_search / observeExportedMP4 | Phase 2 hierarchy / Phase 3 verified repair | 未完了 |
| FR-07 不足の説明/下書き | quality target / Draft UI | retained QA and repair history | 既存、追加検証待ち |
| FR-08 ブラウザー内処理 | local codecs / canvas | no new network/media transport | 維持 |
| FR-09 比率別検証 | actual output geometry | profile identity; real aspect exports | 契約実装、実動画待ち |
| FR-10 決定論 | content seed / registry keys | canonical hashes + stable selection tests | 基盤実装、選抜待ち |
| NFR memory/budget | bounded candidates / encoder queue | Phase 3 budget; unknown memory explicit | 未完了 |
| NFR cancellation cleanup | finally encoder/frame/renderer/decoder cleanup | Phase 3 failure/cancel tests | 既存、追加検証待ち |
| NFR same preview/export plan | render plan / provenance | working/confirmed separation + hash binding | 基盤実装 |
| NFR old project/LRC/ZIP/MP4 | migration/save pipeline | old formats and E2E regression | 追加検証待ち |
| P0-A 階層選抜 | encoded.score selection | PR-2 | 未完了 |
| P0-B 完成動画修復 | refinePhotoExport / plateau | PR-3 | 未完了 |
| P0-C ラップ/状態 | sorted build / J wrappers | PR-1 manifest, boundary identity audit, contracts | 完了: 181 suites / 179 PASS / 0 FAIL / 2 SKIP、実MP4 E2E 10 PASS |
| P1-A grammar | story/temporal architecture | PR-4 | 未完了 |
| P1-B typography | compose/fit/safe/contrast | PR-4 pre-scene constraints | 未完了 |
| P1-C image conditions | intact image / asset deck | PR-4 capability and matrix | 未完了 |
| P1-D music/lyrics sync | onset/beat evidence | PR-4 confidence separation | 未完了 |
| P1-E output profiles | existing profile policy | PR-4 explicit contracts | 未完了 |
| P2 matrix/calibration/performance | dev QA suites | PR-5 | 未完了 |

## Phases

1. Foundation: explicit 84-entry manifest (83 unchanged modules + additive adapter); identity observations between modules; all nine contracts; immutable owned metadata and editable candidate copy; new tests registered. Existing 83 source bytes verified unchanged in `foundation-source-equivalence.json`.
2. Selection: pending.
3. Verified repair: pending.
4. Adaptive grammar: pending.
5. Quality/performance: pending. Human blind evaluation **未実施**。実評価者・実素材を捏造しない。

## Recovery and remaining work

各PRは前段をbaseとするstack。マージ順は1→2→3→4→5、追加承認後のみ。
内部の `J.cinemaV3.enabled` をfalseにする切り戻しと、個別PRの `git revert` を用意する。現時点ではadapter未呼び出しなので既存経路に変更なし。
一時`J.drawItem`差し替え、プロキシのサンプル不足、未知の端末メモリ、人間評価、全素材の美的改善は未証明。検証結果を得るまでSUCCESSとはしない。

Phase 1検証: 隔離コピーのnpm ci/test/build完了。NSS初期化のsandbox拒否を解消しTLS検証を維持したE2Eは外部リソース失敗0・ページ例外0。固定入力/3比率/15フレームのプランと画素は基準と完全一致。フォント取得に失敗した先行E2Eは同条件比較から除外し、成功したと偽装しない。
