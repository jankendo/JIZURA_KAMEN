# KAMEN 2.4 browser storage

Processing is local. Storage belongs to a browser profile and origin; localhost and GitHub Pages do not share it. No project/media backend is used.

## Current contract

IndexedDB remains `jizura-assets-v1`, version 1, store `assets`. No destructive schema upgrade is performed.

| Key | Content |
| --- | --- |
| `workspace:<id>` | Format 3 record: ID, revision, project, savedAt and optional forkedFrom. |
| `workspace-media:<id>:background` | Original background data URL. |
| `workspace-media:<id>:audio` | Matching audio File, when at most 120 MiB. |
| `workspace-media:<id>:font:<assetKey>` | Available uploaded-font bytes. |

A readwrite transaction atomically checks revision and commits metadata/media. Same-tab saves serialize; superseded edits are not committed. A genuine concurrent-tab conflict forks into a new UUID with its own media. Subsequent saves stay in that work. The saved-work selector waits for unsaved edits and refuses switching if saving fails.

Opening/restoring/replanning and mode changes do not write a new current-format revision. Real edits debounce for 700 ms. Explicit saves and pagehide with unsaved changes also flush. Quota failure preserves the in-memory result and exposes retry and JSON backup. Do not close an unsaved work before backing it up.

`jizura.workspace.v3` in sessionStorage pins a tab's selection. localStorage `jizura.workspace.last.v3`, `jizura.project.ref.v3` and `jizura.workspace.changed.v3` are hints/notifications, not authoritative data. A hint failure does not invalidate an IndexedDB commit.

## Legacy source import

Old localStorage, format 2 records and old-engine format 3 works are inputs to source-only conversion. Lyrics, line-owned timing, title/artist, active background, font metadata/available bytes and matching audio are copied into a **new** format 3 work. The original record and its media are never overwritten/deleted. Timing indices from old sorted LRC representations are remapped to native source order. Stored timingOrder 2 remains unchanged.

Old optimizer/genome/cut decisions and archived multiple-image/video decks are not carried into the modern work. The old renderer is not loaded. The resulting `generation` identifies pinned JIZURA with `generated:false`. `sourceImport = {version:1, sourceEngine:'kamen', requiresGeneration:true}` explains the conversion and gates output. Explicit generation clears requiresGeneration; original data remain unchanged.

Missing images, audio or font bytes are shown for reselection. A missing old background can be reselected in the new work. A damaged current work still blocks automatic overwrites to protect its original data. Selecting an old original again intentionally creates another source import. No automatic garbage collection removes originals.

## Portable files and current works

`.kamen.json` contains lyrics, timing, generator metadata, image, settings and available font bytes. Local IDs are outside the file. Opening always creates a new work. Audio bytes are not embedded: keep and reselect the original audio. Its saved identity is used for reconnection during that session; unresolvable audio metadata is not committed as if bytes had been copied.

Current JIZURA projects retain seed, overrides, credits, locks and generation metadata. Unsupported generator versions are rejected. Same audio identity can reconnect without invalidating generation; replacement audio or lyrics/image requires regeneration. Manual visual/timing edits remain editable without replacing the selected seed. Undo/redo covers project settings and image references; audio replacement is outside that history.

Optional credits remain `{version:1, mode, position, size}`. Missing credits in existing modern works preserve native metadata pixels. New and legacy-source imports use hybrid/auto/standard defaults. Credits participate in undo/redo, autosave, forks and portable files.

Browser storage is not a durable backup; eviction/private-mode cleanup can remove it. Forks and legacy source copies consume additional quota. Keep project JSON and audio externally.
