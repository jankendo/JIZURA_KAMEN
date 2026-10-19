"""Build the imported portion of the frozen current cohort; never finalize coverage."""
import pathlib,json,gzip
from bind_actual_dispatch_units import bind
from build_important_executed_population import build
Q=pathlib.Path(__file__).resolve().parents[1];O=Q/'composition-recovery/release-recovery-20261019'
spec=json.loads((O/'current32-frozen-inputs.json').read_text());traces=sorted((O/'current31-results').glob('*/dispatch/*/native-dispatch-trace.json.gz'));roots={str(t):t.parents[2]for t in traces};bindings={str(t):bind(t,roots[str(t)])for t in traces};d=build(traces,spec['sourceCommit'],bindings)
trace_values={str(t):json.loads(gzip.decompress(t.read_bytes()))for t in traces}
for r in d['rows']:
 t=trace_values[r['trace']];r['binding']=t['artifactBinding'];r['proofTypeProvisional']={'EXECUTED_IMPORTANT':'DYNAMIC','COMPOSITE_IMPORTANT':'COMPOSITE','INTENTIONAL_STATIC':'STATIC'}.get(r['classification']);r['targetContractFinalized']=False
 r['targetContractBlocker']='Local identity and composed primary stillness must be separated; no implicit world-space stillness.'if r['classification']=='INTENTIONAL_STATIC'else'Exact target, phase, semantic model and component attribution remain to be registered.'
d.update(expectedConditions=32,formalComparisonConditions=31,importedConditions=len(traces),currentPopulationComplete=len(traces)==32,importanceClassificationFinalized=False,releaseCredit=False)
(O/'current31-partial-population.json.gz').write_bytes(gzip.compress(json.dumps(d,ensure_ascii=False,separators=(',',':')).encode(),mtime=0));print(json.dumps({'conditions':len(traces),'rows':len(d['rows']),'important':len(d['expectedImportantIntentIds']),'classes':d['classificationCounts'],'warnings':d['warnings'],'finalized':False}))
