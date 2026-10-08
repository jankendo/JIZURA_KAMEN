# JIZURA Custom Edition 1.1.0 品質レビュー

基準：保存済みv35（v30完全復元版）。基準commit `4015911370e059147ee12cb8c124afcc1e3cd78c`。
保存番号はSitesの新規保存結果を参照。**本番デプロイは実行していない。全面的な公開判定は未完了。**

## 1. 新規保存版

既存のv35を親にした改修版を同じSiteへ保存する。アプリ内のSemVerは1.1.0。v35および既存履歴は変更・削除しない。

## 2. 変更ファイル

- `app/body.html`
- `app/style.css`
- `dist/index.html`
- `index.html`
- `package-lock.json`
- `package.json`
- `scripts/build.mjs`
- `scripts/run-tests.mjs`
- `src/08i_project.js`
- `src/09_render.js`
- `src/10_audio.js`
- `src/11_export.js`
- `src/11u_motion_director.js`
- `src/11v_perceptual_director.js`
- `src/11w_observer_director.js`
- `src/11x_multi_image_director.js`
- `src/12_ui.js`
- `dev/custom_test_support.cjs`
- `dev/custom_edition_regression_test.cjs`
- `dev/custom_quality_compare.cjs`
- `dev/custom_mp4_smoke.cjs`
- `dev/custom-quality-measurements.json`
- `dev/custom-mp4-smoke-results.json`
- `QUALITY_REVIEW_CUSTOM_1_1_0.md`

`index.html` と `dist/index.html` は生成物。フォント・vendor・hosting設定の内容はv35から変更なし。package-lockの変更はアプリ自身のバージョン表記2箇所のみで、dependencyは変更していない。

## 3–4. 発見した不具合と修正

| 根本原因 | 修正 | 影響範囲・回帰リスク |
|---|---|---|
| 同じPCMにFFTを2回実行 | 1回の結果で特徴量・詳細timeline・統計を共有 | 数値差が出る危険を全特徴量の完全一致で検証。FFT1024点、100ms間隔、50Hz energy等は維持 |
| 三秒ごとの集約で全FFTフレームを再走査 | 時刻順の走査位置を再利用 | 加算順と閾値を維持、出力完全一致 |
| IDB素材の確定前にlocalStorageの参照情報を更新 | 素材保存を直列化、同一素材は再保存しない。transaction完了後に最新のmetadataを反映 | 保存競合・リトライを制御したテストで検証。実ブラウザ容量超過と異常終了は未検証 |
| IDBとlocalStorage間には共通transactionがない | assetsと同一transactionに`project-recovery-v1`を保存。保存前mirrorが現在のmirrorと一致するときだけ復旧 | 後からv35で編集した異なるmirrorを上書きしないテストを追加。旧版は復旧recordを読まないため、容量不足の表示時にはJSONバックアップが必要 |
| 壊れたJSON・読込不能素材から空データで自動保存する恐れ | 自動保存を停止して前回データを保全、起動エラーを捕捉 | 復旧時は保管したプロジェクトを明示的に開く。ユーザーデータの自動削除なし |
| IDB open失敗のPromiseが固定される／他タブによるblocked | 失敗時に接続Promiseを解放、blockedを案内、versionchange時に接続を閉じる | 他タブ競合はcontrolled test・静的確認。実機再現は未完了 |
| Pro素材を毎回historyのJSONに埋め込む／古い画像参照が残る | 素材を共通参照にし、60状態から外れた参照を解放 | Undo・Redoの素材と設定の復元を検証。保存ファイルの素材は削除しない |
| exportSettingsがUndo対象から漏れる | 履歴対象に追加 | 指定ビットレート・範囲の復元を検証 |
| 画像の同時decodeで重複処理・遅い結果の上書き | Rendererごとに背景・deckの読込を直列化して同一sourceを共有 | 3並列要求のdecodeは1回。失敗時は前のbitmapを保持。dispose後の遅延decodeは保持しない |
| bitmap置換時の旧リソース・seek待機listenerの解放漏れ | 置換成功後に旧bitmapを解放、成功/失敗/timeout/abortでlistenerとtimerを解放 | 負のケースも含めて検証。動画codecの実機差は未検証 |
| 無音出力の代替経路でnull audioを参照 | optionalな音源の範囲チェックを修正 | 代替経路の初期化失敗でもcleanupを確認。MediaRecorder実機出力は未検証 |
| エンコーダー待機中のキャンセルが遅れる | 待機loopでabortを確認 | UIの中止操作は保持。実codecでの中止/再開は未検証 |
| 解像度・video bitrate・AAC bitrate・FPSの暗黙の低下 | 指定品質を保持。対応しない端末では案内して停止 | 古い端末では以前の自動低品質fallbackが成功していたケースも失敗になる可能性。品質保持のため意図した変更 |
| export / import / Undo連打・読込中の素材変更 | 二重実行guard、処理中の編集controlを保護。前のdisabled状態を戻す | controlled DOMでlock解除を検証。音源・LRC・フォントの遅延結果にはproject/request guard |
| プロジェクト保存のPromiseをawaitしない | 非同期ファイル生成/保存をawait、二重クリックを防止して成否を案内 | download fallbackのOS保存完了まではアプリ側で確認できないため、完了確認を利用者へ案内 |

