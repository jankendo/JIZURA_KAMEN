> Historical release snapshot. Legacy engine behavior and commands below are superseded by [KAMEN 2.4](../README.en.md), [storage](STORAGE.md) and [validation](VALIDATION.md). Recorded QA is historical evidence only.

# KAMEN 2.2.0 — generation persistence and UI repair

Historical v2.2 release record. Current credits and layout: [v2.3](CREDITS_2_3_0.md).

## Root cause and behavior

In 2.1, startup called replan(), which scheduled an autosave even without an edit. Opening a second tab advanced the single saved record's revision. Generation in the first tab then failed the optimistic compare, rolled back a successfully generated MV, and replaced its diagnostic with a generic ready message.

2.2 observes actual editor changes rather than scheduling writes from preview replans. Work IDs and namespaced media separate concurrent copies. Genuine conflicts atomically fork rather than overwrite. Generated results survive storage failure with an unsaved warning; retries do not regenerate. Cancellation before commit and changed inputs reject stale generation. The work selector restores the correct project, image, audio and fonts.

## UI contract

Removed globally: legacy optimization/previous-draft comparison/safe alternatives, refinement-search controls, creative score panels, image-analysis controls, chant purpose, director context ZIP, AE export, nonfunctional credit-display controls and auxiliary-video upload. Legacy renderer/data modules remain for restoring and exporting saved MVs. No silent conversion of existing projects is introduced.

Retained: original themes and expression sets; manual colors/fonts/motion and locks; per-line/cut overrides; timing/tap/undo/history; background positioning; output presets, aspect, resolution/fps/bitrate/audio, range selection, PNG/MP4 and supported sharing. Standard style swatches and rerolls now use the active original renderer's vocabulary/palettes. Title/artist are inputs to JIZURA's original title/interlude treatment, not a promised persistent overlay.

## Verification and compatibility

The workspace Chrome suite exercises both tabs against real IndexedDB and validates media after reload. It also tests quota faults, input changes/cancellation, save/generation overlap, control effects and old-save migration with the source retained. The original-generator comparison and actual H.264/AAC matrix remain in CI; legacy persistence, engine contracts, streaming/muxer and encoder lifecycle checks are retained. Removed UI workflows are replaced by tests for the new behavior, not by relaxed rendering thresholds.

The broad historical engine suite was not declared green: its previously recorded 12 baseline failures and two skips remain separately documented in `docs/qa/upstream-legacy-regressions.json`. Current targeted results are recorded in `docs/qa/workspaces-2.2.0.json` and `docs/qa/upstream-2.2.0.json`. Linux Chrome is automated; Windows/macOS Edge, successful OS-native save dialogs and mobile browsers remain unverified.

## Release and rollback

Version/package/build/help/docs are synchronized to 2.2.0. PR and main CI both require the legacy-contract/build and production-MP4 jobs before Pages deployment. Post-deploy checks cover the release commit, concurrent work isolation/restoration and a real audio MP4 download with FFmpeg decode. A normal revert PR restores code; no destructive storage migration is used. A 2.1 rollback reads its retained v2 data; export 2.2 work files before downgrading because 2.1 does not understand workspace namespaces.
