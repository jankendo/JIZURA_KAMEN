# KAMEN 2.0.11 — machine-scored lyric MV refinement

The supplied 2.0.10 sidecar reports musical direction 63, typography 95,
visual world 87, social 57, creative 74 and BROKEN_VISUAL_WORLD.
The unchanged overall formula gives approximately 75 from those scores.

The revised full 50.8-second reference MP4 was rendered at 30 fps, 1280 × 720,
encoded as H.264 with the original AAC stream copied, and decoded again with
ffmpeg. The existing KAMEN scorer returned:

| Metric | Decoded reference export |
| --- | ---: |
| Overall | 94 |
| Technical | 99 |
| Creative | 98 |
| Musical direction | 100 |
| Lyric timing proxy | 100 |
| Typography proxy | 99 |
| Visual world | 97 |
| Social proxy | 81 |
| Asset direction | 69 |
| Multi-image coherence | 97 |

No score weights, peak thresholds, timing tolerances, certification rules or
domain applicability were relaxed. The first compressed reference scored 87,
despite a 90-point pre-export Canvas result. Further revisions were evaluated
against the compressed artifact. The final decoded audio PCM SHA-256 exactly
matches the source audio. The decoded score, video hash, frame count and
structural checks are recorded in decoded-score.json.

Changes:

- Removed unrelated automatic beat pulses from the measured photographic
  presentation. The full phrase remains visible during a short size settlement.
- Fixed the renderer deleting the stored hookScale after rendering; this caused
  a delayed, unintended typography change and made rendering order significant.
- Replaced continuous spatial movement in lyric-free sections with gentle
  luminance development and selected salient-beat poses. Kept credits stable.
- Bounded background crop/grade candidates are rendered and compared with the
  original seven-channel world-distance evaluator, with unchanged targets.
- Added a consistent corner frame and a clean, bounded first-lyric push. The
  compressed reference without the frame scored 89; the framed full export
  scored 94. These are physical rendered changes, not score adjustments.
- Added decoded-MP4 feedback to browser exports: below 90, refine and re-encode
  up to three times; preserve the highest-scoring artifact, its plan and hash.
  A below-target result is labelled honestly in the sidecar. Cancellation,
  manual controls and original lyrics/audio are retained.
- Included the photographic motion law in contrast/presentation cache keys.

The full catalogue dispatch audit covered 24 styles, 724 techniques and the
24-font catalogue, with 4,476 isolated renderer calls over two aspects and
three phases. No dispatch failures were found. Native font renders are not
verification that every requested external browser font loads; the existing
per-face/per-weight browser availability checks remain in place.

Limits: the reference reconstructs a project from the supplied asset pack and
saved browser selection, using the pack's WebP and native fallback fonts. It is
not the original Windows Chrome session. Browser WebCodecs export and browser
font equivalence are not verified here. The original full-length soundtrack
has an audio loop-seam warning, which is retained. Semantic direction, authored
strong-event realization and audience impact are unmeasured/not applicable for
this reference. The unchanged certified100 gate is not satisfied. Overall 94
does not mean every domain exceeds 90, or that artistic quality is certified.

Reproduction: decode the supplied audio.m4a to mono Float32 at its source
48 kHz into audio.f32; run dev/kamen_machine_score.cjs with the extracted pack
and an output directory, then dev/kamen_machine_export.cjs with the same paths.
The reference export script uses 30 fps by default. KAMEN_RENDER_FPS=10 is only
for intermediate experiments; the recorded final reference uses 30 fps.