## 5–6. UI・UX

暗色・既存アクセント・編集構成は維持。ヘッダーのCustom Edition、ヘルプ、プロジェクト保存という明確な名称、自動保存の現在状態、読込・保存エラー時の次の行動を追加。長い日本語/ファイル名/toastの折り返し、狭幅でのheader・操作buttonの折り返し、touch操作、mobile入力16pxを調整。ヘルプdialog中の編集shortcutを止める。

処理中は素材・設定の同時変更を防止し、中止buttonとヘルプは利用可能。音声解析は実際の工程名を表示。保存の完了表示はtransaction確定後。MP4生成後も続く再読込検査は不定量の処理中表示にして、検査終了まで完了を示さない。偽の経過時間progressは追加していない。

**画面全体の実ブラウザ視覚確認・タッチ実機確認は未実施。** CSSの静的確認とcontrolled DOMの確認だけで視覚品質を保証していない。

## 7–8. Custom Edition / バージョン

ヘッダーに `JIZURA Custom Edition` の表記。ヘルプに独自改修版である説明と `Version 1.1.0` を表示。`package.json`のversionをbuild時に読み、表示と`window.JIZURA_APP_INFO`へ注入する。互換性を維持した追加改善としてminor更新を採用。Site保存番号とは区別する。

## 9. 説明

ヘルプに開始の3手順、Easy/Pro、素材/LRC/フォント、Style/Director/Motion/シーン/タイポグラフィ、プレビュー/MP4/SNS/X、自動保存/JSON/バックアップを追加。音源はJSONに含まれず別途保管すること、Undoは音源差し替えの復元ではないこと、データを消さず復旧することを説明。既存ライセンス/権利表示は保持。

## 10. 音声解析

重複FFT除去、時刻順集約、不要な入力ArrayBuffer clone除去。AudioContextのcloseをawaitし失敗も捕捉。サンプリング、FFT、energy/onset、BPM推定、波形、全特徴量の条件は同一。3つの検証PCMで全解析結果が完全一致（0.1秒無音8kHz mono、6秒16kHz mono、30秒44.1kHz stereo）。同一Fileを跨ぐ永続cacheやWorker移行は、mutable state・実機検証不足を考慮して追加していない。

## 11. 描画

再生中のtimelineの静的な波形・拍・cut・markerをキャッシュし、playheadだけを再合成。MVのframe・filter・blur・composite・typo・animationの演算は維持。背景と素材のdecodeを重複しないよう直列化。元の2048px上限・48MiB budgetを維持して、追加の縮小は行わない。

4比率で計32代表フレーム、単一/複数画像の横/縦で計20フレームのRGBA画素がv35と完全一致。プランのLRC時刻・scene・Director等のserialized結果も一致。これは代表fixtureの証拠で、全作品・全端末を保証するものではない。

## 12. 書き出し

H.264/AAC/MP4、解像度・FPS・bitrate、エフェクトと検査の数は維持。黒フレーム判定のRGBA→Array→filter→mapを直接走査へ変更し、同じthresholdを完全一致で確認。再読込/Observer/provenance検査を省略していない。encoding/muxの全体速度改善は実ブラウザ未測定。従来の暗黙の設定低下を廃止したため、端末条件によっては成功率に変化があり実機確認が必要。

## 13. Before / After

