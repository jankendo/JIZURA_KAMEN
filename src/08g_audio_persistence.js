/* Metadata guard for restoring only the soundtrack saved with this project. */
(() => {
'use strict';
J.audioAssetInfo=file=>({name:file.name||'',size:file.size||0,lastModified:file.lastModified||0,type:file.type||''});
J.audioAssetMatches=(info,file)=>!!(info&&file&&info.name===file.name&&info.size===file.size&&
  info.lastModified===(file.lastModified||0)&&info.type===(file.type||''));
})();
