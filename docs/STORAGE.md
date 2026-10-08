# JIZURA browser storage

## Scope

JIZURA is a client-side app. It does not send projects or media to an application server. The saved data below belongs to the browser profile and origin where the app was opened. A local copy at `localhost` has a different storage origin from the hosted Site, so browser storage is not transferred automatically.

## Current stores

| Store | Version | Keys | Contents | Purpose |
|---|---:|---|---|---|
| `localStorage` | key suffix `v1` | `jizura.project.v1` | One JSON project snapshot: lyrics, timings, style/direction settings, title/artist, background metadata, user-font metadata, audio-file identity, and other project options. Normally the background data URL is stored in IndexedDB and this record has `customBg.storedInIndexedDB: true` with an empty `customBg.dataUrl`; when IndexedDB is unavailable, a small background may be kept directly in the record. | Automatic restore of the current project. Writes are debounced by 700 ms and flushed on `pagehide`. |
| `localStorage` | no version | `jizura.mode` | The last UI mode (`easy` or `pro`). | Written when the mode changes and restored on startup when the value is valid. |
| IndexedDB | database `jizura-assets-v1`, version `1` | object store `assets`, key `background` | Background image as a data URL string. | Keeps large background data outside localStorage. |
| IndexedDB | database `jizura-assets-v1`, version `1` | object store `assets`, key `audio` | The selected audio `File`/`Blob`. | Attempts to restore the selected audio in the same browser origin. Audio is saved only up to 120 MiB. |
| IndexedDB | database `jizura-assets-v1`, version `1` | object store `assets`, key `font:<content-hash>` | Uploaded font binary as a `Blob`. The key is content-derived so identical files reuse one stored asset. | Restores uploaded fonts after reload without putting binary data in localStorage. |

There is no Service Worker, Cache Storage, Web Worker, or server-side project database in the checked source. Exported video object URLs are temporary download/share URLs and are revoked after use; they are not persistent backups.

## Project JSON export/import

The app's **保存 / 開く** controls export/import a `.jizura.json` project. Export serializes schema version 2, the available background data URL, project settings, and uploaded font binaries as data URLs. Import migrates older files, normalizes fields against the current defaults, forces Japanese UI language, validates style/aspect and other setting ranges, restores embedded background/fonts when possible, and clears the saved audio reference.

The project JSON does **not** contain the audio bytes. Users should keep the original audio file and select it again after importing. A project can become large when a high-resolution background and font binaries are embedded.

## Migration and recovery

- `jizura.project.v1` remains the localStorage key. Its payload and exported projects are normalized by `J.migrateProject`; schema version 1 inputs are migrated to schema version 2, with missing settings filled from current defaults and invalid style/aspect values reset safely.
- IndexedDB schema version is `1`; the `assets` object store is created if missing. No separate migration history exists in source.
- To move project settings, background, and uploaded fonts between browsers, use **保存** in the source browser and **開く** in the destination browser, then select the audio again. This exports the one current project; it is not a browser-profile-wide export.
- To preserve the complete browser profile state, use the browser's own site-data backup/export tools. Do not assume copying the Site source or a ZIP includes a user's browser storage.
- Clearing browser/site data removes autosaved projects and IndexedDB media, including audio and custom fonts. Keep `.jizura.json` files and original audio files separately.

## Backup limitations

This source backup can document storage schemas, but it cannot read or extract a user's private browser `localStorage`/IndexedDB data from a remote Sites deployment. No per-user browser database is exposed through the Site source project.
