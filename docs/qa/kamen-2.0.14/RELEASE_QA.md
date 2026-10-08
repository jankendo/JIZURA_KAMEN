# KAMEN 2.0.14 — narrative direction and truthful qualification

The supplied 48-second film, QA JSON and ASSET PACK were inspected together.
The saved registry entries contained pulse on all 16 lyric lines. Slightly
changed spellings of the same vocalise were treated as unrelated phrases.
Pixel-impact proximity was labelled lyric sync; correct calm cue displays could
therefore receive a low score. Creative deficits did not prevent a completion
message.

## Changes

- Compare all catalogue styles/fonts/methods for actual readable glyphs, then
  compare the top three eligible styles with two narrative compositions each.
  Reject incomplete, distorted or unsafe glyph renderings. Evaluate the top two
  plans with the existing full QA, preserving its thresholds and measured scores.
- Balance photo style compatibility at audio 30%, image 28%, lyrics 26%, direction
  16%. The final style is selected after actual plan rendering, not profile Top-1.
- Group la/oh/ah vocalises independently of prolonged vowels and spelling length.
  Develop unity, expansion, crowd and release stages. Preserve musical boundaries
  and add repeat-stage boundaries, with at most eight chapters. Keep the first
  lyric boundary when consolidating nearby chapters.
- Render actual artwork tonal plates, planar detail windows, side compositions,
  music-timed opening crops, light sweeps and a distinct bitonal oh-stage. This is
  source-image transformation, not generated replacement art or inferred subject
  segmentation. Cache plates per source and release them on replacement/disposal.
- Limit automatic identical holds to two consecutive lines. Preserve explicit
  manual direction. Record legacy automatic hold repairs and retain a hard
  qualification failure if no compatible alternative can be realised.
- Compare five text anchors using image edge density, then test the actual full
  phrase at those anchors. Refit within safe bounds. This is a saliency proxy;
  it does not claim face recognition or guaranteed face avoidance.
- Prefer Japanese phrase/particle boundaries, including 今日も / ここにいるぜ.
  Omit recurring automatic body-lyric ornaments and credits. Honour explicit
  always-visible credits. Show default credits at opening/ending.
- Measure displayOnsetAccuracy from full visible rendered glyphs and real alpha
  masks around each supplied LRC boundary. Keep visualImpactSync and
  impactBeatSync separately. Visual impact at a calm lyric onset is diagnostic,
  not a failure of lyric display. Singing alignment remains unmeasured.
- Repair actual narrative light/depth/anchors and measured typography families
  before encoding, with a maximum of four raster passes and best-plan rollback.
  Encode once by default. Keep encoder cancellation, timeout and codec fallback
  behaviour from 2.0.13. Preflight can also be cancelled.
- Require measured primary minima 90, detail minima 80 and no hard failures before
  calling an export complete. Show remaining deficits in Japanese. Offer an
  explicit draft MP4 save, while retaining all technical export gates. Do not
  label a technically saved draft as a quality-certified completed work.

## Verification

The engine regression suite has 167 tests, including actual native Canvas
rendering, font geometry, four aspect ratios, source preservation, explicit
manual direction, technical export gates, stalled codecs, hidden queues,
abort/flush/cleanup, AAC fallback, sequential decoding, provenance and UI runtime.
Browser-only font and WebCodecs integration tests are unavailable in this
execution environment; their absence is explicitly reported, never a pass.

The supplied lyrics/background were also run through the new six-plan tournament
and four-pass preparation. All 16 full phrases appeared in the first/second
frame at the supplied LRC cue, with no premature display. A deliberately delayed
cue was rejected. The source project was unchanged, automatic holds did not run
three times consecutively, and la/oh each had four different narrative stages.
Seven chapters were retained. The native raster report after repair had visual
world 94, typography 95 and typography diversity 96; BROKEN_VISUAL_WORLD was
absent. This is automated raster evidence, not a human artistic rating.
Perceptual novelty, foreground novelty and temporal contrast still failed their
minima. The resulting qualification correctly remained QUALITY_UNMET.

A full supplied-source MP4 was generated with native Canvas and ffmpeg at
1280×720 / 30 fps, then decoded and checked for track format, frame count,
duration and pixel metrics. Its AAC stream was copied from a separately prepared
AAC input and its decoded PCM hash matched that AAC input. The original supplied
MP3 was untouched; this comparison is not a claim of bit-exact MP3-to-AAC audio.
Actual browser H.264/AAC execution, browser font availability, perceptual singing
sync, seamless audio/lyric looping and human/SNS response remain unverified.
Camera/light landing is designed; an arbitrary supplied audio ending is not
claimed to become a perceptually seamless loop.

Final validation notes: the last full suite reported 164 passes, one legacy
reserved-score contract failure and two browser skips. The reserved technical
score was being incorrectly replaced by the combined overall score; preserving
each score's original contract fixed it. Its targeted test, quality target,
export UI, original MP4 watchdog and photographic/manual-preservation tests all
passed after the correction. Combined coverage is 165 successful engine tests
and two explicitly unavailable browser checks.

The final native MP4, after reselecting from recomputed source PCM features and
running the four-pass preparation, contained 1,467 decoded video frames over
48.9 seconds. Unchanged decoded-export QA gave overall 93, creative 92, technical
100, typography 100 and visual world 93, with no hard-gate issues. The separately
measured LRC full-display score was 100. Remaining below-minimum metrics still
keep this film unqualified; the combined score is not a certification override.
The final encoded source/AAC-input decoded PCM hashes matched.
