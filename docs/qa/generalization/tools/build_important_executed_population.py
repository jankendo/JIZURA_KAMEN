#!/usr/bin/env python3
"""Inventory actual dispatch, never semantic certification. Rules frozen in v1."""
import argparse,collections,gzip,hashlib,json,pathlib
POLICY='important-executed-population-v2-shipping-selection'
def sha(x):return hashlib.sha256(x).hexdigest()
def read(p):
 b=pathlib.Path(p).read_bytes();return gzip.decompress(b) if str(p).endswith('.gz') else b
def classify(c,manual=False):
 g,i=c['group'],c['id']
 if manual:return 'MANUAL_LOCKED','Manual contract is separately protected, not natural-selection improvement.'
 if g=='TREAT' and i=='none':return 'NON_EXECUTION_IDENTITY','Identity treatment has no independent visual operation.'
 if (g=='HOLD' and i=='still') or (g=='CAMERA' and i=='stillCamera'):return 'INTENTIONAL_STATIC','Local identity operator; composite stillness is not assumed.'
 if g=='COMPOSITE_HOOK':return 'COMPOSITE_IMPORTANT','Composite hook dispatched; constituent attribution requires isolated controls.'
 # Decorations can encode meaningful events. Conservatively retain rather than exclude by size.
 return 'EXECUTED_IMPORTANT','Executed structural, lyric, image, camera, FX or transition operation; semantic success remains unmeasured.'
def build(traces,source,unit_bindings=None):
 rows=[];warnings=[]
 for file in traces:
  raw=read(file);t=json.loads(raw);bound=(unit_bindings or {}).get(str(file));
  if bound:assert bound['traceRawSHA256']==sha(raw),'DISPATCH_BINDING_RAW_SHA_MISMATCH'
  b=t.get('artifactBinding',{});same=t.get('exactNativeRGBA') is True and b.get('sourceCommit')==source
  implementations={(x['group'],x['id']):x for x in t.get('implementationIdentity',[])};aliases=collections.defaultdict(list)
  for x in implementations.values():aliases[(x['group'],x['functionObjectId'])].append(x['id'])
  calls=list(t.get('calls',[]));contract_calls={}
  for tc in t.get('temporalContracts',[]):
   contract=tc.get('contract',{})
   if contract.get('status')!='EXECUTABLE' or contract.get('mode')!='UNIFORM_TRANSLATION' or tc.get('charFnsAdded')!=1:continue
   key=tc['unitKey'];row=contract_calls.setdefault(key,{'group':'LYRIC_TEMPORAL_CONTRACT','id':'UNIFORM_TRANSLATION','unitKey':key,'pass':'main','calls':0,'firstTime':tc['time'],'lastTime':tc['time']});row['calls']+=1;row['lastTime']=tc['time']
  calls.extend(contract_calls.values())
  for c in calls:
   if c.get('calls',0)<=0:continue
   rawunit=c['unitKey'];resolved=bound['bindings'][rawunit] if bound else None;unit=resolved['resolvedUnitKey'] if resolved else rawunit;manual=unit in t.get('manualUnitKeys',[]);cl,reason=classify(c,manual);im=implementations.get((c['group'],c['id']))
   contracts=[x for x in t.get('temporalContracts',[]) if x['unitKey']==rawunit];roles=sorted(set(x.get('contract',{}).get('state',{}).get('role','UNMEASURED') for x in contracts));natural=t.get('automaticSelection') is True and t.get('directionSelectionMethod')=='SHIPPING_OPTIMIZE_DIRECTION_CANDIDATES_RENDERED' and not manual
   identity={'sourceCommit':b.get('sourceCommit'),'videoSHA256':t['videoSHA256'],'planHash':t.get('planHash'),'unitKey':unit,'group':c['group'],'operator':c['id'],'pass':c.get('pass'),'semanticRoles':roles}
   rows.append({'intentId':sha(json.dumps(identity,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()),**identity,'classification':cl,'classificationReason':reason,'naturalSelection':'NATURAL' if natural else 'MANUAL' if manual else 'UNMEASURED','important':cl not in ['MANUAL_LOCKED','NON_EXECUTION_IDENTITY'],'dispatch':c,'resolvedFinalUnitBinding':resolved,'implementation':im,'exactFunctionObjectAliases':aliases.get((c['group'],im['functionObjectId']),[]) if im else [],'aliasesDoNotRemoveIntent':True,'trace':str(file),'traceRawSHA256':sha(raw),'bindingStatus':'EXACT_CURRENT_ADOPTED_NATIVE' if same else 'STALE_OR_UNMEASURED','encodedStatus':'UNMEASURED','observedTarget':'UNMEASURED','actualDecodedTimestamp':None,'counterfactual':False})
  if not same:warnings.append({'trace':str(file),'reason':'Source or adopted Native correspondence is not exact; no current-source credit.'})
 counts=collections.Counter(x['classification'] for x in rows)
 return {'schema':1,'policy':POLICY,'sourceCommit':source,'importanceCriteria':'All executed structural/lyric/image/camera/FX/transition operations retained. Exact identity treatment is inactive. Local stillness remains important. Manual controls protected separately. Alias identity never removes an intent; shared implementation does not imply shared semantic realization. No result-dependent classification.','rows':rows,'classificationCounts':dict(counts),'expectedImportantIntentIds':[x['intentId'] for x in rows if x['important'] and x['naturalSelection']=='NATURAL'],'unknownNaturalPopulation':[x['intentId'] for x in rows if x['important'] and x['naturalSelection']=='UNMEASURED'],'observations':[],'warnings':warnings,'populationScope':'Only the supplied exact shipping Native traces. Executed calls are a conservative inventory; NO independent registration or universal important-completeness claim. Composite and alias semantics require target-specific controls.','independentSemanticStatus':'UNVERIFIED','human':'HUMAN_UNVERIFIED'}
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--source',required=True);a.add_argument('--output',required=True);a.add_argument('trace',nargs='+');n=a.parse_args();o=build(n.trace,n.source);pathlib.Path(n.output).write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'dispatchRows':len(o['rows']),'important':len(o['expectedImportantIntentIds']),'unknownNatural':len(o['unknownNaturalPopulation']),'classifications':o['classificationCounts']}))
