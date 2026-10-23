# KAMEN v13 — Exploration-First Creative Director

## 実装と判定範囲

新規の「MVを作る」に `explorationVersion: 13` を付与する。保存・Renderer の契約は v9、解析アダプターは optimizerVersion 11 / expressiveVersion 12 のまま。旧保存 MV を自動で探索し直さない。機械的な探索・安全性と、人間が感じる魅力は別に扱い、芸術品質は **UNVERIFIED**。

## Phase A: 実コードから確認した早期収束

- `08b_omakase.js` は mood を振り、技法の有効集合、強度、seed を変更する。`08_planner.js` は seeded RNG で複数の登録技法とパラメータを組み合わせる。これは自動選択より広い発想源になる。ただし mood の既成候補集合を v13 に移植していない。
- `directionStyleCandidatesV11()` は解析値でスタイルを順位付けし、最初に3〜5件へ制限する。`registryLayoutCandidatesV9()` / `directionLayoutSequenceV11()` はスタイル bias、音響要求、少数の機構代表で入口を制限する。追加探索も既存候補の音響適合と変化要求に依存する。
- `searchJizuraDirectionV8()` は layout + cut/still/stillCamera/none の状態を先に全時点で合格させる。その構図を通過できない技法の組み合わせは、後段の共同最適化に届かない。
- v11/v12 の `optimizeCreativeLineV10()` はこの安全な初期構図から single / pair を探索し、途中で単一 score による短縮・停滞停止・上位候補への追加を行う。個別失格を組み合わせで救う経路はあるが、安全な初期構図への依存が残る。
- `scoreDirectionV11()` は Canvas の観測量と音響要求の距離を適合とする。低い運動要求に小さい画面変化が合えば、静止に近くても高適合になりうる。これは魅力の証明ではない。
- 中央の静止候補は幾何・コントラストの検証を通りやすい。最終 v11 beam は画面・音響差、反復・セクション関係を扱うが、入口で失った表現は復活できない。
- custom background は文字プレート、safe-area fitting、既存の FX sanitation に影響する。実 Renderer は登録 BG を写真の後にも描画でき、v11 の registryDirectionV11 イベントも描画できる。v13 はこれらを一律に禁止しない。実行と可視寄与は呼び出し観測・除去対照で区別する。
- 保存は sourceIdentity / locks / rendererCompatibilityId と resolved patches に束縛され、失敗時は生成前の MV を戻す。この経路と IndexedDB の原子的保存は維持した。

## 探索、修復、楽曲構成

`11zzzzzzzzzr_exploration_director_v13.js` が新しい入口となる。

1. live registry の style/layout/enter/hold/exit/cam/treat/decor/bg/fx/trans を発見する。追加分・和風スイッチ、必要な asset context、layout の描画契約と文字数適合は尊重する。音楽の上位スタイル順位は使わない。
2. 行・提案番号・バージョンで分離した Mulberry32 stream を使う。自由な新規生成を中心に、ランダムな疎密、登録 plan 関数、空間・強度パラメータを組み合わせる。安全なアーカイブからの変異・役割間 crossover も行う。同時指定は既存の1 layout / 1 camera 等のスロット契約内。
3. Canvas の primary mask、正規化した文字形状、位置、占有率、高さ、保持中の変化、RGB の時間変化、カメラ呼び出し、色を連続特徴として保存する。名前や技法数で niche を作らない。最大12件の距離ベース archive で近傍競争、Pareto 比較、過密候補の除去を行う。異なる niche の候補は単一 score が低くても残せる。
4. 失格候補を最大6件の修復用 buffer に残す。Renderer error は親にも採用候補にも残さない。サイズ・motion/camera 強度、局所 scrim/shadow、登退場時間を失格原因に応じて修復する。元の layout/style と役割を原則維持し、修復後に再描画し、特徴損失と ID 保持を記録する。安全修復では表現損失が大きい場合もあり、数値を隠さない。修復できなければ拒否する。
5. 発見後に onset/flux/energy から hold envelope、FX event、entry timing、camera 強度を調整する。再描画で音楽適合が後退しないこと、観測特徴の損失が上限内であることを確認してから archive に戻す。
6. 各行の archive を既存の全曲 beam へ渡す。音響変化・構造境界・歌詞と音響の反復・層の連続性・過剰演出を評価する。同じ歌詞が再現した場合、先行する行で実際に発見した候補を最大2件、時刻を再束縛して次の探索へ渡す。固定の motif / intro / chorus / outro は追加していない。
7. 640px の全曲安全ゲート、合成順の再検証、安全な別案探索をそのまま通す。候補が全滅したら生成を失敗させ、確認済み MV を UI の既存 rollback で保護する。

