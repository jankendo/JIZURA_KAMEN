# KAMEN v14 — Motion-Led Creative Selection

## 判定と適用範囲

総合判定は **PARTIAL**。新規生成を v14 に切り替え、旧版の保存済み演出・復元・v9 Renderer 契約は維持する。人間による実映像の芸術評価は **UNVERIFIED**。ランダムより魅力的と証明したとは扱わない。

基準 main: `874ebd235a9f7fad1580151c572d7f8409db9fbc`。調査開始時に fetch し、指定 SHA と一致することを確認した。

## 実コード上の原因

- v13 の `rankExplorationPortfolioV13()` は Pareto 第1層をすべて `score=1` にした。その後の `chooseCreativeArcV10()` は v11 の遷移へ戻り、`-.28 * abs(visualDistance-target)`、スタイル変更、反復の視覚差などを減点していた。実際の欠陥がない表現差まで選択コストになっていた。
- v13 の距離は構図・字形・時間変化を平均し、同じ構図で動きだけが異なる候補を同じニッチに吸収しうる。
- v13 の修復は幾何の失格に対し camera×.65、motion×.6、hold→still を早期に提案していた。初期の安全化成功率が低く、動きを失う修復もあった。
- 既存 v11 安全契約は既に「短時間の正しい部分表示」と「保持中の欠落」を区別している。ENTRY で落ちること自体は全文検査の誤りを意味しない。実際のセーフエリア、字形変形、衝突、コントラスト、sourceFull、時間上限の違反を精査すべきで、閾値の一律緩和は行わない。

## 最終選択器

`src/11zzzzzzzzzs_motion_led_v14.js` に独立した `chooseMotionStoryboardV14()` を追加した。v14 は旧 arc を呼ばず、v13 以下は従来の経路を使う。初期の旧 storyboard は v14 の判断根拠にならず、640px 再選択・別案選択も v14 の選択器を経由する。

音楽適合、構図、役割除去対照での可視的実現、観測チャネルの被覆、全曲の展開、境界での表示欠落、連続する明るい flash の過負荷を独立した Pareto 軸で保持する。最大12経路のビームを使い、測定された最終カットのニッチを残したうえで、非劣経路から seed 付きで1経路を選ぶ。芸術性や動きの振幅を最大化する点数ではない。

スタイル、layout、camera、hold、背景、FX の ID 変更自体を遷移コストにしない。音響変化を参照するが、音楽反復を視覚反復の強制条件にはしない。3回目以降の同じ実測表現の連続使用は弱い履歴軸で扱い、静止・再利用も許容する。ジャンルやサビの固定完成演出は追加していない。

未測定の音楽軸は null と測定状態を保ち、測定済みのゼロに置換して優劣をつけない。候補の Pareto 層を保ちつつ、層内でも実測の音楽・構図の値を保持する。全曲の勝敗を層番号だけの同点と旧一貫性コストで決めない。

## Motion-aware Quality-Diversity

最大12候補／行を維持。既存の256px Canvas サンプルから以下を抽出する。

| チャネル | 根拠・限界 |
|---|---|
| 空間・字形 | primary mask の中心、占有率、高さ、正規化字形 |
| 文字の時間変化 | ENTRY / HOLD / EXIT 別の mask 距離、変化速度、最大値、静止区間比率、4区間の時間プロファイル。layout / camera の寄与も含む |
| camera | 実 production callback の transform に cut 強度を適用した変化、平均、方向。画素への寄与は除去対照で別途確認 |
| 背景 | primary 描画直前に既に存在する Canvas の RGB。先行装飾も含み、背景だけの独立 RGBA とは呼ばない |
| 合成画面 | 実 RGB の空間・時間変化。FX だけの独立成分ではない |
| FX・装飾の寄与 | 同一時刻・同一構図の役割除去対照。制限内で未実行なら UNMEASURED |

チャネルごとに距離を計算し、単一の平均で動きの差を打ち消さない。アーカイブ超過時にはチャネル別の孤立した候補を先に保護し、残りを crowding / Pareto で調整する。技法名では領域を分けない。測定できないチャネルは UNMEASURED。

## 原因別の局所修復と強度

失格を位置・安全領域、サイズ、コントラスト、字形変形、保持中の欠落、保持可読性、過渡区間、camera 移動、FX contrast、Renderer エラーに分類する。Renderer エラーを安全な状態として上書きしない。

位置補正、局所 shadow/scrim、既存上限内の登場・退場タイミング、微小サイズ調整、FX 発生時刻の調整を先に試す。その後にだけ原因に対応した camera / motion / FX 強度を調整する。最後の役割交換でも原因となる hold だけを交換し、still は最後の仮説とする。全体の style/layout/background を初期化しない。

修復には ID 保持率と、空間・字形・文字時間変化・camera・背景・画面各チャネルの実測保持率を記録する。保持率は特徴距離の代理量であり、芸術性の保持率ではない。

