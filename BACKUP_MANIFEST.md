# JIZURA カスタム画像背景版 — Backup Manifest

最終更新: 2026-09-28 (UTC)

## 対象と構成

- Sites project: `appgprj_6ab4db82daec81918fbc3faf1c5e2d15`
- 変更前Sitesソース: version 21 / owner-onlyアクセスを維持
- 公開先: Sites static hosting (`dist/`)
- アーキテクチャ: vanilla JavaScript / HTML / CSS。React移行なし
- ローカル開発: Node.js 20以上（検証環境 Node 24）、ブラウザーで実行
- メインソース: `src/`, `app/`; 静的ビルド: `scripts/build.mjs`
- Browser版表現レジストリ: 708部品、24スタイル

## 含まれる機能

- カスタム画像背景、LRC取込み、Tap Sync、波形上の手動タイミング編集、ブラウザー内MP4書き出し
- Style Engine 2.0、Style Realization、DNA Reality、Camera Safe Area、Title readability、Export Studio
- 自動演出密度 CLEAN / STANDARD / HIGH_ENERGY / HYPER、Advanced上書き、注意予算
- 冒頭Hook、拍同期アクセント、語群単位の歌詞演出、反復進行、24スタイルのStyle Arc
- FULL MVと、LRC区間から作る12〜15秒SOCIAL HOOK
- 技術・創作・SNS品質の別採点、画面停滞・視覚新規性計測、ハード品質ゲート
- Advanced Director Bridge JSONの検証・適用

## 主な変更ファイル

| Path | 内容 |
|---|---|
| `src/08d_quality.js` | サンプルフレームの視覚新規性・停滞・時間差分析、描画boundsと品質スコア |
| `src/09_render.js` | Style Arc、背景トリミング／色処理、レイヤー描画 |
| `src/11s_hype_engine.js` | 密度判定、冒頭Hook、歌詞トークン、反復とSNS指標 |
| `src/11t_nextgen.js` | Style Arc、注意予算、Social Hook、Director Bridge、ドメイン別品質 |
| `src/12_ui.js`, `app/body.html`, `app/style.css` | Advanced評価、Style Arc、SOCIAL HOOK、Director Bridge UI |
| `scripts/run-tests.mjs`, `dev/*test.js` | 51件の回帰テスト |
| `dev/render_hype_samples.cjs` | 現行ソースでFULL/SOCIAL MP4生成と品質／ストリーム検査 |
| `README.md`, `CHANGELOG_JIZURA_2026-09-28.md`, `QA_REPORT_2026-09-28.md` | 起動・変更・QA記録 |

## 依存関係とSites依存

- アプリ本体のルートnpm依存はありません。`npm ci`, `npm run dev`, `npm run build`, `npm test` を利用します。
- Node.jsは `package.json` で `>=20 <26`。アプリは静的単一HTMLにビルドされます。
- MP4 muxerは `vendor/mp4-muxer.min.js` に含まれ、ライセンスは `vendor/LICENSE.mp4-muxer.txt` と `THIRD_PARTY_NOTICES.md` にあります。Google Fontsはオンライン時に使用し、オフライン時は端末フォントへフォールバックします。
- `.openai/hosting.json` はSites project IDと `dist/` を記録します。ローカル実行はSites APIや環境変数に依存しません。
- Sites Auto Lyrics Sync用Runtime/API capabilityはソースとhosting manifestにありません。Auto Lyrics Syncは未実装です。LRC / Tap Sync / 波形上の手動調整は継続します。

## バックアップファイル

- `JIZURA_COMPLETE_BACKUP_2026-09-28.zip`: 実行可能なソース、ビルド済みページ、開発テスト、AE/CEP資産、docs、LICENSE、README、CHANGELOG、QA、manifest、今回の代表サンプルを含みます。
- `JIZURA_SOURCE_BACKUP.zip`: ソース・ビルド設定・テスト・docs。`dist/`とビルド済みHTMLは含みません。
- `JIZURA_PRODUCTION_BUILD.zip`: `dist/index.html`、Sites static manifest、LICENSE、第三者ライセンス。
- `JIZURA_SAMPLE_OUTPUTS_2026-09-28.zip`: FULL/SOCIAL MP4、レンダーレポート、代表フレーム、コンタクトシート。

## 代表生成結果と既知の制約

- FULL MV: 57.408秒、1280×720、30fps、H.264 + AAC、41.8 MB。
- SOCIAL HOOK: 28.30–42.12秒、13.834秒、1280×720、30fps、H.264 + AAC、10.4 MB。
- 代表背景は一枚の静止画像です。動画の群衆・旗素材は自動生成しません。両サンプルは横16:9で、専用9:16 HYPE書き出しは未実装です。
- SOCIAL HOOKの自動候補には時刻付きLRCが必要です。
- この静的Sitesソース用の管理ブラウザープレビューRuntimeがないため、実ブラウザーE2EとWebCodecs操作は未実施です。Canvas rendererとFFmpegで実素材を再生成し、出力MP4を別途検査しています。
- ZIPにはGit履歴、Sites認証情報、Google Fontsキャッシュ、ユーザーごとのブラウザー保存領域は含みません。ユーザー音源・画像はアプリRuntime資産ではないため、サンプルMP4以外は同梱しません。

## 復元方法

1. ZIPを展開し、Complete Backupでは展開先、Source Backupではプロジェクトルートへ移動します。
2. Node.js 20以上で `npm ci` を実行します。
3. `npm run dev` で `http://127.0.0.1:5173/` を開きます。`npm run build` は `index.html` と `dist/index.html` を生成します。
4. `npm test` で回帰テストを実行します。Sitesへ再配置するときは、所有者限定アクセス設定を維持します。

## 最終検証

- `npm test`: **51/51 PASS**
- `npm run build`: **PASS**、41 browser modulesを含む静的ビルド（約2.2 MB）
- `git diff --check`: **PASS**
- pixel QA: FULL 192サンプル、SOCIAL 74サンプル。黒フレーム0、歌詞切れ0。
- H.264/AAC stream検査: FULL 1,722 video / 2,691 audio samples、SOCIAL 415 video / 649 audio samples。
- 品質内訳と目視評価: `QA_REPORT_2026-09-28.md`
