# Third-party notices

## Embedded Noto fonts

`assets/fonts/NotoSansCJKjp-{Regular,Bold}.{ttf,woff2}` are included in this repository; the WOFF2 files are embedded in the production HTML. Font metadata identifies Noto Sans CJK JP, © 2014-2021 Adobe. These fonts use SIL Open Font License 1.1; the official license is in `assets/OFL.txt`. Source and license: https://github.com/notofonts/noto-cjk/tree/main/Sans .

## Additional fonts (loaded on request)

The web app loads the following typefaces at runtime from Google Fonts (https://fonts.google.com/); they are not
included in this repository. They are distributed by their authors under the SIL Open Font License 1.1:
Noto Sans JP, Noto Serif JP, Dela Gothic One, Zen Kaku Gothic New, Zen Old Mincho, Kaisei Tokumin,
M PLUS Rounded 1c, Mochiy Pop One, DotGothic16, Yuji Syuku, IBM Plex Mono, IBM Plex Sans JP.

## Browser MP4 output, inspection and AAC fallback
Mediabunny 1.62.1 and @mediabunny/aac-encoder 1.62.1 by Vanilagy, MPL-2.0. Unmodified dependency source is available at https://github.com/Vanilagy/mediabunny/tree/v1.62.1 . AAC WASM uses FFmpeg (LGPL) as distributed by that package. Licenses are included under vendor/licenses; npm lock records exact distribution versions. No runtime CDN request is used.

The AAC dependency incorporates FFmpeg AAC WASM; the LGPL-2.1 text is in `vendor/licenses/FFmpeg-LGPL-2.1.txt`. The unmodified package and its bridge/build instructions are available at https://github.com/Vanilagy/mediabunny/tree/v1.62.1/packages/aac-encoder . Exact npm versions and integrity hashes are retained in `package-lock.json`; `node scripts/build-aac.mjs` reproduces the application bundle from those packages. The upstream build instructions do not pin an exact FFmpeg commit; corresponding-source and relinking compliance for that upstream binary has not been independently established. This is a documented upstream limitation, not a claim of complete license clearance.

The production distribution includes this notice, the original MIT license, the font OFL and the vendor license texts alongside `index.html`.

## JIZURA v0.10.1

Unmodified upstream source files and their SHA-256 checksums are in `vendor/jizura/`, pinned to https://github.com/852wa/JIZURA/commit/fc16bfe43ea4a6c25a21f1caf04d17326de14f00 . Copyright (c) 2026 hakoniwa; MIT license, retained in `vendor/jizura/LICENSE` and distributed as `LICENSE.JIZURA.txt`. The build isolates the namespace and adds one explicit photographic-background hook; the adapter is KAMEN code.

## @noble/hashes 2.4.0

The browser media bundle uses the unmodified SHA-256 implementation from https://github.com/paulmillr/noble-hashes to hash completed MP4s in bounded slices. Copyright (c) 2022 Paul Miller; MIT license, included in `vendor/licenses/noble-hashes-LICENSE.txt`. Exact package version and integrity are locked.
