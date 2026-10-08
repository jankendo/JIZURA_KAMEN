const assert=require('node:assert/strict'),J=require('./style_test_harness.cjs');
const still=Array.from({length:13},(_,i)=>({time:i,grid:Array(12).fill(.22),palette:[.22,.24,.26],layout:'type',style:'noir',line:'chant',box:{x0:.1,y0:.3,x1:.9,y1:.7}}));
const flat=J.measurePerceptualNovelty(still);assert.equal(flat.score,0);assert.equal(flat.stagnationSeconds,12);
const changing=still.map((x,i)=>({...x,grid:Array.from({length:12},(_,j)=>(i+j)%2?.9:.05),palette:[i%2,1-(i%2),.4],layout:i%3?'type':'center',style:i%2?'noir':'blueprint',line:String(i),box:{x0:.1+(i%2)*.1,y0:.3,x1:.9,y1:.7}}));
const active=J.measurePerceptualNovelty(changing);assert(active.score>flat.score);assert(active.stagnationSeconds<flat.stagnationSeconds);console.log('Visual stagnation and low resolution perceptual novelty pass.');
