# KAMEN v11.1 persistence and direction changes

The eight-line supplied project serializes to 13,306,426 UTF-8 JSON bytes. Its `artDirection` is 12,720,047 bytes: `songNativeDirection` uses 6,357,331 and `songNativeResolved` uses 6,357,687. Selection traces occupy 2,947,154 bytes and alternatives 3,130,641 within each direction. A single example catalog occupies 315,062 bytes. Writing this metadata synchronously to localStorage exceeds Chrome's storage quota; repeating a complete portable write to the same storage cannot recover it.

## Durable contract

The existing `jizura-assets-v1` database and `assets` store now hold a `project-current-v2` record. No database version upgrade or deletion is required. Project metadata, background, image assets, pending audio files and available font bytes commit in one transaction. Synchronous put failures explicitly abort the transaction. A serialized queue and stale-job checks prevent earlier jobs from overwriting later snapshots; an expected-revision check inside the transaction protects against another tab's edits. Readback verifies the committed revision and metadata. Reload reads the project and referenced images/audio in one readonly transaction.

IndexedDB is authoritative. The optional `jizura.project.ref.v2` localStorage value contains only its key and revision; failure to write this reference does not invalidate a successful save. Legacy `jizura.project.v1` and matching recovery journals remain readable and are never deleted. Migration commits and reads back a new record before adopting it. A failed migration retains the legacy data. Existing font and asset keys remain unchanged.

## Projection, not renderer migration

`compactPersistentProjectV111` makes an independent copy. It removes only full candidate/exclusion histories and redundant capability catalogs from v11 traces and alternative traces. Adopted cuts, all phase evidence, multiscale evidence, alternatives, identities, locks, render contracts, resolved patches and their hashes remain unchanged. The identical projection applies to both direction copies so strict direction equality remains intact. Full catalogs remain available in the current generation's memory. Legacy v3–v10 payloads are not compacted.

The supplied snapshot becomes 1,872,714 bytes, a measured 85.926% reduction. Direction and resolved records become 640,475 and 640,831 bytes; asset data stays 554,345 bytes. These are UTF-8 snapshot sizes, not a claim about IndexedDB's implementation overhead or retained legacy backups. Both direction copies are deliberately retained to preserve the v9 restore contract.

## Failure states

Generation and Canvas validation finish before committing the new MV. A generation or validation failure restores the previous working project. A subsequent storage failure retains the new MV, preview, editing and file backup. The UI says it is unsaved and requests backup before reload. The save status supports mouse/keyboard retry; the existing processing error panel retains the error details. A successful retry clears the unsaved state. A beforeunload guard covers unsaved edits. Storage failures are classified as IndexedDB errors, including QuotaExceededError; no large localStorage fallback exists.

## Direction changes

Existing v11 registry discovery, role combinations, Pareto and beam search remain in use. Layout retrieval now observes current safe candidates' music fit and primary-mask similarity. Only a deficient converged frontier with input-derived change demand expands into unvisited live layout capabilities. Every added layout follows the existing actual Canvas safety/scoring path; no genre/word preset or technique-count reward is added.

The arc also compares separate observed glyph-mask structure, hold-mask movement, production camera transforms and overall color means against acoustic change. Background and decoration/FX isolation remains UNMEASURED. Whole-frame RGB is not presented as independent background evidence. Acoustic recurrence continues to govern whether repeated phrases retain or change expression.

The supplied project's old inspection reports exactly `hold`, `cam` and `treat` vocabulary violations, despite legitimate v11 registry choices (including neutral treatment). The v11 inspection now checks per-line registry validity, selected cut equality, locks, input binding and measured safety evidence. Legacy inspection remains unchanged. Missing registry entries still fail inspection.

## Canvas and scope

Repeated-readback probe, mask and glyph scratch contexts request `willReadFrequently`; preview and encoding contexts are unchanged. The creative probe reuses its context and bounds the call-local raster cache to 384 entries, evicting old results and recomputing when needed. No cross-generation cache is introduced. No wall-clock speedup or GPU performance improvement is claimed without a benchmark.

No Japanese language model or subject detector is bundled; no external model/API requirement or automatic upload was added. Semantics/subject recognition remains UNMEASURED; existing repeat, acoustic, saliency, contrast and whitespace signals remain available. Existing `observeExportedMP4`, `verifyDecodedCinemaLayers` and final-artifact validation already decode and inspect exported frames. This release does not claim a new encoded visual-quality PASS or produce repeated full-length MP4s. Artistic and social quality remain UNVERIFIED.

## Verification

The release evidence includes genuine Chromium localStorage quota exhaustion, >6 MiB snapshots, IndexedDB roundtrip/reload, legacy migration/retention, real transaction abort, revision supersession, generated-MV preservation under injected IndexedDB quota failure, portable backup/retry and generation-failure rollback. The large 8/50/100-line fixtures use valid v11 contracts with manual locks so storage testing does not repeat exhaustive searches; the supplied eight-line project separately covers real selected techniques, alternatives and all readable phases. Existing direction tests cover unlocked exploration, actual joint Canvas comparisons, both aspects, Japanese full text, LRC, alternatives and repair. Capacity tests do not certify all browser quotas or human aesthetic quality.
