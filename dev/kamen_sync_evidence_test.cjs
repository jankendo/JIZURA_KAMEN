require('node:child_process').execFileSync(process.execPath,[require('node:path').join(__dirname,'../scripts/test-sync-evidence.mjs')],{stdio:'inherit'});
