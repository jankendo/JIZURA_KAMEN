# Cinema V5 本番公開結果

SUCCESS。TECHNICAL_GO / QUALITY_GO / RELEASE_GO は PASS。
main: `2e7ed477f88028dbb63aa609e8a11b4052ea8c00`。
[main CI](https://github.com/jankendo/JIZURA_KAMEN/actions/runs/38195073095) の回帰、ビルド、実ブラウザー、Pages artifact upload、Deploy は成功。

## 品質と証拠の範囲

事前固定した13組・26本の実MP4比較で、汎用修正により general-manual と independent-fixed の主歌詞欠落を修復。共通検証器の比較対象37ユニットは全件 MEASURED。手動設定を変更せず、既存の品質閾値・候補数・解像度・FPSを維持した。

自然選択演出の代表集合は3/12件を測定し、3/3件が実現。追加の成功UI実行すべてを含む母集団は33計画単位、出力内32件、測定3件（9.375%）、実現3/3件、理由付きUNMEASURED29件、出力範囲外NOT_APPLICABLE1件。反復UI入力も動画別に含む。強制演出と固定スタイル比較は成功根拠から除外。演出実現と美的優秀さは別の判定である。

未校正の旧スコア差、低い集約値、タイポグラフィ多様性指標の低下は原値を保持。同じ完成動画の再観測は実フレーム・ユニット単位で一致したが、異なる観測方式の旧集約値の根因は未解決。全素材でスコアが上がったとは認定しない。HUMAN_UNVERIFIED、芸術的100点未認定、ピークメモリUNMEASUREDを維持する。

## 技術・本番

最終mainの正式CIは193 PASS / 0 FAIL / 2 SKIP。SKIPの2件は別途実ブラウザーでPASSし、正式CIのSKIPと混同しない。完全デコード済みの採用対象は43個の異なるMP4 SHA-256（比較用V4の13本を含む）。異常動画と、最終QA側記録を欠いた過去の失敗UI動画は採用数に含めない。

[公開サイト](https://jankendo.github.io/JIZURA_KAMEN/) の8ファイルをHTTPSで取得し、承認mainビルドとSHA-256一致を確認。HTMLの一致は組み込まれたJS・CSS・フォント・設定全体を含む。公開ブラウザーが受信したHTMLのSHA-256も一致した。

公開サイトで実際に画像・音源・TXT/LRC入力、自動生成、プレビュー、保存・復元、復元後再生成、品質未達からのワンクリックMP4出力を実行し、10項目PASS。保存MP4はH.264/AAC、1280×720、24fps、216フレーム完全デコードPASS。最終歌詞4/4ユニットMEASURED、動画/計画/選択候補/プロファイル/レンダラー/mainの結合を確認。JS例外・リソース取得失敗0件。

MP4 SHA-256: `01cdb6b1b6afbc31f3de95f4789f8a70e40d1758bedd8deb9fb0cf12859e7b46`。
ブラウザーダウンロードのUI表示はSAVE_AVAILABLEを維持し、OSのネイティブ保存完了とは区別した。テストは実際のダウンロードをファイルへ保存し、保存後の実バイトを完全デコードした。

生成速度はユーザーの明示指示により公開の数値ゲートから除外。遅い場合があり、停止・破損とは区別する。今回P50/P95の新測定は実施していない。

## 追跡・復旧

機械可読の正本は `production-e2e-2e7ed47.json`、`accepted-mp4-census-final-main-2e7ed47.json`、`natural-direction-census-final-main-2e7ed47.json` と上位の `final-gates.json`。実MP4、入力、QA、保存プロジェクト、処理状態、配信応答をSHA付きアーカイブへ保存した。CI失敗と修復成功は別々に保持。

旧mainは `5ea7d953f1720654521a2cd9d800706d40f40c49`、復旧タグは `kamen-cinema-v5-pre-release-20261011`。重大な本番不具合時はmainから復旧ブランチを作り、merge commit `2e7ed47` と `7ec4323` を逆順に通常のrevertで戻し、CI合格後に復旧PRを統合・再デプロイする。履歴破壊やforce pushは使用しない。
