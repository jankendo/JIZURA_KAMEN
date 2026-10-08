# Third-party notices

## mp4-muxer 5.2.2 (bundled)

`vendor/mp4-muxer.min.js` is embedded in `index.html` and is used to write MP4 files.
Source: https://github.com/Vanilagy/mp4-muxer — licensed under the MIT License:

```
MIT License

Copyright (c) 2023 Vanilagy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Embedded Noto fonts

`assets/fonts/NotoSansCJKjp-{Regular,Bold}.{ttf,woff2}` are included in this repository; the WOFF2 files are embedded in the production HTML. Font metadata identifies Noto Sans CJK JP, © 2014-2021 Adobe. These fonts use SIL Open Font License 1.1; the official license is in `assets/OFL.txt`. Source and license: https://github.com/notofonts/noto-cjk/tree/main/Sans .

## Additional fonts (loaded on request)

The web app loads the following typefaces at runtime from Google Fonts (https://fonts.google.com/); they are not
included in this repository. They are distributed by their authors under the SIL Open Font License 1.1:
Noto Sans JP, Noto Serif JP, Dela Gothic One, Zen Kaku Gothic New, Zen Old Mincho, Kaisei Tokumin,
M PLUS Rounded 1c, Mochiy Pop One, DotGothic16, Yuji Syuku, IBM Plex Mono, IBM Plex Sans JP.

## Browser AAC fallback
Mediabunny 1.61.0 and @mediabunny/aac-encoder 1.61.0 by Vanilagy, MPL-2.0. Unmodified dependency source is available at https://github.com/Vanilagy/mediabunny/tree/v1.61.0 . AAC WASM uses FFmpeg (LGPL) as distributed by that package. Licenses are included under vendor/licenses; npm lock records exact distribution versions. No runtime CDN request is used.

The AAC dependency incorporates FFmpeg AAC WASM; the LGPL-2.1 text is in `vendor/licenses/FFmpeg-LGPL-2.1.txt`. The unmodified package and its bridge/build instructions are available at https://github.com/Vanilagy/mediabunny/tree/v1.61.0/packages/aac-encoder . Exact npm versions and integrity hashes are retained in `package-lock.json`; `node scripts/build-aac.mjs` reproduces the application bundle from those packages. The upstream build instructions do not pin an exact FFmpeg commit; corresponding-source and relinking compliance for that upstream binary has not been independently established. This is a documented upstream limitation, not a claim of complete license clearance.

The production distribution includes this notice, the original MIT license, the font OFL and the vendor license texts alongside `index.html`.