v13 の確率的探索をそのまま基盤にし、安全候補の少数に元強度1と小さな増強を対で試す。上限は技法が宣言する `explorationStrengthMax`、または当該候補で測定した安全領域余白から導く小幅な範囲とする。各試行は全文・幾何・コントラストを再測定し、不安全なら採用しない。大きいほど高得点にはしない。

状態評価108件／行、アーカイブ12件、除去対照240サンプル／行、一次256px・最終640pxを維持する。既存の call-local probe cache を再利用し、背景観測のための追加描画は不要。repair / 強度 / 音楽調整も108件に含む。640px 枯渇時の既存回復予算12件は別枠で、v14でも局所修復経路を使う。

## 保存・旧版互換性

新規生成だけを `generateJizuraDirectionV14()` へ切り替えた。`explorationVersion=14`、`searchAlgorithm=KAMEN_MOTION_LED_CREATIVE_SELECTION_V14`、selection の `optimizerContract=kamen-motion-led-14` を保持する。

`project-current-v2`、IndexedDB、sourceIdentity、`rendererCompatibilityId=kamen-song-grammar-renderer-9`、SELECTED / DRAFT / STALE、resolved cut、manual lock は既存契約を使用する。v13 以下を読み込んでも v14 へ移行・再生成しない。v14 は v13 の cut-owned render parameters を再利用し、FX の局所発生時刻だけ追加した。preview / probe / MP4 が同じ値を参照する。

## 最小限の検証

新規の検証は以下の3グループに限定する。FULL regression、744技法総当たり、大量seed比較は行わない。

1. 選択回帰：既存 v13 Chrome fixture を再利用した v14 assertions。seed 再現、旧 arc 分離、ID 非依存遷移、動き別アーカイブ、安全な静止、危険候補拒否、実探索で失格した動く候補の局所修復とCanvas上の動き保持、保持中の動きの存続、部分表示契約、lock、保存復元、9:16 と640px。
2. 固定比較：同じ4秒の合成音響、日本語反復LRC、背景、事前固定 seed `12812`。v13 / ランダム＋v14共通局所修復 / v14。結果を見てseedを変えない。
3. 最終動作：640px safety、640×360 / 24fps / 1秒の production MP4 と再読込デコード、IndexedDB の既存永続化テスト、本番build、Chrome startup smoke、required FAST CI。旧 FAST の UI 呼出先文字列だけ v14 へ更新し、旧アルゴリズム・安全検査は残す。

実素材の音源・LRC・背景セットは今回の添付にないため、比較は合成素材に限定する。video-only MP4 smoke は音声AAC、歌唱音節同期、長尺fast/quality両系統の新規検証ではない。

## 固定素材・固定seedの実測結果

[機械可読の比較記録](evidence/kamen-v14.json) / [代表画像](evidence/kamen-v14-synthetic.png) / [短いMP4](evidence/kamen-v14-synthetic.mp4)

| 観測 | v13 | ランダム＋共通修復 | v14 |
|---|---|---|---|
| 採用構図 | arcTop / arcTop | 完成候補なし | arcTop / corners |
| 共通HOLD mask変化、行0 / 行1 | 0.04947 / 0.05088 | UNMEASURED | 0.03862 / 0.00000 |
| 安全な局所修復 / 試行 | 2 / 82 | 0 / 66 | 3 / 115 |
| 状態評価数 | 198（2行） | 96（行0で拒否） | 212（2行） |
| 探索・検証の描画数 | 1937 | 1042 | 2323 |
| 探索から確定までの観測時間 | 44.2秒 | 完成案なし | 42.5秒 |
| 共通観測点の安全率 | 12 / 12 | 完成案なし | 11 / 11 |
| 共通疎サンプルでの文字／音響同期 | UNMEASURED | UNMEASURED | UNMEASURED |
| 最終640px | MEASURED_SAFE_SEQUENCE | 完成案なし | MEASURED_SAFE_SEQUENCE |
| 人間による芸術品質 | UNVERIFIED | UNVERIFIED | UNVERIFIED |

共通HOLD点は .3 / .55 / .85 / 1.15 / 1.45 / 1.8 秒のうちcut内のもの。v14行1はcut長により5点。mask差は大きいほど高品質という意味ではない。この比較では v14 のHOLD変化量は v13 より小さく、全般的なモーション増加は実証できていない。v14の目的は異なる安全な表現の存続であり、動きを毎行強制してこの結果を隠さない。実行時間は同一ホストでの観測値で、他の必要検証とのCPU共有を含み、厳密な速度ベンチマークではない。

Motion Survival は、ランダム提案時のprimary maskで動きを観測した根を数え、修復・強度・音楽調整後も同じ根を追跡する。未描画候補、未測定の動き、芸術性は分母に含めない。

