"""Source-bound checkpoint evaluation; does not certify experimental sources."""
def evaluate_technical(source,ci,selected):
 required={'startup','background upload','TXT import','LRC import and timing','audio upload and analysis','automatic MV generation','preview playback','project save and reload','regenerate after restored audio','UI MP4 export and decode'}
 checks={x['name']:x for x in ci.get('browser',{}).get('checks',[])}
 failures=[];missing=[]
 def check(ok,reason):
  if not ok:failures.append(reason)
 check(ci.get('expectedPRSourceCommit')==source,'CI_SOURCE_MISMATCH')
 tree=ci.get('githubGitTreeExactMatch',{});check(tree.get('status')=='EXACT' and bool(tree.get('sourceTree')) and tree.get('sourceTree')==tree.get('mergeTree'),'CHECKOUT_TREE_MISMATCH')
 if ci.get('workflowStatus')!='SUCCESS':missing.append('SUCCESSFUL_CI_REQUIRED')
 tests=ci.get('tests',{});check(tests.get('failed')==0,'REGRESSION_FAILURE_OR_MISSING_RESULT');check(tests.get('passed',0)>0 and tests.get('total')==tests.get('passed',0)+tests.get('skipped',0),'REGRESSION_TOTAL_MISMATCH')
 if ci.get('browser',{}).get('status')!='PASS' or ci.get('overlayReportStatus')!='PASS' or ci.get('uiBoundaryReportStatus')!='PASS':missing.append('BROWSER_ALTERNATIVES_OR_UI_BOUNDARIES_REQUIRED')
 if required-set(checks):missing.append('REQUIRED_BROWSER_CHECKS_ABSENT')
 check(all(c.get('status')=='PASS' for c in checks.values()),'BROWSER_CHECK_FAILURE')
 check(not ci.get('browser',{}).get('pageErrors') and not ci.get('browser',{}).get('resourceFailures'),'BROWSER_RUNTIME_FAILURE')
 export=checks.get('UI MP4 export and decode',{});check(export.get('oneClick')is True and export.get('video')=='h264' and export.get('audio')=='aac' and export.get('decodedFrames',0)>0 and export.get('visibleContent')is True,'ONE_CLICK_DECODE_REQUIRED')
 check(selected.get('sourceCommit')==source and selected.get('oldSourceMovieReuseCount')==0,'FINAL_MOVIE_SOURCE_MIX')
 movies=selected.get('artifacts',[])
 if selected.get('conditionCount')!=30 or len(movies)!=30:missing.append('FIXED_30_MOVIES_INCOMPLETE')
 check(len({a.get('fixture') or a.get('condition') or a.get('id') for a in movies})==len(movies),'DUPLICATE_MOVIE_CONDITION')
 check(all(a.get('binding',{}).get('sourceCommit')==source and a.get('binding',{}).get('sourceDirty')is False and a.get('FAVStatus')=='MEASURED' and a.get('fullDecode')=='PASS' for a in movies),'FINAL_MOVIE_BINDING_OR_DECODE_FAILURE')
 return {'status':'FAIL'if failures else'UNVERIFIED'if missing else'PASS','failures':failures,'missing':missing,'scope':'Evaluates source-bound CI/browser/final movie summaries; original SHA-bound raw evidence remains mandatory and independently preserved.'}