写真の余白・edge-density anchor を再利用する。crop、位置、サイズも確率的に提案する。被写体認識は **UNMEASURED**。背景・装飾・FX の分離は実際に同時刻の除去対照を描いた場合だけ観測済みとする。marginal contribution は加法的な相乗効果や人間の魅力の証明ではない。

「今の演出を曲に合わせる」は、各歌詞が全文1カットで表示される現在の構成を初期候補にする。layout/style は維持し、役割交換数と観測特徴損失を制限する。変更前の実 plan も同じ Renderer で描き、旧 compositing と新 compositing の差も特徴保持の判定に含める。細切れの構成を勝手に全文1カットへ変換しないため、その場合はボタンを無効にする。640px で維持できなければ旧 MV を保護して失敗する。

## 予算・証拠・互換性

- 行ごとに最大108状態。修復もこの枠内。探索停止後の同時刻除去対照は最大240 sample。アーカイブ12、修復 buffer 6。重複状態を除外する。
- 256px 一次描画、640px 最終検証、既存の call-local cache を再利用。生 mask は特徴抽出と除去対照後に解放する。非同期の探索境界・各 sample・最終検証でキャンセルを確認する。
- 登録 / eligible / generated / probed / safe / selected、候補生成・評価・起源、archive 距離、修復損失、調整の採否を分けて記録する。`probed` は実 Renderer の dispatch 観測で、登録された数や採用数から推定しない。
- 最終作品の候補品質には独立軸の Pareto-front 順位を使い、全曲 beam の音響・構造・反復コストと組み合わせる。旧 weighted score は最終採用の順位に使わない。文字 mask の実時間変化を音響と比較し、静止文字に背景 grain だけで同期を与えない。測定あり／なしが異なる軸は、欠測側が支配したと判定しない。pixel difference は存在・差異の観測で、画素差や使用数への品質加点はない。
- 安全基準の数値、sourceIdentity、rendererCompatibilityId、project-current-v2、SELECTED/DRAFT/STALE、旧版移行、手動 lock、MP4 の fast/quality 経路は変更しない。

## 検証の3グループ

1. seeded 発想と実 Canvas replay、実レジストリ到達性、上位 style 検索への非依存、archive、ID を保った局所修復、手動 lock、現在構図の保持。新しい assertions は既存の Chrome fixture を共用する。
2. 固定 seed **12812**、同じ4秒の合成音響、日本語 LRC、非対称の合成背景、共通 observer の短区間比較。v12、実際の `J.omakase` / planner の候補＋共通修復、v13 を比較する。ランダム baseline の mood 集合は比較用にだけ使用する。v13 とランダム baseline の状態上限108、除去対照上限240を共通化。v12 は出荷済みの既存予算を変更せず、実際の Canvas 回数を併記する。停止条件が違うため「同じ評価回数」とは呼ばない。ランダム候補は planner の断片化も含み、全文安全性で失格しうる。その失格を別の安全候補の品質と混ぜない。
3. v9 resolved / JSON projection の保存復元、640px、実 Renderer、16:9/9:16、代表的な短い H.264 MP4 と decoded role control、実 UI の rollback / quota / backup、IndexedDB、旧 FAST contracts、本番 build と required FAST CI / Pages。

実素材の音声・画像・LRC は利用できなかった。既存 workspace の過去の QA 出力をユーザーの実素材と呼ばず、今回の比較は明示した合成素材に限定する。人間による芸術品質、長尺楽曲での魅力、ランダムより優秀という主張は **UNVERIFIED**。機械的な安全率・表現の実行・探索能力から芸術的優越を推論しない。

測定結果は [evidence/kamen-v13.json](evidence/kamen-v13.json) を参照。各測定の sourceTreeSHA256 は、ハーネスが読み込んだソース snapshot から計算する。比較と最終契約チェックが異なる revision の場合は、その SHA を分けて残す。

### 固定合成区間の結果

