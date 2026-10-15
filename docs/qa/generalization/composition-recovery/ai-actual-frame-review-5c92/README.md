# AIによる完成MP4フレーム確認（5c92）

外部専門家・人間評価ではない。結果既知の5条件を、画像閲覧前に固定した動画長1/6・1/2・5/6の各±0.125秒で確認した。新旧10動画・90実デコードフレーム。actualPTS・動画SHA-256・入力条件・現行planはmanifestに保存。

固定サンプル内で重大な字形欠損・文字切れ・意図しない文字の重なりは確認しなかった。ただし全編検査、全演出実現、美的優劣、QUALITY_GOの証明にはならない。

## development-09 — MATCHED

- 1.542–1.792s: previous two-line centered phrase becomes a single line with a leftward composition; full phrase remains visible within the sampled image.
- 4.875–5.125s: both retain the same centered two-line phrase, with slightly different scale/background bar positions.
- 8.250–8.500s: neither contains lyrics; current reference last cut ends 8.09s, so this is consistent with planned tail rather than sampled evidence of missing active lyrics.

Sampled first/middle contrast is preserved. A lower hook/perceptual score does not identify a concrete glyph defect in these frames; the samples cannot establish improved musical timing or overall artistic quality.

- 限界: Current first phrase is closer to the left edge; no visible clipping in these samples.
- 限界: Fixed windows do not cover section transitions or all beat events.

## holdout-08 — MATCHED

- 1.542–1.792s: thin serif-like lettering becomes heavier block lettering, placed against a right-side grid while background bars remain visible.
- 4.875–5.125s: lyric appears below a wide image band in both; current band is cropped differently. Text remains distinct from the band.
- 8.250–8.500s: background-only tail in both; current reference final lyric ends at 7.75s.

There is still a visible first-to-second phrase composition change. Lower temporal/motion score is not itself evidence of a broken or absent effect. Local text/background separation is visibly strong in the sampled current frames.

- 限界: These short HOLD windows are near-static in both versions and cannot validate complete motion trajectories or beat synchronization.
- 限界: Heavier type and more grid decoration are a creative tradeoff; no claim that they are artistically superior.

## development-03 — PCM_CONFOUNDED

- Current uses a much heavier display type than previous; current first/second phrases have more consistent scale/position.
- At 8.250/8.375s current final phrase is one narrow line near upper-middle, while previous is two larger lines near lower-middle; at 8.500s both are background-only.
- Current reference final cut ends at 8.43s, consistent with disappearance by the 8.500s sample.

The diversity score reduction corresponds to a real typographic/composition difference, rather than proving a sampling-only score artifact. However the different decoded PCM and changed font mean this is not an isolated causal test of the code change. The one-line final phrase is smaller and less prominent at thumbnail scale.

- 限界: A genuine legibility/composition tradeoff remains; cannot declare the 72→24 difference resolved or harmless over the full movie.
- 限界: No sampled missing glyph or major clipping was found, but frame samples cannot certify reading-time sufficiency.

## holdout-01 — PCM_CONFOUNDED

- First sampled phrase remains centered in three lines, with similar white-on-dark visual hierarchy.
- Second phrase changes from two lines to three and shifts lower, providing a different first-to-second phrase composition.
- Both versions have background-only tail frames after the last planned lyric interval.

A visible composition change accompanies the higher current diversity score, but confounded PCM prevents assigning that improvement to the algorithm alone. Neither sample set establishes full-film creative improvement.

- 限界: Three-line presentation is a stylistic change; no independent human preference is available.

## development-05 — PCM_CONFOUNDED

- First phrase moves from below the framed image to over the image; its two lines remain visible.
- Second phrase moves from centered over the image to a black band below the image.
- Final phrase changes from 途切れない / 声を刻む to 途切れ / ない声 / を刻む in the sampled frame. All characters remain visible; the lexical unit 途切れない is split across lines.

The change is a real layout variation with a word-internal line break. It is not proof of missing source text or a technical glyph defect, but the final break is less natural for Japanese reading in this AI inspection and should not be described as an unqualified quality improvement.

- 限界: Word-internal wrapping is a specific creative/readability tradeoff requiring honest disclosure; no human verdict or full-film acceptability certification.
- 限界: PCM mismatch prevents isolated causal comparison.

音楽適合・各演出の独立寄与はこの確認ではUNMEASURED。独立した人間評価は未実施（HUMAN_UNVERIFIED）。既存指標、合格閾値、release gatesには変更していない。
