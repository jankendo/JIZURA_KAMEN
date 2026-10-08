# JIZURA Motion Director 8.0 — 検証結果

2026-09-30。最新Sitesソースを基準に既存のVanilla JavaScript構成を維持して改修。

## 実装

- Visual Assets（JPEG/PNG/WebP、1〜12枚、追加・削除・ドラッグ＆ドロップ）。旧customBgからの移行。
- ローカル色・エッジ・明度・配置特徴、近似画像判定、品質ゲート、役割・必須/除外/クライマックス指定。
- 章への適合、文字領域、画質、再利用負荷から画像を選択。最大3素材×2見せ方×2色処理に候補を限定。
- Storyboard、選定理由、未使用理由、画像ごとの切り取り、章の画像固定、再最適化時の固定保持。
- 共有パレット、カラー処理、文字主体の場面、縦型構図、SNSの1枚主体/クライマックス/最大4枚の構成。
- IndexedDB復元とポータブルJSON、画像履歴の参照保持、Undo/Redoの復元時履歴切断を修正。
- Semantic Registry統一、実画素のビート同期/LRC同期を別表示。未計測をnullとして扱う。
- Context v7、assetSemantics/preferredAssets、素材一覧・全画像・Storyboard・未使用/過剰利用情報のDirector Pack。
- 実画素の背景表示比較、切替前/ピーク/後の検査、48MiBの画像デコード上限、デコード解放、画像ごとの出力SHA256。
- 内部LLM/APIは不使用。Directorは手動ZIP/JSON方式。

## テスト

Tests **137/138 PASS、0 FAIL、1 SKIP**。

追加の24ケースと実画素/画像メモリ解放テストを含む。旧ブラウザ書き出し検査も実際の専用ブラウザ結果で再実行してPASS。変数フォントの専用実素材がないため1本は未実施。

Build PASS。
クリーン復元（npm ci → npm test → npm run build）PASS。
Single-image regression PASS。
Multi-image import（UIで3枚）PASS。
Legacy migration PASS。
12-image stress PASS。
Role/Crop/Scene Pin/Undo/Redo/保存復元 PASS。
390pxスマホ幅で横はみ出しなし PASS。

## 実MP4検証

1枚・3枚・12枚、および単一/複数画像の縦型SNS版をブラウザで生成。H.264/AAC・コンテナ検査・ブラウザ再読込・動画/計画ハッシュ照合PASS。保持画像量は48MiB以内。サンプルは**12秒の合成音楽・検証用画像・検証用歌詞**。ユーザーの既存音源を使った実素材評価ではない。

| 指標 | 3枚 FULL | 複数画像 SOCIAL |
|---|---:|---:|
| Used Assets | 2 / 3 | 自動選定 |
| AssetDirection | 84 | 81 |
| MultiImageCoherence | 67 | 88 |
| VisualWorld | 88 | 76 |
| SemanticReality | 未測定 | 未測定 |
| BeatSync | 75 | 50 |
| LyricSync | 50 | 33 |
| Creative | 76 | 81 |
| Social | 70 | 79 |
| Loop | 65（内部基準85未達） | 65（内部基準85未達） |
| Certified100 | NO | NO |

点数は工学的なProxy。ビート同期とLRC同期は実画素ピークとの一致率であり、歌唱との知覚的同期評価ではない。SemanticRealityは意味指示のない検証用プロジェクトなので未測定。

## 残る制限

- 顔・人物・ロゴ・群衆の意味認識は実装していない。ローカルのコントラスト/アルファ/構図特徴は推定に限る。意味はユーザーRoleと手動Directorで補う。
- AssetDirectionの適合成分はローカルProxyで、実際の被写体の意味・切り取りの完全性を保証しない。
- すべての高度な画像トランジション、奥行き分離、候補の完全な画素トーナメントを実装したという認定は行わない。
- 実素材のBefore/Afterと人による創作品質の校正は未実施。Certified100に到達したとは報告しない。
- 別の非公開Director Packの取得が自動承認レビューに拒否されたため、既存実素材による検証は実施していない。
- 端末全体のメモリはGlyph/Canvas/VideoEncoderも消費する。48MiBは追加画像Bitmapの保持上限。
