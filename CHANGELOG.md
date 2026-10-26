# Changelog

## 2.5.0 — 2026-10-26

- Add an audio-first export-range card using the shared waveform, start/end seconds, current-position markers, pointer/touch handles, keyboard adjustment and zoom.
- Separate whole-song playback from bounded range audition; schedule Web Audio end/loop positions independently of animation frames.
- Preserve custom seconds through generation, undo/redo, restore, portable files and concurrent-tab forks. Reset only after a successful different soundtrack load.
- Validate intervals in the UI and every export backend, freeze each export interval and block invalid/sub-frame selections. Keep existing full-song/SNS modes and retain manual seconds when switching.
- Restore timed-LRC detection on native plans so existing SNS suggestions continue to work, and keep cancellation controls outside editing locks.
- Verify actual MP4 source-frame alignment and decoded audio positions, range cancellation/AAC fallback, fractional endpoints and five responsive widths. See [range documentation](docs/EXPORT_RANGE_2_5_0.md).

## 2.4.0 — 2026-10-26

- Consolidate production generation/rendering on pinned JIZURA 0.10.1. Remove retired KAMEN optimizers, AE/CEP products/builds, dedicated tests and obsolete generated QA catalogs.
- Import legacy source image, lyrics, timing, metadata and available fonts/audio into a separate work; retain originals and require explicit regeneration. Explain missing fonts and media.
- Gate every UI MP4 action on generation readiness, invalidate readiness on material replacement, preserve immediate metadata editing, modern save/restore, undo/redo and conflict forks.
- Increase interactive targets to 44px, preserve dark responsive layout, simplify export terminology and move export diagnostics into the output dock only when an error exists. Remove the obsolete adaptive-FPS option; choose 24/30/60fps explicitly.
- Keep quantized animation from delaying lyric onset; add separation edges for primary photo lyrics and align credit glyph measurements with the rendered baseline/alignment. Clear stale share files after visual edits.
- Replace legacy CI contracts with current unit/UX/storage/native-video/credits checks; update README, storage, help and validation documentation.

Previous release records and their source commit are indexed in [history](docs/HISTORY.md). Verification and practical limits for this change are recorded in [the audit](docs/UX_AUDIT_2_4_0.md).
