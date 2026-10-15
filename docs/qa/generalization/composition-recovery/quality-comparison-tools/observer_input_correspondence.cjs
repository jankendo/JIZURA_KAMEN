'use strict';
module.exports=function classifyInputCorrespondence(fields){
 const required=['audioHash','imageHashes','lyricsHash','projectHash','rendererVersion','proceduralTextureVersion','outputProfile','userLocks','inputHash'];
 if(required.some(k=>typeof fields[k]!=='boolean'))return 'REJECT_INCOMPLETE_CONTRACT';
 if(Object.values(fields).every(v=>v===true))return 'MATCHED';
 if(fields.audioHash===false&&fields.inputHash===false&&Object.entries(fields).every(([k,v])=>k==='audioHash'||k==='inputHash'||v===true))return 'VISUAL_ONLY_PCM_MISMATCH';
 return 'REJECT_NON_AUDIO_MISMATCH';
};
