import json,urllib.request,subprocess,hashlib,datetime
from pathlib import Path
out=Path('/workspace/kamen-next-evidence/docs/qa/generalization/composition-recovery/release-eb60-observations');repo='/workspace/kamen-quality-root';source='eb60d3f2e55fcee6995ad3d5cdb5f11c1acb544f';previous='9f805e269e1e34ffb232117a5cb19a699ae0b94d'
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):
 b=(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode();(out/n).write_bytes(b);return {'path':n,'sha256':sha(b)}
def git(*a):return subprocess.check_output(['git','-C',repo,*a])
runrefs={}
for runid in [38715099842,38693458381,38678201061,38693303491,38693788748]:
 raw=json.load(urllib.request.urlopen(f'https://api.github.com/repos/jankendo/JIZURA_KAMEN/actions/runs/{runid}'));jobs=json.load(urllib.request.urlopen(f'https://api.github.com/repos/jankendo/JIZURA_KAMEN/actions/runs/{runid}/jobs?per_page=100'))
 r=dump(f'github-run-{runid}.json',raw);j=dump(f'github-jobs-{runid}.json',jobs)
 normalized={'sourceCommit':raw['head_sha'],'headSha':raw['head_sha'],'status':raw['status'],'conclusion':raw['conclusion'],'url':raw['html_url'],'rawRun':r,'rawJobs':j}
 runrefs[runid]=dump('current-ci.json' if runid==38715099842 else f'historical-run-{runid}.json',normalized)
changed=git('diff','--name-only','-z',previous,source).decode().split('\0');changed=sorted(x for x in changed if x)
records=[]
for name in changed:
 classification='TEST_HARNESS_ONLY' if name.startswith('dev/') else 'QA_DOCUMENTATION_ONLY' if name.startswith('docs/qa/') else 'UNCLASSIFIED'
 records.append({'path':name,'classification':classification,'diffHunkSHA256':sha(git('diff','--no-ext-diff','--no-renames','--binary',previous,source,'--',name))})
def tree(rev):
 rows=git('ls-tree','-r','-z',rev).split(b'\0'); rows=[r for r in rows if r and r.split(b'\t')[1].decode() not in changed];return sha(b'\0'.join(rows))
oldtree,newtree=tree(previous),tree(source)
proof={'sourceCommit':source,'fromCommit':previous,'toCommit':source,'gitDiffSHA256':sha(git('diff','--no-ext-diff','--no-renames','--binary',previous,source,'--')),'changedPaths':records,'excludedExactPaths':changed,'beforeRemainingGitTreeSHA256':oldtree,'afterRemainingGitTreeSHA256':newtree,'remainingGitTreeIdentical':oldtree==newtree,'shippingPathChecks':{path:git('rev-parse',previous+':'+path).decode().strip()==git('rev-parse',source+':'+path).decode().strip() for path in ['src','scripts','app','assets','vendor','package.json','package-lock.json']},'currentAuditWorktreeCommit':git('rev-parse','HEAD').decode().strip(),'auditWorktreeTreeMatchesRelease':git('rev-parse','HEAD^{tree}').strip()==git('rev-parse',source+'^{tree}').strip(),'gateEligibility':'UNVERIFIED_UNSUPPORTED_QA_ONLY_CORRESPONDENCE','limitations':['Existing release gate accepts CI_ONLY only under.github/workflows; these changes are dev harness/docs and must not be mislabeled.','The proof concerns unchanged shipped inputs, not successful final-source CI/browser completion or unchanged build metadata.','Historical9f Native evidence retains originalsource; it is not an eb60 execution.'],'proposal':['Add explicit narrowly audited TEST_HARNESS_ONLY/QA_DOCUMENTATION_ONLY classifications in a separately reviewed gate change, with complete changedpath diffSHA checks and exact shipped-input-tree identity proof.','Require finaleb60CI regression/build/actualbrowser observations independently; no reuse of failed9fCI.','Retain sourceCommit in each movie and require fullsourcechain evidence from5c92 to9f before current equivalence.']}
dump('qa-only-source-correspondence-proposal.json',proof)
dump('checkpoint-run-index.json',{'releaseSourceCommit':source,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runRefs':runrefs})
print(json.dumps({'remainingTreeIdentical':oldtree==newtree,'changedPaths':changed,'newCI':38715099842}))