| 測定対象 | Before | After | 時間短縮率 |
|---|---:|---:|---:|
| 音声解析：120秒、44.1kHz、ステレオPCM（デコード模擬、UI通知なし） | 1720.01 ms | 1383.32 ms | 19.6% |
| タイムライン：1200×160、再生位置100回更新 | 152.72 ms | 18.95 ms | 87.6% |
| 黒フレーム判定：1080p合成配列、処理単体 | 470.95 ms | 12.79 ms | 97.3% |
| 黒フレーム判定：実際の検査サイズ96×54、100回 | 94.27 ms | 2.58 ms | 97.3% |


同一Node環境・同一入力。warmup後の5回、Before/Afterを交互に測定した中央値。値はこの検証環境だけの実測で、利用者端末の速度を示さない。最後の2項目は検査loop単体であり、MP4全体の高速化率ではない。実際の検査canvasは96×54。

| 依頼された全体操作 | 結果 |
|---|---|
| 初期起動 | 実ブラウザ未測定 |
| 音源読み込み / decodeAudioData | 未測定（PCM解析比較ではdecodeを模擬） |
| 音声解析 | 上表の条件で測定、UIを含むend-to-endは未測定 |
| プロジェクト読み込み | 保存競合/復旧テスト成功、実IDBの時間は未測定 |
| プレビュー開始 | HTTP 502により未測定 |
| 動画書き出し全体 | WebCodecs実機経路は未測定。補助native経路を生成・検証 |

## 14–16. メモリ / その他 / 追加発見

300,000文字の同一Pro素材を持つ60履歴のserialized snapshot：18,784,370 → 792,050 bytes（95.8%減）。共通素材自身は別途1つ保持する。**ヒープ/RSS/GPUメモリの測定ではない。** 入力ArrayBuffer cloneとRGB判定の中間配列を除去。使用済みの一時RendererのCanvasサイズを解放し、素材bitmap、動画src、listener、timerも解放。

自律的な補完：無音fallbackのnull参照、出力設定の暗黙変更、保存中断の復旧、JSON保全、exportSettingsのUndo、保存buttonのawait、ヘルプ中shortcut、検査中の早すぎる完了表示。便利さだけを目的とする新機能は追加していない。

## 17–18. 保存互換性

- localStorage：`jizura.project.v1` / `jizura.mode` 維持。JSONの読み方・既存project fieldsを保持し、未知fieldも残す。削除・初期化・強制migrationはしない。
- IndexedDB：`jizura-assets-v1`、version 1、`assets`維持。`background`、`visualAsset:<id>`、`proAsset:<id>`、`audio`、`font:<key>`の形式維持。
- 同じstoreに**復旧用key `project-recovery-v1` だけ追加**。値はmetadataと以前のlocalStorage mirrorのJSON。素材と同一transactionで確定するための必要な整合性対策で、DB/object-storeのschema変更はない。実ブラウザの強制終了試験は未完了。
- portable project schemaVersion 3 維持。font/画像/LRCを含むJSONと別保管の音源という構成は同一。
- v34由来の未知追加fieldを勝手に再実装しない。ここで利用者の実ストレージを操作したことはない。
- Secrets / 環境変数：Sitesのentriesは空、revision 0。新しい依存を追加していない。

## 19. 回帰テスト

基準：136/138成功、失敗0、ブラウザ依存2件skip。
改修後の全体suite：137/139成功、失敗0、ブラウザ依存2件skip（追加suiteを含む）。その後の最終変更は追加suiteの13テスト群、複数画像24ケース、pixel/codec/certification/provenance/policy/persistence等の対象テストで再確認。

| 対象 | 検証範囲 |
|---|---|
| 起動/新規/既存project | default/migration/構文/build・controlled state成功。ブラウザ起動は未検証 |
| 背景1枚/複数 | 既存回帰・実Canvas画素・旧版一致成功 |
| 音源/LRC/フォント | 既存解析・LRC・font fallback/rasterテスト成功。実ファイルpickerと可変fontブラウザ検証は未実施 |
| 自動演出/scene/typo | 既存engine回帰、プラン/代表画素の一致成功 |
| Easy/Pro/Undo/Redo | モード処理静的確認、履歴restore・export設定・control lock成功。実クリック未実施 |
| 保存/再読込/reload | 直列保存・latest metadata・invalid JSON保全・中断mirror復旧・後からv35で編集したmirror優先成功。実ブラウザreload未実施 |
| Landscape/Vertical/Square/X | 既存engineとpolicyテスト、下記補助MP4生成成功。SNS実投稿なし |
| H.264/AAC/MP4 | native補助生成と実decode/container検査成功。ブラウザWebCodecs/MediaRecorder UI未検証 |

