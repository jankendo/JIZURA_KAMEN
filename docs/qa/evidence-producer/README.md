# KAMEN evidence recovery — 2026-10-20

総合 **PARTIAL**。アプリ `0a5c896fcf1a734b4f18d3f2467c285ba7c6a1fc` の既存証拠を再評価し、TECHNICAL_GO PASS / QUALITY_GO UNVERIFIED / RELEASE_GO UNVERIFIED を再現した。#14 `9cf7612…` の正式CI 39345980421は最終取得時も実行中であり、このQA変更の正式GOもすべてUNVERIFIED。main・Pages・アプリ演出・既存評価器・閾値は変更していない。

## 実装と認定境界

`producer.cjs` は入力のJSON/gzip/MP4依存をハッシュで検証し、同じバイト列を重複格納しない。型は内容で判別する。絶対パス、未登録の `..`、バックスラッシュ、シンボリックリンク、欠損・改ざんを拒否する。歴史的な相対参照は、元パス＋元SHA-256から安全な入力パスへの明示的な対応表だけで移設する。元のsourceCommit/input/plan/profileは変更しない。

元JSONの参照を安全な新参照へ書き換えた場合、元バイト列はbase64入りgzip JSONとして保持する。このアーカイブ自体も通常の `{path,sha256}` 参照なので既存adapterがハッシュ検証でき、歴史的な `../` を生きた依存として解釈しない。MP4はbase64化せず単一ファイルを共有する。正式manifestからprovenance index、元バイト列、移設後の全依存まで追跡できる。ハッシュは整合性の証明であり、未知のrunnerの真正性の代用ではない。

正式出力は、入力依存が完備し、対象SHAとtrusted checkoutが一致し、**変更していない** `pages_release.cjs` / `release_gates.cjs` の全ゲート、実GitHub APIによる同じSHAの成功済みfull build CI照合、選択済み最新版MP4の実probe・完全decodeがすべて通った場合だけ `manifest.json` を残す。不足時は診断用manifest/resultだけを保存する。

新workflowは明示的な手動実行のみ。成功済みintake runのrepository・artifact一意性・期限・digestを確認し、trusted checkoutのコードだけを実行する。欠損したsource-correspondenceのcommit endpointだけをshallow/filter fetchする。公開権限は持たず、失敗時は `kamen-evidence-diagnostic`、完全成功時だけ `kamen-release-evidence` をuploadする。今回このworkflowはdispatchしていない。正式bundleの成功実証・uploadは未完了である。

## 全件分類

`results/*jsonl.gz` は機械可読な全行である。

| 母集団 | 行数 | 重要候補 | A | E | 正式証明 |
|---|---:|---:|---:|---:|---:|
| 歴史的d04 / intents-1250 | 1,250 | 1,129 | 121 | 1,129 | 0 |
| 回収済み5eb / current-intents-1250 | 1,250 | 1,129 | 121 | 1,129 | 0 |

772動的・280合成・77静止は**候補**であり、重要性は未確定。Aの121件はmanual/identity台帳の再利用だけで、品質PASSや除外認定ではない。契約未確定を先にEと分類し、FやAへ結果依存で移していない。旧2 VERIFIEDも移転していない。d04と5ebのIntent IDの共通部分はゼロであり、名前の一致で証拠を移していない。正式最新版0aのoperatorsは引き続き未確定・登録済みID/観測ゼロである。

d04で契約確定後に調査できる作業候補はC=549、対照の所在確認が必要なD候補=580。これは同一d04ソースの古い対照一覧に基づく候補であり、5eb/最新版で使える対照の確定数でも、新規動画580本の要求でもない。5eb全行にも対象・歌詞tuple・区間・binding・未証明理由・最小操作を別途保存した。未回収の入力/音声/反復、未確定の位相・意味・帰属はUNKNOWN/UNVERIFIEDのままである。

## 代表3種類

実在8 MP4・14,344,889 bytesをハッシュ確認し、映像/音声を完全decodeした。事前診断契約と全フレームhash/実timestamp/PCM hashを保存した。

- 静止: 5eb development-01 `影` の既存**故意に不正なworld-static主張**を使った負例。元画素から8フレームを再観測し、インク画素数8,452→6,998、中心移動最大0.730936 pxを確認。未変更v3評価器は保存済み/新規画素観測の両方をFAILとし、欠損ラスタ・ソース違い・プラン違い・hash改ざんをUNVERIFIEDにした。これは正しい静止Intentの正例成功ではなく、世界座標の形状変化を拒否する実証である。
- 動的 cameraAt: d04 development-11の元/ON/反復の全decoded RGBA一致とPCM一致、OFFとの差248フレームを確認。意味ベクトル/位相モデルは未登録でUNVERIFIED。
- 合成 drawCinemaAccent: 同じく元/ON/反復一致、OFFとの差134フレーム。groupの寄与だけで、独立構成要素の帰属や音楽的妥当性は証明していない。

3種類とも正式な正例認定は未完了なので全件へ解析を展開していない。初回の算術平均lumaは既存加重式と違っていたため撤回し、既存 `.2126/.7152/.0722` float32・contrast `.25` に戻した。また奇数座標ROIはYUV420のcrop前にRGB化しないと丸められるため修正した。補足部分観測は計4回で、全8本の完全decodeは繰り返していない。最終FFmpeg/Chromium lumaの最大差は約1/255で、decode経路の完全同一性は主張しない。実際の元映像の8フレームのラスタ画素数はすべて再現した。旧計算はsupersededファイルに保存した。

## 31条件・旧6条件

31条件のsignificantRegressionはすべてnullで未裁定。canonical比較記録のactive-primary FAV、元/比較動画・入力・PCM/profile・追加要求の参照を保持した。FAVの測定済みscopeは創作/全レイヤー/位相の裁定に拡張していない。代理指標から後退なしとは判定しない。

