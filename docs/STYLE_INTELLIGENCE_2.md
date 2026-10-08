# Style Intelligence 2.0 — implementation and validation

The current Sites source was opened at `adef46aab8354936d63fd34833fa2c2bede025fd`.
The supplied 2026-09-27 backup differs in the renderer, planner, motion engine,
quality engine, UI and tests. It was used for comparison only, never restored over
current source.

## Root causes

- The old style target table covered 13 styles; the remaining styles shared the
  same fallback vector. Archetype allowlists also strongly favored original styles.
- The final grammar reduced layouts to center/type and erased all decoration,
  while the Visual DNA continued to promise diagonal layouts and graphic lines.
- Image palettes replaced every style palette, and motion typography replaced
  style typography.
- Background and lyrics shared camera transforms. Reported glyph boxes ignored
  rotation and camera transforms. Credits used a low fixed opacity.

## Changes

`src/11r_style_intelligence.js` derives profiles from palette, typography,
texture, animation biases, decoration and mood metadata. Scores combine image,
audio, lyric typography and direction features. There is no random selection,
usage quota, or per-style score bonus. Existing explicit extra-style exclusions
remain honored.

AutoPalette keeps neutral readable foregrounds and blends style accents with
image harmony using measured chroma/contrast-dependent weights. Manual palettes
remain authoritative.

One style font family and one registry decoration are realized in actual cuts.
Bounded diagonal lyrics honor raw-rock direction. Background camera stays
continuous while lyrics remain in screen space, with beat/repetition animation.
Glyphs are measured after animation and clamped; the renderer collects actual
transformed glyph bounds. Repetition develops over the entire song rather than
stopping at the third repeat. Repeated chants retain continuous visible text.
Credits sample local rendered luminance/detail and adapt opacity and scrim.

Candidates with similar scores receive representative-frame and temporal checks.
Font, decoration and accent ablations measure actual rendered pixel differences.
At most two repair passes occur per proxy candidate. The existing three-pass
preflight remains bounded. Nine quality categories total 100 points; style
selection and realization are separate. Missing pixels/export validation and
critical defects prevent a perfect score.

The advanced Style inspector shows ranking and reasons. Export Studio retains
resolution, FPS, bitrate, audio, range and filename settings, with MP4/H.264
format labels and WebCodecs audio sample rate choices.

## Validation

- 14 existing test groups retained. Two old expectations intentionally updated:
  no decoration -> at most one bounded signature; repeated entrance -> no blank gap.
- 13 additional regression groups, including the requested test filenames.
- 14,000 deterministic independent synthetic media scenarios: all 24 styles
  appear in Top 1, Top 3 and Top 5. Distribution is intentionally unequal.
- Saved concrete input witnesses independently replay through the public ranking API.
- 24 style profiles, palette differences and actual planned cues checked.
- Browser fixture QA uses the supplied JSON, embedded background, original LRC,
  and AAC audio extracted without re-encoding from the supplied MP4.
- Browser ablation checks cover mono, blueprint, paper, ocean, candy and sumi.

## Limits

Quality points are engineering heuristics, not a guarantee of artistic quality.
Proxy inspection samples representative frames, not every possible frame or all
browsers/fonts. Style reachability proves synthetic reachability, not universal
human agreement with ranking. Some constraints can still require manual review.

The current source and static hosting manifest contain no Sites auto-lyrics-sync
backend, transcription endpoint, or usable native transcription adapter. LRC,
Tap Sync and waveform timing remain available. No fake automatic synchronization
was added, and no API key is exposed in the browser. A supported authenticated
speech-alignment service is needed for that separate capability.

`dev/browser_quality_harness.html` is development-only; supply `qa-fixture.json`
and `qa-audio.m4a` beside it in a local preview. Those original media and the QA
page must never be included in the deployment archive.

## Final measured result (2026-09-27)

- Original saved settings replay: 65/100, mono, realization 20% (plan cue audit).
  This is a replay score, not a blind numerical assessment of the supplied H.264 video.
  The supplied video's contact sheet separately confirmed left-edge clipping.
- Final browser proxy: 91/100, blueprint, realization 100%. The HTTP test browser
  has no WebCodecs, and its recorder cannot provide AAC. Export is blocked correctly.
- Offline same-source Canvas rendering: 93/100, blueprint, realization 80%.
  Accent ablation is below the strict 0.0001 threshold on the native Canvas renderer.
  Do not replace this result with the higher browser-only realization score.
- Full output: 1280x720, H.264, 30 fps, 1,722 frames, 57.400 s video;
  original AAC copied unchanged, stereo 48 kHz, 57.408 s audio. Full ffmpeg decode passes.
- Browser downloads were unavailable; the downloadable comparison uses the source
  renderer via optional @napi-rs/canvas and ffmpeg. It does not certify browser export.
- Fragmented MediaRecorder MP4 parsing now reads tfhd/tfdt/trun sample runs.
  Regression covers a real fragmented H.264/AAC file. Audio-required fallback only
  advertises explicit AAC MIME support; it no longer silently selects Opus-in-MP4.
- Version 2 category scores no longer spread an export failure into unrelated visual
  categories. Hard gates and readiness still fail when export is unsupported.

The offline helper is `dev/render_fixture.cjs`. Its optional local dependencies are
@napi-rs/canvas and ffmpeg; they are not needed for the static website.
