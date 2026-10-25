# KAMEN（仮面）

KAMEN **v2.2.0** は、背景画像・音源・LRC／TXTから日本語歌詞MVを制作するブラウザーアプリです。新規MVには本家 **[JIZURA v0.10.1](https://github.com/852wa/JIZURA/tree/fc16bfe43ea4a6c25a21f1caf04d17326de14f00)** のおまかせ・プランナー・レンダラーを使用します。文字PV・キネティック・ホラーの演出とテーマ選択を利用できます。

公開先: [GitHub Pages](https://jankendo.github.io/JIZURA_KAMEN/)（この変更はPR段階では未公開です）。元作品はhakoniwa / 852wa/JIZURA、MITライセンスです。

背景画像・音源・歌詞を読み込み、「本家JIZURAで生成」を押します。独自の候補探索・最適化は新規生成と標準書き出しには使用しません。演出品質は参考情報で、スコアによる保存制限はありません。MP4の映像・音声・尺・フレーム数・出力設定と実デコードを検査してから、保存リンクを表示します。

旧保存データは従来のKAMEN経路で読み込み、開くだけでは本家方式へ変換しません。「本家JIZURAで再生成」を明示的に実行すると切り替わります。元データを残す場合は、先にプロジェクトファイルを保存してください。制作・素材処理はブラウザー内で行います。

MP4はMediabunnyのストリーム出力と分割メモリ書き込みへ移行しました。音声AACの代替処理、ソフトウェアH.264への再試行、中止・再実行に対応します。メモリ消費は動画容量に応じて増えるため、大きすぎる動画では範囲・解像度を下げてください。Windows／macOSのChrome／Edgeを優先し、今回の自動実測環境はLinuxのChromeです。

変更内容・テスト・互換性・既知の制約は [更新記録](docs/UPSTREAM_0_10_1.md) を参照してください。

## v2.2.0の修正

別タブを開くだけで生成に失敗する保存競合を修正しました。実際に同じ作業が別タブで編集された場合は、生成結果と素材を別の作業として保存します。「保存した作業」で切り替えられます。保存容量が足りなくても生成結果は残り、プロジェクト保存・MP4書き出し・保存の再試行ができます。

旧KAMEN専用の最適化・別案・品質認定・画像解析・チャント・演出パック・AE書き出し・クレジット設定・補助動画追加のUIを撤去しました。既存MVは従来の描画経路で復元・書き出しできます。曲名・アーティストは本家のタイトル演出に使われます。[変更と検証](docs/WORKSPACES_2_2_0.md)、[保存仕様](docs/STORAGE.md)も参照してください。

## ローカル開発

Node.js **24**、npm、Python 3（一部の補助ツール用）を使用します。テストには FFmpeg / FFprobe が必要です。LinuxのブラウザーE2EにはChromeまたはChromiumを別途用意してください。

```bash
npm ci
npm run dev
```

`npm run dev` はビルド後に開発サーバーを起動します（127.0.0.1:5173）。本番ビルドと確認用サーバーは次の通りです。

```bash
npm run build
npm run preview
```

`npm run build` は `index.html` と `dist/index.html` を同じ内容で生成し、`dist/` にライセンス文書も同梱します。JS・CSS・ローカルフォント・AACフォールバックはHTMLに埋め込みます。`dist/` だけがPages公開対象です。`build.py` は旧JIZURA用の補助資産であり、KAMENの正式ビルドには使用しません。

## テスト

```bash
npm run test
KAMEN_CHROME=/path/to/chrome node dev/pages_e2e.cjs http://127.0.0.1:5173/ /tmp/kamen-qa
```

回帰テストの件数と結果は実行終了時に表示します。既存の可変フォント／ブラウザー証跡テスト2件は、実在する `JIZURA_BROWSER_QA_REPORT` を指定しないとSKIPになります。SKIPはPASSではありません。FFmpeg・FFprobe欠落によるSKIPにも注意してください。

`upstream_modernization_e2e.cjs` が現行方式の生成・MP4書き出し・保存復元を確認します。`pages_e2e.cjs` は旧方式の検証ツールです。旧ツールは自作の画像・音声・歌詞を作り、実際のUIで画像・音源・TXT・LRC読込、MV生成、再生、プロジェクト保存／復元、MP4書き出しを検証します。FFprobeで映像／音声、長さ、720p・24fpsを調べ、FFmpegでデコードします。出力先には素材・MP4・JSON・スクリーンショットが入るため、リポジトリ外を指定してください。URL引数には公開URLも指定できます。

E2Eはブラウザーの通常ダウンロード経路を検証するため、ネイティブ保存APIを提供しないプロファイルで実行します。ヘッドレスGoogle Chromeではネイティブ保存ピッカーがAbortErrorとなり、MP4の前処理前に中止されることを再現しました。KAMEN本体の保存処理・エンコーダー・QA条件は変更しません。`KAMEN_FILE_SAVE_MODE=native` で元のAPIを使用した診断も可能です。実際のOS保存ダイアログの操作は、このヘッドレスE2Eの検証範囲外です。

書き出し状態を5秒ごとに記録し、進捗停滞90秒／書き出し工程全体8分で停止します。品質未達時は実際の下書きボタンを操作し、技術的エラーと区別します。保存リンクが残る場合も実クリックします。成功・失敗のJSON、コンソール、状態履歴、スクリーンショット、Playwrightトレースを出力し、CIの検証アーティファクトに7日間保存します。

本家方式の新規MVでは演出品質を理由に保存を止めません。旧KAMEN経路の品質診断は互換性のため残しています。技術的に破損したMP4や不完全な音声は保存対象にしません。

既存の詳細なCanvas／MP4画素比較ハーネスは `dev/browser_export_e2e.cjs` と `dev/qa_browser_download.cjs` にあります。`KAMEN_QA_URL` でHTTP(S)の検証先を指定できます。過去の `docs/qa/`、`dev/*results.json` などは過去の記録であり、今回のテスト結果ではありません。

## GitHub Pages

`.github/workflows/build.yml` は Pull Requestと `main` へのpushで、Node.js 24、`npm ci`、回帰テスト、ビルド、ブラウザーUI／MP4検証を実行します。すべてが成功したときだけ `dist/` を公式Pages Actionsで `github-pages` environmentへデプロイします。Pull Requestは検証のみで本番デプロイしません。依存Actionsは公式の安定版コミットへ固定しています。

リポジトリの Settings → Pages の Source を **GitHub Actions** にします。`contents: read` は検証ジョブ、`pages: write` と `id-token: write` はデプロイジョブだけに付与しています。同時の本番デプロイは直列化します。canonicalと `og:url` は上記公開先で、外部Sitesを変更・更新する処理はありません。

将来の更新は作業ブランチで変更し、`npm ci`・ビルド・テスト・E2Eを実行してコミットし、PRのチェック成功後に通常のマージで `main` へ反映してください。Actions完了後、公開URLでもE2Eを再実行します。秘密情報、ZIP、`node_modules`、個人の素材はコミットしないでください。

不具合時は最後の正常コミットへ `git revert` するPRを作り、同じ検証を通して再デプロイします。移行前の状態は `backup/pre-kamen-migration-20261008-01` タグから参照できます。強制pushや履歴の再作成は不要です。Pages方式を変更する場合はGitHubの正規設定画面／APIで行います。

## ブラウザー・保存・プライバシー

最新のChrome／Edgeを推奨します。MP4はWebCodecsのH.264と音声AAC、またはアプリが用意する互換経路に依存します。ChromiumでもOS・ビルドにより対応が異なり、同梱AAC WASMフォールバックが使われる場合があります。HTTPSまたはlocalhostのセキュアコンテキストで使ってください。高解像度・長い曲はメモリと時間を多く使用します。

歌詞・画像・音源・制作・書き出しはブラウザー内で処理します。素材をアップロードするバックエンドはありません。プロジェクトや回復用データはブラウザーのローカル保存領域に残ることがあります。JSONバックアップの保存と、共有端末でのデータ管理は利用者が行ってください。必要な追加書体はGoogle Fontsへ取得リクエストを送ります。ローカルのNotoフォントはHTML内に同梱されています。詳細は [docs/STORAGE.md](docs/STORAGE.md) を参照してください。

## ライセンス

本体は [MIT / Copyright (c) 2026 hakoniwa](LICENSE)。フォントはSIL OFL、MP4 muxerはMIT、Mediabunny/AACパッケージはMPL-2.0、AAC内のFFmpegはLGPLです。[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と同梱ライセンスを確認してください。AAC上流の正確なFFmpegソース対応については通知内の未確認事項を残しています。作品に使う歌詞・曲・画像の権利は利用者側で確認してください。

## 旧KAMEN方式の開発記録

以下は旧方式の実装・過去の検証記録です。v2.2.0の標準生成経路の説明ではありません。

### Cinema V3 開発

段階的な改修と検証結果は [実装状況](docs/CINEMA_V3_IMPLEMENTATION_STATUS.md) を参照してください。ソース順は `scripts/source-manifest.json` で固定し、追加ファイル・欠落・順序変更はビルドで検出します。既存API・保存形式・品質閾値を維持し、未測定値はnullのまま扱います。美的100点は認定しません。

Cinema V3の検証手順・素材範囲・ブラインド比較・未測定項目・切り戻し: [docs/CINEMA_V3_VALIDATION.md](docs/CINEMA_V3_VALIDATION.md)。

## Song-Generated Visual Grammar v4

新規MVは音響特徴の自己類似性・反復・転換と、歌詞・背景画像から連続した文字構図、カメラ、クロップを生成します。固定アーキタイプ・4モード・Storyレシピの選択は新規生成に使用しません。旧プロジェクトの演出経路と保存データは保持します。

FAST CIはv4の4契約、既存v3互換性、出力UI、ビルド、1秒の合成素材によるChrome生成・保存復元を確認し、mainへのpush後にGitHub Pagesへ公開します。実装・検証範囲と制約は [v4 QAメモ](docs/qa/song-grammar-v4.md) を参照してください。長尺MP4の全フレーム品質と人間による芸術評価は今回の検証対象外です。
