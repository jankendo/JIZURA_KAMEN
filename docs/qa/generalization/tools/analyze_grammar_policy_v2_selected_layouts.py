"""Exact current source chosen layout realization. Presence is not aesthetic superiority."""
from pathlib import Path
import json,gzip
from analyze_isolated_layout_presence import analyze
Q=Path(__file__).resolve().parents[1];R=Q/'composition-recovery';S='d04c734bc5eb0c0c427a42a196cae3a507b89506';spec=json.load(open(R/'grammar-policy-v2-important-control-preregistration.json'));reports=[]
assert spec['sourceCommit']==S
for c in spec['controls']:
 if not c['hook'].startswith('registry:LAYOUTS:'):continue
 part=c['key'].split('-')[0];report=R/f"grammar-policy-v2-important-controls-{c['key']}/controls/effect-counterfactual-report.json.gz";reference=R/f"grammar-policy-v2-focused-{part}/matrix/{c['caseId']}-v3-reference.json.gz";d=analyze(report,reference,S);reports.append(d)
result={'sourceCommit':S,'reports':reports,'scope':'Selected primary layout placement and independent missing-ink negative controls across focused natural cases only; not font aesthetics, full motion semantics, complete original30 effects or artistic optimality.','human':'HUMAN_UNVERIFIED'};(R/'grammar-policy-v2-isolated-layout-realization.json.gz').write_bytes(gzip.compress(json.dumps(result,ensure_ascii=False).encode(),mtime=0));rows=[u for r in reports for u in r['rows']];summary={'sourceCommit':S,'operatorCasePairs':len(reports),'units':len(rows),'holdFrames':sum(u['actualHOLDFrames']for u in rows),'glyphObservations':sum(u['glyphObservations']for u in rows),'statuses':sorted({u['status']for u in rows}),'allImportantEffects':'UNVERIFIED'};(R/'grammar-policy-v2-isolated-layout-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
