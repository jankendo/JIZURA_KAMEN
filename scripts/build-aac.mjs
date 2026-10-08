import {build} from 'esbuild';
await build({entryPoints:['scripts/aac-browser-entry.mjs'],bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,outfile:'vendor/aac-browser.min.js',legalComments:'eof'});
