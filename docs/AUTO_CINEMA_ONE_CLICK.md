# Auto Cinema ワンクリックMP4 — 復旧記録

新環境は古いスナップショットで、前回の `codex/kamen-one-click-auto-cinema` と `/workspace/kamen-v4` が存在しなかった。Git状態は `work`、main `ef829f9`、変更なしだった。元の未コミットファイルを復元できたとは認定しない。作業記録に残った差分を最新PR #7 `cd9aa5acc451d4192024e089316cc88925adfab0` から新しい作業ブランチへ再構築する。旧PR・main・ライセンス・入力形式を保全する。

技術的に有効なMP4は、創作品質未達でも同じクリックから通常の保存へ進む。Draft承認の追加操作と、正常な動画の保存後に創作品質を理由に失敗とする処理を除去した。閾値、未測定値、修復履歴、音源・歌詞・手動ロックの保護は維持する。破損ファイルや出所不一致は既存の技術検証で拒否する。

ファイル状態 `PREPARING / ENCODING / VERIFYING / SAVE_AVAILABLE / SAVED / CANCELLED / FAILED_TECHNICAL` と創作品質 `TARGET_MET / BELOW_TARGET / UNMEASURED / NOT_APPLICABLE` を独立して記録する。ネイティブ write と close の成功だけを `SAVED` とし、保存リンクは `SAVE_AVAILABLE` とする。QAの既存フィールドを維持し、最終採用動画の `creativeState` とsidecarの `outputOutcome` を追加する。ユーザーによる保存キャンセルで自動ダウンロードしない。QA保存失敗は既に正常なMP4を失敗にしない。

復旧時の対象試験は `dev/kamen_export_ui_test.cjs` と `dev/one_click_save_test.cjs`。前回の全体試験数・動画数・速度測定は会話に記録があるが、新環境では元データが失われているため今回の検証結果として流用しない。今回の実測・CIは別の証拠として記録する。

前回の最遅130.9秒、フォント通信失敗、人間評価待ちは未解決履歴として保持する。全必須試験、正確なHEADのCI・実MP4、重大な性能悪化の解消が揃うまでは `NO-GO` とし、mainへマージ・本番デプロイしない。

## 再構築した重複削減

生成前後の inputHash と音楽解析が一致し、書き出し時もプラン参照・planHashが一致する場合だけ確定プランを初回preflightへ渡す。変更時は再計画する。代表画素と最終MP4のQAは省略しない。native観測では同一実フレームの画素・マスク・背景を共有し、requested-timeの指標は個別に保持する。scopeキャッシュはinputHash、planHash、Profile、全サンプル条件、texture、フォント状態、glyph解像度で照合し、最大16件。フォント読込中は再利用せず、終了時の不変性を確認して格納する。返却値は複製し、ヒット情報は非列挙として証拠のcanonical JSONを変えない。

`cinema_actual_frame_cache_test.cjs` は3アスペクト×2参照方式について、個別に新規描画した画素によるサンプルと共有後のサンプルを比較する。これはCanvasの等価性試験でありMP4品質測定ではない。実ブラウザー・素材比較と同じ結果として数えない。`font_loading_probe.cjs` は通常通信と意図的な外部通信障害を別コンテキストで観測し、外部フォント未取得をLOADEDとしないことを検証する。過去のネットワーク障害の原因特定とは区別する。
