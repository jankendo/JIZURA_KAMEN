# KAMEN 2.0.10 — selection and attachment review

The attached 2.0.9 export is not an artistic 100/100 result. Its own QA records creative=69, BROKEN_VISUAL_WORLD, and unmeasured audience/perceptual singing quality. Sampling the actual MP4 confirms a largely repeated photographic composition. These measurements are evidence, not an artistic rating.

## Changes

- Independently compare all 24 catalogue font roles (including an explicitly embedded bold face). Track the requested family and weight independently. Unavailable browser faces are excluded instead of treating a fallback as the decorative face; native font availability is labelled unverified. Network font waits are bounded and settled timers are cleared.
- Compare 24 style profiles using actual representative lyrics. Layout planner inputs now include full phrase text, character count, viewport and duration, so missing planner metadata cannot falsely eliminate a technique.
- Compare glyph contrast with the composite immediately before the first primary glyph is painted, including readability scrims and background plates. An automatic candidate requires measurable opaque glyph interiors, contrast p10 >=3, full phrase preservation, safe bounds, stable geometry and no incidental labels. Contrast is one engineering input, not a claim of perceptual or accessibility certification. Multi-item backing is sampled before the first item.
- Rank layouts using actual phrase geometry/contrast, musical role, repetition and recent family use. Compare all entrance/hold methods, retain only methods compatible with full lyric reading, and select holds using a stationary control plus phrase-specific probes. Static is still a valid choice for restraint; it is no longer hard-coded for every phrase.
- Preserve the measured photographic style/font identity throughout automatic chapters. The legacy automatic arc cannot insert an untested alternate style. Explicit director arcs and manual overrides remain authoritative.
- Develop the photographic camera continuously across sections, with a bounded closer view on reprises/climaxes and a return toward the original view in the outro. No fabricated lyric times or word-level singing times are added.
- Preserve lyric post-effect protection, full supplied artwork, storage format, audio pipeline, export validation, and the separation of artistic findings from technical export failures.

## Validation

- Existing engine regression suite: 158 passed, 2 browser-only checks skipped; no failures. Final focused checks additionally cover font weight availability, actual attached lyrics/selection in 4 aspect ratios × 30 probes (120 samples), manual overrides, lyric post-effect protection, glyph contrast, camera continuity, repeated glyph masks, export UI, export gates, bounded outro and saving behavior.
- Complete catalogue rerender: 24 styles and 724 techniques in 16:9 and 9:16, with 3 phase probes each. Credit-only layouts are explicitly excluded from primary lyric probes. 4,476 renderer calls, no native rendering warnings/errors, all remaining methods dispatched or explicit identity operations. See `catalog-native.json`.
- Final attached fixture uses the provided background, audio feature context, original LRC and the background geometry/darkness recorded by the attached QA. The original complete editable project/manual settings were not supplied; default credit configuration is used. This is not an exact recreation of every original manual control.
- Native Canvas reference sequence uses H.264/AAC, 1280×720, 30fps, 50.8 seconds. The source AAC is copied; decoded audio hashes are checked. This reference encoder is ffmpeg, not the browser WebCodecs pipeline. See `attachment-native-evidence.json` and `selection-result.json` for the final measured findings.

## Limits

Native Canvas font fallback cannot establish browser availability or exact browser rasterization. Browser WebCodecs end-to-end export was not run in this session because the prescribed browser-control skill is unavailable. No audience test, perceptual singing alignment, virality prediction, subject recognition or artistic 100/100 certification was established. Actual exported QA continues to report such limits instead of replacing them with perfect scores.

Regenerate the MV with the same supplied inputs to apply the new tournament to existing saved work.