| 行 | ランダムで動きを観測した根 | 修復前から安全 | 最終アーカイブに残った根 | 採用の根が動いていたか |
|---|---:|---:|---:|---|
| 0 | 23 | 3 | 3 | True |
| 1 | 29 | 2 | 3 | True |

v13のランダム提案段階の動きの根は既存記録にないため、同じ定義のMotion SurvivalはUNMEASURED。アーカイブの後だけの観測を発見時の生存率に格上げしない。探索時点のHOLDサンプルには開始直後の描画変化も含まれるため、「採用の根に動きあり」と疎な共通HOLD点で静止という結果は両立する。

カメラの実transformの時間変化は採用2行とも0。カメラ役割除去対照は非該当またはUNMEASUREDで、カメラの改善は今回の採用結果からは証明できない。背景はpre-primary RGBに小さい時間変化を観測したが、カメラによる背景移動や独立した背景演出の改善とは呼ばない。

FX / hold の可視的寄与は、採用候補の同時刻の役割除去対照を比較記録に保存している。

- 行0 hold `echoTrail`: MEASURED、平均RGB差 0.00057650。
- 行1 fx `shake`: MEASURED、平均RGB差 0.00006881。

安全化できた修復のチャネル保持率（1−特徴距離、芸術評価ではない）：

- 修復1: ID保持 1.000、空間 0.99142、HOLD 1.00000、camera 1.00000、背景 1.00000。
- 修復2: ID保持 1.000、空間 0.99346、HOLD 1.00000、camera 1.00000、背景 1.00000。
- 修復3: ID保持 1.000、空間 0.99226、HOLD 0.90064、camera 1.00000、背景 1.00000。

ランダム比較は96状態、30提案、66修復を行っても行0の安全候補が残らず拒否した。最初の失格時点はENTRY 92状態、HOLD 4状態。サイズ、source/coreの欠落、保持可読性、安全領域、変形、コントラストの複合原因があり、時間だけの修復では解消しない。一般のランダムボタン動画すべての安全性・魅力を表すものではない。

局所修復の安全化成功率は依然として低い。直接のChrome回帰では、実探索で失格した動く候補を、役割IDを維持したまま局所修復して安全化し、保持中のCanvas変化が残ることを確認した。修復方針の動作確認と、多様な素材での一般的成功率の改善は区別する。

強度探索の全試行（安全／不安全、倍率、可視差、音楽適合、保持率）は各traceのstrengthTrialsに記録する。安全余白のない候補を一律に増幅しない。

検証：v14 assertions、v13 assertions、v9/v10既存FAST、export UI、本番build、既存IndexedDB quota/atomic/revision/legacy migrationはPASS。Chrome startup smoke（別案・quota失敗後の完成MV保持・生成失敗rollbackを含む）もPASS。required FAST CIの最終結果と配信照合はPR・完了報告を参照。

残る課題：実素材と複数楽曲での人間の芸術比較、安全修復成功率、採用カメラ・背景表現の広がり、疎サンプルによる時間観測の限界、独立したFX/背景RGBA、AAC付き・長尺fast/qualityの追加検証。今回未実施の検証を成功扱いしない。

## 専門領域からの最終レビュー

- MVディレクター／モーション：表現差を不当に消す旧遷移を除外した。一方、短い合成比較だけで大胆さ・迫力・魅力の向上は証明できない。
- 生成アルゴリズム：空間と時間のアーカイブを区別し、全曲も非劣経路を残す。有限予算・代理距離による取りこぼしは残る。
- 音楽解析：同じ区間の音響と文字maskを比較し、空間を保ったタイミング調整を行う。疎な共通サンプルで音響変動が不足すれば同期は UNMEASURED。
- Canvas：既存の全文・字形・境界・コントラスト・640pxゲートを維持。背景は pre-primary composite、FX は除去対照の限界を明記する。
- QA：旧版復元・安全な別案・別案全滅時の推奨保持・quota失敗時の完成MV保護を既存検証で確認。未実施の芸術評価や音声エンコードをPASSに数えない。

## 再現コマンド

```bash
npm run build
node scripts/serve.mjs dist 127.0.0.1 4173
# 別シェル
KAMEN_V12_COMPARE=v14 KAMEN_V14_CHECKS=1 KAMEN_V12_MP4=/tmp/v14.mp4 KAMEN_V11_REPORT=/tmp/v14.json node dev/kamen_song_native_v11_fast_test.cjs
KAMEN_V12_COMPARE=v13 KAMEN_V13_CHECKS=1 KAMEN_V11_REPORT=/tmp/v13.json node dev/kamen_song_native_v11_fast_test.cjs
KAMEN_V12_COMPARE=random-repaired KAMEN_V11_REPORT=/tmp/random.json node dev/kamen_song_native_v11_fast_test.cjs
node dev/kamen_persistence_v111_fast_test.cjs http://127.0.0.1:4173/
node dev/browser_startup_smoke.cjs http://127.0.0.1:4173/
```