3方式とも sourceTreeSHA256 `127516ad9f14c63f68073c5608017d3f7676fad0d434a05fb5362bd404a2f339`。seed を変更して有利な例を選び直していない。

| 観測 | v12 | ランダム＋共通修復 | v13 |
|---|---:|---:|---:|
| 探索中の実 Renderer frame 数 | 2,085 | 954（1行目で全滅） | 1,937 |
| 完成案の共通時点での安全・可読 | 11/11 | 完成案なし | 11/11 |
| 640px 完成列 | PASS | 候補全滅 | PASS |
| 採用 layout / hold | photoBanner / still → rotateSlow | 採用なし | arcTop / echoTrail（反復を継承） |
| 行間の実 mask 差 | 0.08972 | 未測定 | 0.08249 |
| 行間の正規化文字形状差 | 0.16700 | 未測定 | 0.14575 |
| 文字 mask の平均時間差（行0 / 行1） | 0 / 0.06308 | 未測定 | 0.04947 / 0.05088 |
| 共通疎サンプルの文字／音響同期 | UNMEASURED | 未測定 | UNMEASURED |
| 共通 RGB 時間適合（行0 / 行1） | 0.76251 / 0.76848 | 未測定 | 0.73186 / 0.81773 |
| 全曲 arc の再評価要求 | なし | 完成案なし | なし |
| 人間の芸術品質 | UNVERIFIED | UNVERIFIED | UNVERIFIED |

mask 差は大きさの優劣ではない。今回の同じ歌詞の反復では、構図の再利用も妥当な選択になりうる。RGB 時間適合は背景の変化も含むため、文字同期や魅力と呼ばない。音響イベントを含む探索時点の文字同期は測定されているが、共通の疎な比較時点では音響の変動幅が不足し、同期を測定済みに格上げできない。

v13 は198状態を評価し、2行の archive に合計22状態（10 / 12）を保持、2カットを採用した。登録768件のうち、この設定での eligible は386件。生成された技法 ID は行別127 / 124、実 dispatch を確認した ID は123 / 121、安全状態内で実行された ID は15 / 18。採用の16役割割当のうち実行確認は10割当。最終サンプル列では、1技法・1frame単位に重複を除いた dispatch 観測が70件あった。技法数や dispatch 数は魅力の点数ではない。

局所修復82回中2回が安全化に成功した。修復の特徴損失は0.17829 / 0.29812であり、安全化のため元の表現を完全に保てなかった例も含む。ID を保っても画面の個性が同じとは断定しない。ランダム baseline は89状態・42提案、修復47回でも安全な完成候補を確保できず拒否された。したがって、安全なランダム完成案と v13 の芸術品質比較は成立していない。

[代表画面](evidence/kamen-v13-synthetic.png) と [短いMP4](evidence/kamen-v13-synthetic.mp4) は合成素材によるもの。MP4 は640×360、H.264、24frame、1秒の video-only smoke。decoded role control は3時点のうち2時点で codec residual を超える hold 寄与を観測し、残り1時点は UNVERIFIED。実音源の AAC、歌唱音節同期、長尺の fast/quality エンコードを今回新たに検証したとは扱わない。

最小検証は全てPASS。旧 FAST v3〜v11、640px の resolution-dependent wash 拒否、安全な別案・全滅保護、実 IndexedDB quota / atomic rollback / cross-tab revision / 旧移行、本番 build と Chrome UI smoke を再利用した。同時実行でCPUを共有した smoke が一度120秒でタイムアウトしたため、負荷を外して同じ閾値・同じ検査を再実行してPASSした。安全閾値・検査時間の上限を緩和していない。

総合判定は **PARTIAL**。探索・修復・保存・描画の実装と機械検証は達成した。実素材による人間の芸術評価と、ランダムより魅力的だという実証は残る。

```bash
# 既存のサーバーを起動してから短い encoder smoke を含める場合
npm run build
node scripts/serve.mjs dist 127.0.0.1 4173
# 別のシェルで、同じ fixture を共用
KAMEN_V12_COMPARE=v13 KAMEN_V13_CHECKS=1 KAMEN_V12_MP4=/tmp/v13.mp4 node dev/kamen_song_native_v11_fast_test.cjs
KAMEN_V12_COMPARE=v12 node dev/kamen_song_native_v11_fast_test.cjs
KAMEN_V12_COMPARE=random-repaired node dev/kamen_song_native_v11_fast_test.cjs
```
