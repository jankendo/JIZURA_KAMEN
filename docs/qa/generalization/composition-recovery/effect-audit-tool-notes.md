# 演出監査の追加ツールと判定範囲

- `classify_selected_operator_population.cjs SOURCE RESULTS[.gz] OUTPUT` は計画の設定を手動・静止契約・明示無時間・自然選択未実行確認へ分け、同じ実行時function objectのみaliasとして併記（同じ関数本文SHAでも別closureは統合しない）する。設定数を独立した演出数とは扱わない。既存FAVの主歌詞semantic observationだけを別の母集団で集計する。
- `verify_frozen_native_source_continuity.cjs URL INPUT CASE VARIANT OUTPUT EXPECTED_SOURCE` は元のshipping MP4に付随する全出力Native RGBAを、新sourceの同じfrozen planの全出力Native RGBAと時刻・寸法・FPS込みで厳密に比較する。プレビューや別planは除外し、唯一の全フレームgroupを要求する。入力reference SHA、元video binding、compiled current source/cleanを検証する。実際のexportと同じglyph maxRes、opaque canvas、asset preparationを使う。
- 両ツールはソースの演出・品質閾値を変更しない。Native一致は新しいplanner候補選択、UI、音声エンコードや実MP4保存の検証の代替ではない。
- sourceの異なる静的alias表はSTALEと記録する。別sourceの映像に現sourceの認定を付け替えない。
- `effect-minimal-control-preregistration.json` はphoto 1素材の既存8hook controlsに欠けるno-image/multi-imageの重要実行をnative-firstで絞る案。既存のcontrolsがまだ完了していない状態で作成した。

構文確認はPASS。ブラウザーは親タスクの単独profileを優先し、無断で追加起動していない。独立した外部専門家による評価は実施していない。HUMAN_UNVERIFIEDを維持する。
