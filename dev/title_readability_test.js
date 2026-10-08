const assert=require('node:assert/strict'),J=require('./style_test_harness.cjs');
const p=J.defaultProject(),s=J.STYLES.blueprint;const d=J.planTitleDisplay(p,'読めるタイトル','Artist',s,1920,1080,{realityVersion:2});assert(d.opacity>=.7&&d.scrim>=.18);assert(d.titleSize*364/1920>=10);console.log('Screen-space title has readable size and local contrast support');
