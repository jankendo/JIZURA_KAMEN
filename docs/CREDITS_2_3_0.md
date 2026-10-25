# KAMEN 2.3.0 — shared credits and editor layout

## Behavior

Enter 曲名 and アーティスト, then choose MVの曲名表示. New works use `hybrid`: large first/last three seconds, small in between. `ends` uses only those edges; `always` stays small; `none` hides metadata. Clips up to six seconds use the large state throughout in hybrid/ends. A quarter-second fade/crossfade softens the edges. Partial exports use their selected range as the credit timeline, without extending the video. Blank fields produce no empty label; either field works alone. Long titles wrap to two rows and artists to one, with ellipsis; stored metadata remains complete.

Positions are automatic or bottom-right/bottom-left/top-right/top-left. Size has three levels. Automatic placement samples native lyric glyph bounds at 20/50/80% of each cut on a separate low-resolution renderer, chooses the least overlap and caches the result. It is an estimate: full-screen lyrics, fast motion and background subjects may still overlap. Choose a fixed corner when needed. Padding and a dark backing preserve contrast on light/dark backgrounds. Portrait scaling and safe margins keep labels inside the canvas. Embedded Noto is used without adding a network font dependency.

Preview, MP4, still PNG, regular PNG ZIP and transparent PNG ZIP use the common final compositor. Transparency retains the backing behind text. Native title/interlude metadata is suppressed only for explicitly configured modern credits, including `none`; cut indices, original generation decisions, morph transitions and duration remain intact. Existing projects without `credits` retain native pixels. Changing metadata or display options replans the overlay without regenerating the MV.

## Layout and persistence

The existing dark visual language remains. Desktop uses a compact input/generation sidebar and a larger preview/export column. At widths below 1100px it becomes a single column; detailed editing follows the preview. Advanced sections collapse, the preview is capped at 65vh, and progress/download links stay inside the output dock. File open/save/help stay accessible. Aspect changes retain chosen resolution/FPS. Edit detection substitutes small media-reference tokens before canonical comparison instead of cloning large image strings.

`project.credits = {version:1, mode, position, size}` is optional. New defaults are `hybrid/auto/standard`; legacy absence remains absent on load, undo and restore. An explicit mode change enables the overlay. Existing browser-work IDs, optimistic revision checks, atomic conflict forks, media references and storage format 3 remain unchanged. See [storage](STORAGE.md).

## Verification

Recorded Linux Google Chrome checks (synthetic assets, no user data):

- [Credits/layout report](qa/credits-2.3.0.json): 15 groups, no skips. Covers phases/ranges/Unicode, exact legacy pixels, duplicate suppression, automatic overlap/cache and native morph preservation, light/dark contrast, visible controls, large-media edit detection, history/reload, resolution/FPS, 375/768/1024/1100/1440px layouts, real H.264/AAC export with video retry, AAC fallback, normal/transparent ZIP decoding and portable restore.
- [Workspaces](qa/workspaces-2.3.0.json): 21 browser groups for conflict forks, media isolation, migration, quota/retry, cancellation and controls.
- [Original generator and MP4](qa/upstream-2.3.0.json): 18 groups including original seed/theme comparisons, actual output matrix, video/AAC faults, cancellation, corruption and a 180-second export.
- Actual movies are inspected by FFprobe and fully decoded by FFmpeg. Credits are checked against rendered pixels. Every exported ZIP PNG is decoded, dimensions/alpha checked and credit pixels counted. CI uploads screenshots, movies and reports as temporary artifacts rather than committing media.
- Legacy v3–v16 contract checks and export UI checks passed locally. CI also retains persistence, startup, streaming/muxer and encoder lifecycle checks. This does not claim the historical full `npm test` suite is green: the preceding release recorded 12 unrelated legacy failures and two skipped browser-evidence tests after its adapter fixes; those remain separate from these targeted checks.

Windows/macOS native save dialogs, Edge and physical mobile devices are not verified here. Responsive Chrome viewport testing is not physical-device testing. Automatic placement is not a guarantee of zero overlap or an artistic quality certification.

## Release

Version 2.3.0 builds from the source manifest. PR CI checks both engine contracts and actual browser/video output; main deploy depends on both jobs. Roll back through a revert PR if needed. No server or external API was added. Original JIZURA stays pinned at `fc16bfe43ea4a6c25a21f1caf04d17326de14f00`; upstream vendored files are unchanged.
