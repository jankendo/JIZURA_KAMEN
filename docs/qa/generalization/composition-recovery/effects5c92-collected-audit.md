# 完成MP4演出controls回収・再解析

source `5c92e27e6216962d09ec73927fd0df6ce50d0560` の実成果物を回収。これは現行sourceの全品質認定ではない。独立した外部専門家・人間による美的評価は実施していない (`HUMAN_UNVERIFIED`)。

- run38675427985/artifact11947078098: `effects5c92-continuity/`。元adopted動画は `f6843261…`。
- run38675521547/artifact11948532204: `effects5c92-controls/`。別のadopted動画 `3a8c3fc3…`。同じfixture名でも別plan・別動画であり混同しない。
- run38678357729/artifacts11947766571/11947672082: `effects5c92-typography-01/02/`。no-imageとmulti-imageの実adopted動画controls。
- 同run/artifacts11947181920/11947282236: `effects987-native-01/02/`。source987の同じfrozen planは両素材とも240/240出力Native RGBA・時刻が元5c92と完全一致。新sourceの再計画・UI・AAC/MP4保存の検証を代替しない。

全42本のON/OFF/ON_REPEAT controlsはH.264/AAC、元ツールのFFmpeg完全デコードPASS。動画・音源はSHA256名、非mediaはgzip、元member名/byte数/SHA256は各archive-manifest.jsonに保持した。

## 実出力Nativeの厳密照合

photo controlsはadoptedの唯一の全298frame groupとON/ON_REPEATが完全一致。typography controlsのraw spyには出力以外の安全性観測(01:8件、02:14件)が混在し、元raw reportはnative一致falseとなった。この失敗記録を保持し、新解析で元adoptedの厳密な出力時刻のみ抽出した。各時刻が一度ずつ順番通り存在することを要求し、両素材の240/240 RGBA SHA256がON/ON_REPEATと一致。時刻や画素一致の許容差は導入していない。欠落・重複・順序違い・hash入替えの反例を `effects-native-output-clock-counterexamples.json` に保存。

## デコード後の寄与

新解析 `replay_selected_effect_controls.py` は元動画/OFF差を、元動画/ON差とON/ON_REPEAT差の両方で校正。既存floor `max(1, 3*noise)` を強化し、同一actual PTS・同一縮小法でFFmpegデコードした。

| 同一成果物内のcontrol | 寄与frame / 全frame |
|---|---:|
| continuity temporalCinemaFocus | 238 / 298 |
| 8hook backgroundComposite | 298 / 298 |
| 8hook cameraAt | 30 / 298 |
| 8hook temporalCinemaFocus | 149 / 298 |
| typography01 applyTypography5 | 190 / 240 |
| typography01 typography5State | 188 / 240 |
| typography02 applyTypography5 | 192 / 240 |
| typography02 typography5State | 191 / 240 |

他の8hook controlsは0 frame。0を自動的なPASS/NOT_APPLICABLEにしない。continuityのdrawCinemaAccentのみ、元planのpride/stage>1/echo/intro契約が範囲内で不適用かつNativeON/OFF一致を確認した既存判定を別途保持。

寄与frame数は演出の実現率ではない。Hookの複合的な寄与と、狙った対象・方向・時刻・ビートへの一致は別である。backgroundCompositeを無効化すれば内包するcamera/grammarも変わるため、独立要素への帰属はCONFOUNDED。director5/6/7も共同作動しており個別寄与はCONFOUNDED。

## 残る重要な証拠

- 原動画の登録済みprimary semantic観測は01がMEASURED4 / CONFOUNDED4 / UNMEASURED1、02がMEASURED6 / UNMEASURED4。状態を変更せず `effects5c92-registered-primary-semantics.json` に保存。
- 01の9内部unit、02の10内部unitで上位typography wrapperが実itemの位置/scale/rotation/skew/trackingを変更した。registry HOLD='still'だけを全renderer静止契約として扱えない。実行traceは `effects5c92-typography-modifier-trace-summary.json`。
- no-image/multi-imageの重要camera/decor/transitionの独立decoded semantic controlsは今回のtypography controlsで網羅できていない。photoのcontrolsを流用して認定しない。
- 全曲の全採用演出の意味的実現率、全30条件の品質、現行最終HEADのUI/CI/公開検証はこの集計だけでは認定できない。1540設定の母集団と42 control動画、19unit、寄与frame数を混同しない。

## stable-travel反例の追加精査

`unseen5c92-03-stable-travel-contract-mismatch.json` は原動画最終unitのprimary settle FAILEDと、画像focusを対象としたcontinuity/stable-travelと、主歌詞にも実装されたduo settle項の共存を並記。Native/decoded加速が一致しても正しい対象の意図確認を代替しない。3つの厳密actualframe PNGを保存。`release-unseen-stable-travel-control.yml` は別途事前登録した当該hookのみの3encodeであり、他controlsの再実行を誘発しない。主歌詞の失敗を解消済みとはしていない。

精密化: duoの主歌詞にも `dx=.035W*(1-ease(u*3))` のsettle項が存在する。画像stable-travelのみを正当な意図と断定しない。上位climax/continuity/closingとの合成軌道を全区間で減速検査した失敗であり、対象と時間範囲を分離した確認が必要。
