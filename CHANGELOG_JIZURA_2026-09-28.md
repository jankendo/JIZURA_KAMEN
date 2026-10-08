# JIZURA Change Log — 2026-09-28

## Controlled Maximalism / social export and QA

- Added input-driven CLEAN, STANDARD, HIGH_ENERGY and HYPER visual-energy tiers, including Advanced overrides and an attention budget.
- Added an immediate opening title punch, a lyric-aligned three-second hook, beat accents, blue-black club-color treatments, and word-group rendering without changing source lyrics.
- Added Style Arc planning across compatible existing styles, background crop/color variation, and progressively larger/diagonal repeated phrases.
- Added a 12–15 second LRC-aligned SOCIAL HOOK with re-edit, preview, export range and loop scoring. FULL MV remains the default; the existing 60-second highlight remains available.
- Split Quality Engine results into technical, creative and social domains. Added visual novelty/stagnation analysis and Hook Strength, Scroll Stop Power, Visual Energy Density and Social Shareability measures with readability, clipping, motion and consistency hard gates.
- Added the Advanced Director Bridge JSON panel with schema validation and plan-reality checks.
- Removed a Canvas-crashing `atomOrbit` from additional high-energy and Director-selected overlay candidates after reproducing the native renderer failure.
- Added regression coverage for visual stagnation/novelty, score domains, Style Arc, density/attention budget, kinetic tokenization, repeat development, SOCIAL HOOK re-edit/loop and Director JSON.
- Re-generated and inspected a FULL MV (57.408 s) and SOCIAL HOOK (13.834 s) from the supplied Gamba chant assets; MP4 streams and representative frames are included in the sample archive.

## Compatibility and constraints

- No React migration and no destructive source rewrite. Existing styles, expression registries, custom-background flow, Style Engine 2.0, Style Realization, DNA Reality, camera safe-area checks, LRC/Tap Sync/waveform timing and export paths remain.
- No Sites Auto Lyrics Sync API/runtime capability was present in the opened Sites source or hosting manifest. Auto Lyrics Sync remains unimplemented; this avoids a fake backend.
- Breaking project schema changes: none. New project preferences are optional and default to `auto` / FULL MV.
- Validation: `npm test` PASS (51/51); `npm run build` PASS; `git diff --check` PASS. Both representative MP4 outputs were inspected as H.264/AAC. See `QA_REPORT_2026-09-28.md` for scores, frame QA and limitations.
