# Song-Native Director v1 実装記録

対象: `jankendo/JIZURA_KAMEN`。開始時 main: `2c4a7c244cd689de854f19b47714a93e0e72f529`。

## 実装範囲

|項目|結果|変更箇所|
|---|---|---|
|OPT-01|実装|`observeMVQuality` は既存観測チェーンをプライベートコピーで実行。`observationOnly` を呼び出し単位で伝播し、イベント修復・章修復・背景探索・素材選択変更を抑止。`11zzq` は修復呼び出しを実描画観測に変更|
|OPT-02|実装|`buildSongNativeDirection` が PCM envelope / onset / RMS休止、既存スペクトル時系列、LRC密度・再登場、画像の余白・コントラストから連続値を生成。`makeArtDirection`・`plan` に接続|
|OPT-03|軽量実装|歌詞長、密度、反復回数・前回位置、句読点、強調語数を保持。密度と反復が演出量と文字サイズへ影響。意味は `UNKNOWN`、既存キーワードは補助情報|
|OPT-04|限定実装、全面適応探索は見送り|story候補の実RGBA・歌詞マスクの指紋による同一描画候補の統合。既存32→最大8→最大3、近似画像差による除外、legacy安全性比較を維持。H.264キャッシュと探索全体の再設計は未実装|
|OPT-05|実装|`compareRegistryCandidates` の上位2案と基準案の詳細QAを削除。軽量描画で安全性・スタイル実現を確認し、確定案のQAはUIで実行。未評価案の品質は `UNMEASURED`|
|OPT-06|実装|`applySongNativeDirection`、`cinemaTemporalState`、`temporalCinemaFocus`、`cameraAt`、`mainDraw` から実描画へ反映。区間ごとの動き、カメラ進行、縮小方向の文字サイズ、安全な既存描画レイヤーの密度を設定|

## フローと契約

MV作成 → 既存解析・Song-Native設計 → 軽量style/story比較 → `searchSongNativeCandidates` による明示的な既存構図探索1回 → `observeMVQuality` → 観測された弱い行だけ `repairWeakSections` → 採用時にQA無効化・再観測。

- 既存API `analyzeRenderedFrames` は観測専用経路を呼び、互換性のため `lastPixelQA` を保存する。純粋APIは元planを変更しない。
- 修復はコピーで比較し、実描画rankの改善と既存の実出力背景整合コントラスト非劣化を確認できた場合のみ採用する。意図的な静止・手動ロックを除外する。
- 観測と修復はplan hash・範囲で結合する。古い観測は修復に使用しない。非同期探索中・観測中・修復中のplan変更とキャンセルは採用を止める。
- `cinemaV3.invalidate()` の契約は変更しない。採用後はこれを明示的に呼ぶ。
- planは `artDirection.songNativeDirection.version=1` に保存される。旧プロジェクトは自動移行せず従来方式を維持。壊れた新形式は再生成する。
- 音源時系列、歌詞、画像、画像解析、フォント設定、構図指定、出力条件を入力識別へ含める。再計画時に不一致の設計を作り直す。実際のフォントロード状態のQA無効化には既存 `qaRenderState` を使う。
- 固定プロファイルは色・書体・実行可能部品の事前分布として残す。実測時系列があれば安全な文字・保持・カメラの語彙をプロファイルをまたいで使用する。seed変更を曲固有性として採点しない。
- `fast` の完成MP4原則1回、`quality` の比較、H.264/AAC、縦横・SNS出力、最終MP4検証・provenanceを維持。出力時にSong-Native全探索を追加しない。

## 評価方式の変更と限界

従来の「上位2案＋基準案の詳細QAで選択」と同一の順位・品質を保証するものではない。現在は軽量な歌詞安全性・スタイル・描画差で選び、確定した計画を詳細観測する。詳細未評価の候補を品質既知とみなさない。最終出力の可読性・技術検証・decoded QAの基準は緩和していない。

Song-Nativeの曲内区間は既存解析に基づくヒューリスティックであり、音楽理論上の正解セクションではない。PCM由来と確認できない時系列は `PROVIDED`、ない場合は `UNMEASURED`。意味理解は主張しない。画像の意味・人物認識を追加していない。

## 軽量検証

- `dev/kamen_song_native_director_test.cjs`: T-01〜T-03。実観測チェーンと小さなCanvas範囲、探索禁止spy、plan不変性、明示探索・修復、QA無効化、古い証跡の拒否、同BPM・同平均エネルギーの異なる構造、決定論、保存復元、手動ロック、入力無効化、実画素差、16:9 / 9:16描画。
- FAST CIの既存9本: encoder lifecycle / codec fallback / export UI / render equivalence / fast pipeline / machine refinement / cinema state machine / semantic travel / final artifact。モックによる制御・品質ゲート検証であり、実MP4品質認証ではない。
- 変更JS構文、`npm run build`、Chromium起動スモーク。
- `kamen_story_director_test.cjs` は観測分離に合わせた期待値と明示観測へ更新したが、長い検証を避けるため今回は実行しない。

FULL CI、全回帰、大規模動画生成、長時間計測は実行しない。速度改善倍率は未測定。GPU実機使用は未確認。芸術品質の人間評価・曲間独自性の実動画評価は `UNVERIFIED`。
