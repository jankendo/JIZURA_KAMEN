/* Input-driven direction. Readability is a gate, not a template selector. */
(()=>{'use strict';const J=window.J,C=J.clamp;
J.songDirectionProfile=audio=>{
 const f=audio?.features||{},energy=C(f.energy??.5),rhythm=C((f.onsetDensity??f.density??.3)*.45+(f.beatStrength??.4)*.35+C(((audio?.bpm||f.bpm||100)-65)/115)*.2),attack=C(f.percussive??rhythm),smooth=C(f.smoothness??1-attack),brightness=C(f.brightness??.4),dynamics=C(f.sectionContrast??f.dynamics??.3);
 const scores={flow:smooth*.45+(1-rhythm)*.3+brightness*.25,punch:attack*.5+rhythm*.3+energy*.2,drive:energy*.45+rhythm*.35+dynamics*.2,drift:smooth*.3+(1-energy)*.4+(1-brightness)*.3};
 const mode=Object.keys(scores).sort((a,b)=>scores[b]-scores[a]||a.localeCompare(b))[0];
 return {version:1,mode,scores,energy,rhythm,attack,smooth,brightness,dynamics,source:'normalised audio energy, onset density, beat strength, tempo, spectrum and section contrast'};
};
const pcmKeys=new WeakMap();
J.registrySelectionAudioKey=audio=>{
 if(!audio)return null;const f=audio.features||{},b=audio.buffer;let pcm=null;
 if(b?.getChannelData){pcm=pcmKeys.get(b);if(!pcm){let hash=2166136261;for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<512&&d.length;i++){const v=Math.round(d[Math.floor(i*(d.length-1)/511)]*1e6);hash=Math.imul(hash^v,16777619)>>>0;}}pcm=[b.length,b.sampleRate,b.numberOfChannels,hash];pcmKeys.set(b,pcm);}}
 const keys=['energy','bpm','onsetDensity','beatStrength','brightness','bass','high','percussive','smoothness','sectionContrast','dynamics'];
 return JSON.stringify({duration:audio.duration,bpm:audio.bpm,pcm,features:Object.fromEntries(keys.map(k=>[k,f[k]??null])),beats:(audio.beats||[]).slice(0,256),timeline:f.detailedTimeline||f.timeline||[],sections:f.sections||[]});
};
J.songLayoutFit=(family,profile,energy,role,repeat)=>{
 const affinities={flow:{phrase:1,radial:.85,perspective:.8,statement:.65,reveal:.6,frame:.5},drift:{statement:1,shadow:.85,frame:.8,phrase:.65,reveal:.65},punch:{hero:1,banner:.95,condensed:.9,split:.85,depth:.8,frame:.5},drive:{condensed:1,diagonal:.95,depth:.9,hero:.85,banner:.8,phrase:.5}};
 let fit=affinities[profile.mode]?.[family]??.15;
 if(['intro','outro','break'].includes(role))fit+=(['statement','frame','shadow'].includes(family)?.25:-.2);
 if(['climax','chorus','reprise','hook'].includes(role)&&energy>.55)fit+=['hero','depth','banner','diagonal'].includes(family)?.22:0;
 if(repeat>0&&['phrase','split','banner'].includes(family))fit+=.1;
 return C(fit);
};
const plan=J.plan;J.plan=(project,audio)=>{
 const saved=project.artDirection?.registrySelection,key=J.registrySelectionAudioKey(audio);
 // A saved measured selection is valid only for the audio it was compared with.
 const input=saved?.audioKey&&key&&saved.audioKey!==key?{...project,artDirection:{...project.artDirection,registrySelection:null}}:project;
 const p=plan(input,audio);if(!p.musicalPhoto||p.directorSections7?.length)return p;
 const profile=J.songDirectionProfile(audio),ss=p.musicalStructure.sections;p.musicalPhoto.songProfile=profile;
 p.musicalPhoto.chapterZooms=ss.map(s=>{const e=C(s.energy??profile.energy),quiet=['intro','outro','break'].includes(s.role);return quiet?1.03:profile.mode==='drift'?1.06+e*.08:profile.mode==='flow'?1.08+e*.13:1.10+e*.23+(['climax','reprise','chorus'].includes(s.role)?.08:0);});
 p.musicalPhoto.chapterOffsets=ss.map((s,i)=>({x:['intro','outro'].includes(s.role)?0:(i%2?-1:1)*(profile.mode==='drift'?.008:profile.mode==='flow'?.025:.04),y:0}));
 p.musicalPhoto.cornerFrame=profile.mode==='punch';p.musicalPhoto.edgeMatte=['punch','drive'].includes(profile.mode);p.musicalPhoto.accentRail=profile.mode!=='drift';p.musicalPhoto.openingShots=profile.rhythm>.4;
 if(!p.musicalPhoto.openingShots)p.events=p.events.filter(e=>!e.photoShot);
 for(const c of p.cuts)if(c.line>=0&&!J.photoChoreographyLocked(p,c)){
  const s=ss.find(s=>c.start>=s.from&&c.start<s.to),energy=C(s?.energy??profile.energy),detail=['climax','chorus','reprise'].includes(s?.role)&&energy>.55,shot=detail?'DETAIL':profile.mode==='drift'?'WIDE':energy>.55?'MEDIUM':'WIDE';
  c.backgroundScene={...c.backgroundScene,id:shot,zoom:{WIDE:1,MEDIUM:1.10,DETAIL:1.23}[shot]};
 }
 return p;
};
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 const profile=p.musicalPhoto?.songProfile,c=J.cutAt(p,t);if(!profile||(c&&J.photoChoreographyLocked(p,c)))return camera(p,t,range);
 const ss=p.musicalStructure.sections,s=ss.find(s=>t>=s.from&&t<s.to);if(!s)return camera(p,t,range);
 const i=ss.indexOf(s),u=C((t-s.from)/Math.max(.1,s.to-s.from)),base=p.musicalPhoto.chapterZooms[i],direction=i%2?-1:1;
 let pose;
 if(['intro','outro'].includes(s.role))pose=camera(p,t,range);
 else if(profile.mode==='flow'||profile.mode==='drift')pose={s:base+(profile.mode==='flow'?.045:.016)*u,x:direction*(profile.mode==='flow'?.028:.008)*(2*u-1)*p.W,y:0,rot:0};
 else{const beat=(p.beatHierarchy||[]).filter(b=>b.time>=s.from&&b.time<=t&&b.beatSalience>=.5).at(-1),hit=beat?Math.max(0,1-(t-beat.time)/.18):0;
  pose={s:base+hit*(profile.mode==='punch'?.025:.012),x:(p.musicalPhoto.chapterOffsets[i]?.x||0)*p.W,y:0,rot:0};}
 if(i>0&&t-s.from<.24){const before=J.cameraAt(p,ss[i-1].to-.001,range),v=C((t-s.from)/.24),ease=v*v*(3-2*v);pose={s:J.lerp(before.s,pose.s,ease),x:J.lerp(before.x,pose.x,ease),y:J.lerp(before.y,pose.y,ease),rot:0};}
 return pose;
};
})();