旧6件のMP4は対応する5eb動画とすべて別hash。保存済み比較ではpacket clocks・主要codec/color属性・列挙されたH.264 header/QPは一致するが、coded packetsとdecoded pixelsが違う。creation_timeだけでは画素差を説明しない。development-01の新しい2反復は投入buffer/config/decodedが相互一致する一方、元Nativeと25/240フレーム違う。210共通フォント資源と12隔離字形は一致し、単純なフォントファイル差説を支持しないが、full-render文脈差は未解決。これらを歴史的encoder原因の確定や現在動画のdecode失敗に変換しない。6件とも原因未確定。

## 最小追加作業

1. 重要候補1,129件の重要性・対象・歌詞・区間・位相・意味モデルを確定し、最新版ソース対応を証明する。
2. 静止/動的/合成の正式な実動画正例を各1件、計3件完成させる。既存の負例6チェックと元/対照/反復identityは再利用する。
3. 同じ契約で使える対象にだけ展開し、既存動画の共通フレーム解析を共有する。C/Dはexact source/input/plan/profile/音声を照合して再分類する。
4. 31条件の既存比較を歌詞・音声・フレーズ全体で裁定し、旧6条件は元の投入frame/metadataと変換設定を先に回収する。
5. 完備後だけ同じSHAのproducer/full CIを利用して正式artifactを作る。main merge/公開には別の明示的承認が必要。

これは論理作業数であり動画本数ではない。**新規動画の最小必要数はまだ確定不能**。全1,129件に新生成を要求せず、欠損確認前に動画を生成しない。

## 実測と限界

- 不変Git treeの約8.70 GBから291ファイル/33,431,614 bytesを選択回収。APIはgzip/raw変換を避け、Git blob SHA-1とSHA-256を照合した。再実行は291件を再利用し転送0（表示0.004秒は検証済みcacheの確認部分のみで、Git tree API時間を含まない）。
- 最初のbulk history fetchは費用過大と判明して中断。464,830,463 bytesの当該一時packだけを削除した。この無駄な転送を選択回収33.4 MBに隠していない。以後の正確な2 commit endpoint fetchは0.662秒/pack+index追加14,577 bytes。
- 実MP4完全decode 8回/9.021秒。未圧縮RGBA約3.262 GBはディスク保存せずストリームhash化した。二つの診断で共通の元/反復は再decodeしなかった。作品動画の新生成0、full CI再実行0。既存adapterテストだけは0.4秒の極小非KAMEN fixtureを1本生成・削除した。
- 同じ不完全な実証拠束の保存量は70,095,316→12,308,223 bytes（82.44%減）。原バイト列を安全なhash参照アーカイブとして保持する最終版の組立は2.743→5.756秒（2.10倍）で、速度改善ではない。中間8.88 MB版も測定として残し、最終値と混ぜない。
- producer graph26、既存gate37+83、adapter40、極小decode3、実静止負例6、全件binding/ID整合性、Node/Python構文、actionlint 1.7.12を確認。実証拠束は依存欠損で拒否され、正式manifest/artifactは作っていない。診断bundleは `/workspace/kamen-produced-final/` にある。

## 4視点の反証と統合

| 視点 | 反証 | 統合判断 |
|---|---|---|
| DevOps | bundle組立成功だけで認定できるか | 不可。原証拠/hash/source/型/実decodeを検証し、不完全束は診断専用 |
| CI/CD | 元アプリの緑を新しいQA SHAへ移せるか | 不可。同SHAの成功full CIと独立producerを実GitHub APIで確認 |
| 映像品質 | 中心不動・ON/OFF差・高い代理指標で意味を証明できるか | 不可。形状・意味・位相・帰属・音楽的評価を分ける |
| QA | 過去2 VERIFIED、Native32、代表3種類で全件PASSか | 不可。ソース別IDと全件台帳を維持し、未証明1,129件/31/6を残す |

これらは4分野からの検査であり、4人の独立レビュアーの承認を装ったものではない。正式QUALITY_GO/RELEASE_GOは引き続きUNVERIFIED。

## 再実行

```sh
python3 docs/qa/evidence-producer/recover.py docs/qa/evidence-producer/results/evidence-inventory.json /workspace/kamen-evidence
python3 docs/qa/evidence-producer/classify.py /workspace/kamen-evidence /workspace/kamen-classification
python3 docs/qa/evidence-producer/history.py /workspace/kamen-evidence /workspace/kamen-classification
node docs/qa/evidence-producer/producer_test.cjs
```

代表decodeは成功済みなので理由なく繰り返さない。`representatives.py` は初回full decode用、`static_pixels.py` は既存契約の限定再観測用である。Python計測はnumpyを使用する。証拠producer CLIは `node docs/qa/evidence-producer/producer.cjs OPTIONS.json`。optionsは `root, manifest, output（未存在の別ディレクトリ）, target（40桁SHA）, repositoryRoot, provenance:{repository,commit}, mappings:[{originalPath,sha256,safePath}]`。完成済みintakeでは `intake-config.json` にmanifestとmappingsを入れる。全証拠/最新候補/契約が欠けたままこのworkflowをdispatchしても正式artifactは得られない。

取得元は不変commit `bd38de83ecff998c3a45821a6e01da233f106ad3`。全ファイルの元パス/Git blob SHA/サイズ/SHA-256、分類入力hash、実timestamp、観測前の診断契約、テスト・CIスナップショットを `results/` に保存した。正式な最新候補選択記録、完備した入力・音声・意味/位相/帰属証明、成功した正式producer runは未回収/未成立である。
