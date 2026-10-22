# Song-Derived Creative Direction v11

New generations use optimizer 11 with the existing v9 renderer and persistence contract. Existing v3–v10 projects retain their original dispatch. No completed genre, chorus, intro, outro, keyword or song-specific profile is introduced. Seeded parameters come from each existing technique's planner, rather than a new animation library.

## Source findings and changes

At baseline `6b0787f3e1a4f5855f71a5d3eabe0cab573a393d`, `creativeRoleCandidatesV10` returned at most two entries, the joint search hard-gated candidates at the midpoint, pairs were explicitly enumerated, and `createRegistryRenderProbe` rejected clip/blur/echo by mechanism. The v10 arc combined primary ink with an impact scalar; v11 adds the complete RGB raster to arc distance. Existing SSM sections/relations, style scoring, Canvas, Pareto, beam, ablation and immutable call-local cache code are reused.

Responsibilities are separated in `src/11zzzzzzzzzo_song_derived_direction_v11.js`:

1. `songVisualIntentV11`: ordered onset/flux/energy, acoustic boundaries, phase, exact/near phrase relationships, Japanese glyph density and observed image saliency. Semantic interpretation, subject detection and subject-aware crop ranges remain unmeasured.
2. `directionCapabilityIndexV11`: live style and all ten technique registries, declared motion, source-observable mechanisms, temporal roles, availability/asset/input constraints. Registration, eligibility and actual production callback dispatch are separate.
3. `directionRoleCandidatesV11`, `directionRepresentativesV11`, style/layout retrieval: rank all eligible entries; preserve capability differences before raster comparison; expand layout/style retrieval when an initial frontier cannot establish temporal safety.
4. Joint search: draw independent candidates; derive interaction edges from spatial/temporal overlap and input demand; include unsafe individual states so combined treatment/background states may rescue them; refine complete states. Reuse deterministic component planners and the original decoration parameter factory. Bound the budget by input demand and terminate on an objective-fit plateau.
5. Temporal evaluation: inspect entry, completion, readable holds, exit, transient FX/transition windows and a local acoustic peak. Compare ablations at identical times. Pixel magnitude alone earns no quality reward.
6. Global arc: retain a safe contrast-demand reserve as well as Pareto/local candidates, then run the existing beam with full-raster/ink and acoustic recurrence/phase costs. Record unresolved monotony without failing otherwise safe generation.
7. A larger-raster final gate verifies only the composed shortlist at width 640; a failed state is removed and the existing beam chooses another safe sequence. The same gate protects independently generated alternatives. This caught an actual supplied-asset FX that passed at 256 but lowered contrast at 640; safety thresholds remain unchanged.
8. Commit/diagnostics: retain the v9 SELECTED/DRAFT/STALE, lock and restore semantics; add optimizer 11 evidence. Alternatives keep their own traces and arc. An optimizer-11 committed entry must contain an actually readable hold observation.

## Text safety

The probe distinguishes logical primary items from echo/streak copies and repeated band draws. It renders the primary core and an unclipped reference at the same transform, including the actual drawFx clipping/piece pipeline. Readable holds still require exact Japanese text, complete primary coverage, original contrast and geometry thresholds, safe bounds and minimum ink/size. Entry/exit may have bounded partial visibility only within the short declared windows, without substituted text or unsafe geometry; readable hold evidence is independently required. Normal clip/echo is tested alongside persistent clipping, missing glyphs, alpha/contrast failure and safe-area fitting/rejection in both aspects.

## Measured catalog

The current live registries contain **24 styles and 744 techniques (768 total)**:

| Registry | Count |
|---|---:|
| Layout | 174 |
| Enter | 102 |
| Hold | 38 |
| Exit | 86 |
| Decor | 115 |
| Treat | 52 |
| Background | 62 |
| Camera | 29 |
| FX | 66 |
| Transition | 20 |

Every generation records REGISTERED / CALLABLE / ELIGIBLE / PROBED / SAFE / SELECTED independently. PROBED is based on actual callback/builtin dispatch, not candidate membership. SAFE means a sampled composed state was safe for the particular input; it is not a general safety certificate for that technique. Disabled, asset-dependent and unsupported full-lyric layouts are not silently marked verified.

## Reproduction

```sh
node dev/kamen_song_native_v11_fast_test.cjs
npm run build
node scripts/serve.mjs dist 127.0.0.1 4173
node dev/browser_startup_smoke.cjs http://127.0.0.1:4173/
```

`KAMEN_CHROME` selects Chrome/Chromium. The four v11 test groups run in a real browser using the production source-manifest order and embedded Japanese font. They cover registry exploration/actual dispatch beyond the old top two, ordered-acoustic intent/recurrence/determinism, temporal glyph safety in both aspects and larger-raster rejection/reselection, and persistence/locks/alternatives/repair/export modes. Required FAST CI also retains all prior v3–v10 checks and the real UI generation/quality/commit/restore/rollback smoke.

Optional private supplied-asset test (does not upload assets or use the supplied current storyboard):

```sh
KAMEN_V11_ASSET_DIR=/path/to/unpacked/KAMEN_ASSET_PACK \
KAMEN_V11_REPORT=/tmp/v11-asset-report.json \
KAMEN_V11_SHEET=/tmp/v11-contact-sheet.png \
node dev/kamen_song_native_v11_fast_test.cjs
```

The Node native Canvas backend crashes in the existing `glow` halo path even under optimizer 10; the v11 broad search is therefore verified with the actual browser Canvas, without excluding the effect or changing production thresholds. Previous native FAST checks remain enabled.

## Limits

Sparse temporal probes do not certify every output frame or encoded MP4 survival. Unknown capability magnitudes remain labelled as priors. Source-token mechanism retrieval is an approximation; not every existing technique is rendered for every input. General Japanese semantic understanding, subject-aware image cropping and human artistic/audience/SNS quality remain UNMEASURED or UNVERIFIED. No full regression run, long encoded movie matrix or speedup claim is made. The private asset contact sheet is a technical review aid, not proof of improved artistic quality.
