import { readdir, readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSourceOrder, auditBootstrap, auditBoundary } from './source-order.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFile(path.join(root, name), 'utf8');
const {version} = JSON.parse(await read('package.json'));
if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid application SemVer');
const sources = await readSourceOrder(root);
const js = auditBootstrap+'\n'+(await Promise.all(sources.map(async name => (await read(`src/${name}`))+auditBoundary(name)))).join('\n');
const mux = '/*! mp4-muxer v5.2.2 | MIT License | (c) 2023 Vanilagy | see THIRD_PARTY_NOTICES.md */\n' + await read('vendor/mp4-muxer.min.js');
const localFontCSS=(await Promise.all([['Regular',400],['Bold',700]].map(async ([name,weight])=>
  `@font-face{font-family:"JIZURA Noto CJK JP";src:url(data:font/woff2;base64,${(await readFile(path.join(root,'assets','fonts',`NotoSansCJKjp-${name}.woff2`))).toString('base64')}) format("woff2");font-weight:${weight};font-display:block}`))).join('\n');
const title = 'KAMEN（仮面） | 日本語歌詞MV';
const description = 'KAMEN（仮面）。背景画像・音源・LRC／TXTから楽曲に合わせた日本語歌詞MVを自動制作し、MP4で書き出せます。';
const canonical = 'https://jankendo.github.io/JIZURA_KAMEN/';
const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>
${localFontCSS}
${await read('app/style.css')}
</style>
</head>
<body>
${(await read('app/body.html')).replaceAll('__APP_VERSION__',version)}
<script>
window.KAMEN_APP_INFO=window.JIZURA_APP_INFO=Object.freeze(${JSON.stringify({name:'KAMEN',edition:'Custom Edition',version})});
${mux}
${await read('vendor/aac-browser.min.js')}
</script>
<script>
${js}
</script>
</body>
</html>
`;

await mkdir(path.join(root, 'dist'), { recursive: true });
await Promise.all([
  writeFile(path.join(root, 'index.html'), html, 'utf8'),
  writeFile(path.join(root, 'dist', 'index.html'), html, 'utf8'),
]);
const bytes = Buffer.byteLength(html, 'utf8');
console.log(`Built index.html and dist/index.html (${bytes.toLocaleString('en-US')} bytes; ${sources.length} source modules).`);

// Distribute the notices referenced by the embedded font and codec bundles.
await Promise.all([
  ...['LICENSE', 'THIRD_PARTY_NOTICES.md'].map(name => cp(path.join(root,name),path.join(root,'dist',name))),
  cp(path.join(root,'assets','OFL.txt'),path.join(root,'dist','OFL.txt')),
  cp(path.join(root,'vendor','LICENSE.mp4-muxer.txt'),path.join(root,'dist','LICENSE.mp4-muxer.txt')),
  cp(path.join(root,'vendor','licenses'),path.join(root,'dist','licenses'),{recursive:true}),
]);
