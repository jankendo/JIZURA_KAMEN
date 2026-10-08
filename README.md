# KAMEN（仮面）

KAMEN **v2.0.26** は、背景画像・音源・LRC／TXT から日本語の歌詞MVを制作し、ブラウザー内でプレビュー・MP4書き出しを行う静的Webアプリです。添付された KAMEN ソースを、このフォークの既存Git履歴へ統合しています。

公開先: **https://jankendo.github.io/JIZURA_KAMEN/**（デプロイ状況は [Actions](https://github.com/jankendo/JIZURA_KAMEN/actions/workflows/build.yml) で確認してください）。

元作品は **hakoniwa / [852wa/JIZURA](https://github.com/852wa/JIZURA)** です。元のMITライセンスと著作権表示を保持しています。KAMENの背景画像・音源・歌詞の制作フローと品質検査は提供ZIPの実装を使用し、この移行ではUI・演出ロジック・タイミング・保存形式を変更していません。旧版の多言語ページと旧ブラウザーパックは現行アプリへ混在させていません。旧AE/CEPソースは参考資産として残していますが、今回のWebアプリ公開対象ではありません。

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

回帰テストは179ファイルを実行します。既存の可変フォント／ブラウザー証跡テスト2件は、実在する `JIZURA_BROWSER_QA_REPORT` を指定しないとSKIPになります。SKIPはPASSではありません。FFmpeg・FFprobe欠落によるSKIPにも注意してください。

`pages_e2e.cjs` は自作の画像・音声・歌詞を作り、実際のUIで画像・音源・TXT・LRC読込、MV生成、再生、プロジェクト保存／復元、MP4書き出しを検証します。FFprobeで映像／音声、長さ、720p・24fpsを調べ、FFmpegでデコードします。出力先には素材・MP4・JSON・スクリーンショットが入るため、リポジトリ外を指定してください。URL引数には公開URLも指定できます。

E2Eはブラウザーの通常ダウンロード経路を検証するため、ネイティブ保存APIを提供しないプロファイルで実行します。ヘッドレスGoogle Chromeではネイティブ保存ピッカーがAbortErrorとなり、MP4の前処理前に中止されることを再現しました。KAMEN本体の保存処理・エンコーダー・QA条件は変更しません。`KAMEN_FILE_SAVE_MODE=native` で元のAPIを使用した診断も可能です。実際のOS保存ダイアログの操作は、このヘッドレスE2Eの検証範囲外です。

書き出し状態を5秒ごとに記録し、進捗停滞90秒／書き出し工程全体8分で停止します。品質未達時は実際の下書きボタンを操作し、技術的エラーと区別します。保存リンクが残る場合も実クリックします。成功・失敗のJSON、コンソール、状態履歴、スクリーンショット、Playwrightトレースを出力し、CIの検証アーティファクトに7日間保存します。

作品がアプリ独自の品質目標に届かない場合、アプリは通常出力を止めて「品質未達のMP4を下書きとして保存」を提示します。E2Eはこの実際のUI分岐も操作し、未達理由をレポートに記録します。MP4が技術的に正常でも、作品品質の目標達成や100点認定とは別です。スコアや閾値は変更しません。

既存の詳細なCanvas／MP4画素比較ハーネスは `dev/browser_export_e2e.cjs` と `dev/qa_browser_download.cjs` にあります。`KAMEN_QA_URL` でHTTP(S)の検証先を指定できます。過去の `docs/qa/`、`dev/*results.json` などは過去の記録であり、今回のテスト結果ではありません。

## GitHub Pages

`.github/workflows/build.yml` は `main` へのpushと手動実行で、Node.js 24、`npm ci`、回帰テスト、ビルド、ブラウザーUI／MP4検証を実行します。すべてが成功したときだけ `dist/` を公式Pages Actionsで `github-pages` environmentへデプロイします。Pull Requestは検証のみで本番デプロイしません。依存Actionsは公式の安定版コミットへ固定しています。

リポジトリの Settings → Pages の Source を **GitHub Actions** にします。`contents: read` は検証ジョブ、`pages: write` と `id-token: write` はデプロイジョブだけに付与しています。同時の本番デプロイは直列化します。canonicalと `og:url` は上記公開先で、外部Sitesを変更・更新する処理はありません。

将来の更新は作業ブランチで変更し、`npm ci`・ビルド・テスト・E2Eを実行してコミットし、PRのチェック成功後に通常のマージで `main` へ反映してください。Actions完了後、公開URLでもE2Eを再実行します。秘密情報、ZIP、`node_modules`、個人の素材はコミットしないでください。

不具合時は最後の正常コミットへ `git revert` するPRを作り、同じ検証を通して再デプロイします。移行前の状態は `backup/pre-kamen-migration-20261008-01` タグから参照できます。強制pushや履歴の再作成は不要です。Pages方式を変更する場合はGitHubの正規設定画面／APIで行います。

## ブラウザー・保存・プライバシー

最新のChrome／Edgeを推奨します。MP4はWebCodecsのH.264と音声AAC、またはアプリが用意する互換経路に依存します。ChromiumでもOS・ビルドにより対応が異なり、同梱AAC WASMフォールバックが使われる場合があります。HTTPSまたはlocalhostのセキュアコンテキストで使ってください。高解像度・長い曲はメモリと時間を多く使用します。

歌詞・画像・音源・制作・書き出しはブラウザー内で処理します。素材をアップロードするバックエンドはありません。プロジェクトや回復用データはブラウザーのローカル保存領域に残ることがあります。JSONバックアップの保存と、共有端末でのデータ管理は利用者が行ってください。必要な追加書体はGoogle Fontsへ取得リクエストを送ります。ローカルのNotoフォントはHTML内に同梱されています。詳細は [docs/STORAGE.md](docs/STORAGE.md) を参照してください。

## ライセンス

本体は [MIT / Copyright (c) 2026 hakoniwa](LICENSE)。フォントはSIL OFL、MP4 muxerはMIT、Mediabunny/AACパッケージはMPL-2.0、AAC内のFFmpegはLGPLです。[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と同梱ライセンスを確認してください。AAC上流の正確なFFmpegソース対応については通知内の未確認事項を残しています。作品に使う歌詞・曲・画像の権利は利用者側で確認してください。

## Cinema V3 開発

段階的な改修と検証結果は [実装状況](docs/CINEMA_V3_IMPLEMENTATION_STATUS.md) を参照してください。ソース順は `scripts/source-manifest.json` で固定し、追加ファイル・欠落・順序変更はビルドで検出します。既存API・保存形式・品質閾値を維持し、未測定値はnullのまま扱います。美的100点は認定しません。

Cinema V3の検証手順・素材範囲・ブラインド比較・未測定項目・切り戻し: [docs/CINEMA_V3_VALIDATION.md](docs/CINEMA_V3_VALIDATION.md)。
