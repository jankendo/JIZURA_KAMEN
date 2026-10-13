# Generalization verification checkpoint

Current source: `ec5dcb1325de96c7c9cbc67a1fca6adfec999978`. Technical and quality gates are UNVERIFIED; PR #13 remains Draft, main and production unchanged.

The final-source native registry audit passes all 3,152 conditions (18,864 renderer calls, zero runtime failures). Actual variable-font import/raster/export and strict complete decode pass. These do not certify encoded survival of every technique or artistic quality.

Both affected `d003305` SNS exports pass lyric safety and full decode. Earlier `60cf632` preserves 30 matched pairs/60 decoded movies; current lyric verification was 28 MEASURED/2 FAILED. Do not relabel those as final-source output. Typography observations were mixed (10 improved, 4 equal, 16 declined).

The `holdout-06` Blob reproduces identical failed observations under identical input, plan and browser conditions; native controls pass and removed-ink controls fail. Native/codec negative-background mismatch is unresolved, and missing glyphs have not been established. See `same-blob-60cf632/`.

Earlier CI failures were caused by cropping square output into 160×100 during a raster test; the clean-restore child repeated that failure. All 146 layouts × 4 correctly proportioned profiles now produce primary lyric pixels locally. Earlier failures are preserved.

Exact final-source [CI](https://github.com/jankendo/JIZURA_KAMEN/actions/runs/38406769389) and [30-pair matrix](https://github.com/jankendo/JIZURA_KAMEN/actions/runs/38406872173) are in progress. Detailed current gate state is in `final-gates.json`. HUMAN_UNVERIFIED is retained.
