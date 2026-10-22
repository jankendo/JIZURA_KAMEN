# Song-native JIZURA direction v8

New generation uses `generateJizuraDirectionV8`; saved v3–v7 directions keep
version-specific planners, animation dispatch and resolved-decision contracts.
The v8 adapter reuses acoustic analysis and the legacy planner without applying
v7 generated glyph motion to registry cuts. It does not migrate saved projects.

## Selection and rendering

- Actual registries supply candidate definitions. Registered availability is
  separate from input-specific Canvas eligibility. No historical audit counts
  or old dispatch evidence are treated as current capability certification.
- Local energy, onset, spectral change, lyric dimensions, duration and supplied
  image statistics condition selection. There is no genre-to-recipe table.
- Existing style profiles shortlist three styles; up to two compatible fonts
  and a bounded layout shortlist receive actual Japanese phrase probes.
- Existing `registryCandidateCut`, `registryPhaseSafeAnchorState`,
  `registryGeometryRepresentatives`, `registryCandidateTrace` and
  `chooseRegistryStoryboard` are shared. The extracted render probe preserves
  legacy photo comparisons' flags and time bounds. V8 uses production drawing.
- At most three distinct safe geometries per line reach coordinate selection
  of independent enter/hold/camera/treatment/exit components. Available continuous
  components have conservative per-component motion capability declarations;
  undeclared components remain available for manual authoring and unmeasured.
  These declarations are not completed profiles or genre recipes.
- All composed candidates pass the inherited full-text, no-extra-label,
  distortion/collision, safe-area and contrast hard gates at entry, hold and
  release samples. Unsupported or fading exits may lose to a cut release to
  retain the full lyric until its next LRC cue. Failed gates are not relaxed.
- Eight-wide beam search uses actual primary ink/typography signatures,
  acoustic differences, style-change costs and repeated-phrase relationships.
  The composed winner is rechecked before atomic adoption.
- Selected cut styles/palettes, fonts and effect IDs drive the renderer and UI.
  Registry holds execute without v7 glyph trajectories, legacy hook amplification,
  duplicate ghost passes or secondary automatic typography/camera modulation.
  V8 uses actual renderer time and a C1 hold envelope. Its analysis trajectory
  uses monotone Hermite interpolation; that trajectory does not animate glyphs.

## Persistence and evidence

V8 stores selected cuts, a compact candidate trace, input identity, renderer
compatibility and build source hash; it stores no PCM, temporary Canvas or images
of candidate frames. Exact resolved decisions also preserve accepted repairs.
Diagnostic QA changes do not change source identity. Manual locks exclude units
from selection. The final selection is bound to both input and render decisions.

Quality observes complete glyphs, safe bounds and composite contrast separately
from uncalibrated music/creative judgments. Pixel differences are reported as
measurements without novelty points based on IDs. Missing evidence stays
UNMEASURED, artistic quality stays UNVERIFIED, and no artistic or social score is
inferred from a readability pass. Full encoded-video quality remains unmeasured.

## Bounded checks

`node dev/kamen_song_native_v8_fast_test.cjs` contains four contract groups:
registry dispatch/UI; acoustic conditioning/determinism/locks; production Canvas
and C1 safety in two aspects; exact v8 and v3–v7 restore and repair finalization.
The existing v7 fast test protects its renderer and saved-project behavior.
`npm run build` and `dev/browser_startup_smoke.cjs` exercise the production bundle
and the actual v8 UI generation/quality/save/restore path. CI retains every
previous required step and adds the v8 fast contract file.

No full regression suite, bulk MP4, long-form generation, performance benchmark,
GPU/memory profiling or human artistic evaluation is part of this release.
