# Changelog

## 2.4.0 — 2026-10-26

- Consolidate production generation/rendering on pinned JIZURA 0.10.1. Remove retired KAMEN optimizers, AE/CEP products/builds, dedicated tests and obsolete generated QA catalogs.
- Import legacy source image, lyrics, timing, metadata and available fonts/audio into a separate work; retain originals and require explicit regeneration. Explain missing fonts and media.
- Gate every UI MP4 action on generation readiness, invalidate readiness on material replacement, preserve immediate metadata editing, modern save/restore, undo/redo and conflict forks.
- Increase interactive targets to 44px, preserve dark responsive layout, simplify export terminology and move export diagnostics into the output dock only when an error exists. Remove the obsolete adaptive-FPS option; choose 24/30/60fps explicitly.
- Keep quantized animation from delaying lyric onset; add separation edges for primary photo lyrics and align credit glyph measurements with the rendered baseline/alignment. Clear stale share files after visual edits.
- Replace legacy CI contracts with current unit/UX/storage/native-video/credits checks; update README, storage, help and validation documentation.

Previous release records and their source commit are indexed in [history](docs/HISTORY.md). Verification and practical limits for this change are recorded in [the audit](docs/UX_AUDIT_2_4_0.md).