既存React/TypeScript構成はなく、45個のJavaScriptモジュール。全モジュール構文検査成功。ビルド成功。テスト範囲で致命的runtime errorはない。意図的な破損JSON等の負のテストでは捕捉済みの開発者向けログが出る。実ブラウザConsoleの状態は不明。

## 20. MP4テスト

アプリの実Canvasフレーム → FFmpeg H.264/AAC → MP4 → アプリのcontainer検査 + ffprobe + 全フレーム/PCM再decodeを実施。

| 比率 | 解像度 | FPS/フレーム | 長さ | 結果 |
|---|---|---|---|---|
| Landscape | 1920×1080 | 30 / 60 | 2秒 | 成功 |
| Vertical | 1080×1920 | 30 / 60 | 2秒 | 成功 |
| Square | 1080×1080 | 30 / 60 | 2秒 | 成功 |

AAC 48kHz、指定192kbps、PCM再decodeで有音を確認。検証用音源はmonoの440Hz。4時点の縮小RGB比較は閾値内（これはlossy codecの補助確認であり知覚品質の証明ではない）。日本語ファイル名の生成も成功。`dev/custom-mp4-smoke-results.json`に結果。

**FFmpegは検証専用。アプリに依存追加していない。この検証はブラウザの書き出しbutton/WebCodecs/AAC WASM/HTMLVideoElement certificationを通していないので、依頼された実UI書き出しテストの代替完了とは扱わない。**

## 21. 未解決・未確認

1. supervised previewのprocessは稼働するが接続経路からHTTP 502。ブラウザ画面・Console・狭幅UI・実HTTP成功は未確認。具体的な基盤原因は未特定で、sourceを書き換えて隠していない。
2. cloud-browserの必要skillが利用不可、ローカルbrowser executableもなし。実WebCodecs/MediaRecorder/AAC WASMの出力、中止、再試行、font、実storage容量不足/reloadは未検証。
3. 長時間音源のFFT/energy loopはmain threadで継続する。stage間にUIを更新するが、処理全体が常に滑らかとは保証しない。
4. 非常に長い作品、大容量素材、実ユーザー作品、全機種/codec/全screen比率の網羅検証は未完了。
5. 旧版への再デプロイ時は復旧用keyを旧版が読まない。保存失敗表示がある作品はJSONバックアップを保管してから旧版へ戻す必要がある。

## 22. 今後の確認候補

先にpreview経路を復旧し、実ブラウザ回帰・最低1本のアプリUI MP4・mobile画面・local storage継続を確認。その後、解析Worker化、同一音源cacheの安全な不変条件、WebCodecs pipeline/backpressure、長時間メモリprofile、font poolの保持範囲を実測で検討。品質を下げる最適化や全面書き直しは候補にしない。

## 23. 本番・設定の保持

本番v35 deployment `appgdep_6abee350197481918c4b3293408bfafe` はsucceeded。URL `https://jizura-custom-background.jankendo14.chatgpt.site`、名称、所有者、共有revision 1、環境revision 0を保持。Deploy/Publish、共有・Secrets・環境変更、履歴削除は実行しない。v35 archive SHA-256 `b5cc544d761dbdc351d679cbbf12ea3ce6382bc3d7492424c8e1c9ff257de3f2` を保持。保存後はnative履歴とdeploymentを再確認する。

## 24. 公開判定

**まだ本番公開可能とは判定しない。** build・engine回帰・数値/画素比較・補助MP4は成功したが、ユーザーが完了条件に挙げた実プレビュー・browser fatal error確認・実UIのMP4書き出しが未完了。新しい保存版をレビュー候補として保持し、本番はv35のまま停止する。

## 再現

- `npm ci`（lockfileのdependency変更なし） / `npm run build` / `npm test`
- `node dev/custom_edition_regression_test.cjs`
- v35を別directoryへ`git archive 4015911370e059147ee12cb8c124afcc1e3cd78c`で展開し、`node --expose-gc dev/custom_quality_compare.cjs <baseline-directory>`
- `node dev/custom_mp4_smoke.cjs <temporary-output-directory>`（ffmpeg/ffprobeが必要、browser試験の代用ではない）
