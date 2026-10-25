# KAMEN 2.2 browser storage

KAMEN processes projects and media in the browser. Storage belongs to the browser profile and origin: localhost and GitHub Pages do not share it. No application server receives project/media content.

## Current storage contract

The IndexedDB database remains `jizura-assets-v1`, version 1, object store `assets`. No destructive database upgrade is required.

| Key | Contents |
|---|---|
| `workspace:<id>` | Format 3 record: `id`, independent `revision`, `project`, `savedAt`, optional `forkedFrom`. Project media contain local reference flags instead of large data URLs. |
| `workspace-media:<id>:background` | This work's background data URL. |
| `workspace-media:<id>:audio` | This work's audio File/Blob, when at most 120 MiB. |
| `workspace-media:<id>:font:<assetKey>` | Uploaded font bytes. |
| `workspace-media:<id>:visualAsset:<id>` / `proAsset:<id>` | Retained legacy assets needed for existing projects. |

A single readwrite transaction commits a project's metadata and media. It compares the saved revision before writing. In-memory edit generations suppress superseded saves; they are separate from persisted revisions. Opening an editor, restoring, replanning a preview or switching display mode does not schedule a save. Actual edits are debounced for 700 ms; explicit save stages and pagehide with unsaved changes also flush.

Each tab pins its selected ID in sessionStorage `jizura.workspace.v3`. localStorage `jizura.workspace.last.v3` is only a hint for new tabs. `jizura.project.ref.v3` is a small reference, and `jizura.workspace.changed.v3` refreshes the saved-work list in other tabs. Failure to write these hints does not invalidate a committed IndexedDB record. The mode and tap preferences use `jizura.mode` and `jizura.tapOpts`.

## Concurrent tabs and recovery

Opening another tab does not change a project's revision. If another tab actually edits the same work, the stale writer creates a new UUID and atomically saves its full project and media there. The other tab's work is untouched. Subsequent saves stay in the new work. The saved-work selector restores either copy; switching waits for unsaved edits to commit and stays on the current work if saving fails.

A generated MV stays available in memory after quota/storage failure. The interface distinguishes completed generation from unsaved data and offers project-file backup, export and save retry. Do not close or reload an unsaved work before making a backup. Cancellation before generation commits retains the previous MV; changed inputs cancel stale results.

Old `project-current-v2`, shared media keys, `jizura.project.v1`, old reference keys and recovery records are migration inputs. The first successful import copies them into a new format 3 namespace; originals are not deleted or overwritten. Later startup uses the new work, avoiding repeated imports. Existing projects retain their legacy rendering engine until explicitly regenerated. A damaged or incompletely restored record blocks automatic overwrites.

## Portable project files

**プロジェクト保存** downloads `.kamen.json`, including lyrics, timing, generator metadata, background, settings and available custom font bytes. Local workspace IDs are outside this document. Opening a project file creates a new local work. Audio bytes are not embedded: retain the original audio and select it again after import. Existing compatible JSON files remain supported.

Browser-local work is not a durable backup. Browser cleanup, private mode, device changes or storage eviction can remove it. Keep project files and original audio externally. There is no automatic deletion of older works or migration originals in 2.2. Forking copies media and consumes additional quota. Do not clear browser storage as a conflict-resolution step.

## Release verification

`dev/workspace_conflicts_e2e.cjs` covers idle startup, two tabs, genuine concurrent edits, independent media restoration, repeated generation, quota/retry, cancellation, changed inputs, overlapping save/generation, common controls, work switching, and migration from localStorage/v2 IndexedDB. The existing persistence test covers full localStorage quota, 8/50/100 lyric rows, real transaction aborts and legacy render-decision restoration. See `docs/qa/workspaces-2.2.0.json` for recorded results.
