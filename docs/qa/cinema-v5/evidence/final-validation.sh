#!/usr/bin/env bash
set -u
while kill -0 63657 2>/dev/null; do sleep 15; done
python3 - <<'PY'
from pathlib import Path
import json,shutil
root=Path('/workspace/kamen-v5-results');m=root/'matrix-final';a=root/'matrix-superseded-revisions';a.mkdir(exist_ok=True)
d=json.loads((m/'results.json').read_text());freeze=json.loads((root/'source-freeze.json').read_text());shutil.copy2(m/'results.json',a/'results.json');stale=[r for r in d['rows'] if r['variant']=='v3' and r.get('runtimeHTMLSHA256')!=freeze['runtimeSHA256']]
for r in stale:
 prefix=r['fixture']['id']+'-'+r['variant']
 for f in m.glob(prefix+'*'):shutil.move(str(f),str(a/f.name))
d['supersededHistory']=[{'fixture':r['fixture']['id'],'variant':r['variant'],'status':'SUPERSEDED','originalStatus':r['status'],'runtimeHTMLSHA256':r.get('runtimeHTMLSHA256'),'reason':'Source changed before final freeze; original evidence retained'} for r in stale];d['rows']=[r for r in d['rows'] if r not in stale];(m/'results.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('Archived',len(stale),'nonfinal rows, retained',len(d['rows']))
PY
cd /workspace/kamen-cinema-v5
KAMEN_CHROME=/usr/bin/chromium NODE_USE_ENV_PROXY=1 npm run test:cinema-export -- http://127.0.0.1:5185 /workspace/kamen-v5-results/ui-531eaa7 > /workspace/kamen-v5-results/ui-531eaa7.txt 2>&1
printf '%s\n' "formal_ui_exit=$?"
KAMEN_CHROME=/usr/bin/chromium NODE_USE_ENV_PROXY=1 node dev/one_click_browser_contract.cjs http://127.0.0.1:5185 /workspace/kamen-v5-results/ui-531eaa7 /workspace/kamen-v5-results/ui-531eaa7/ui-boundary > /workspace/kamen-v5-results/ui-boundary-531eaa7.txt 2>&1
printf '%s\n' "boundary_exit=$?"
KAMEN_CHROME=/usr/bin/chromium NODE_USE_ENV_PROXY=1 KAMEN_MATRIX_BASELINE_CINEMA=1 KAMEN_MATRIX_EXTRA=1 KAMEN_MATRIX_CASES=case-06,case-07,case-08,case-24,general-dark,general-dense,general-manual,general-people KAMEN_MATRIX_VARIANTS=baseline,v3 KAMEN_MATRIX_PROFILE=1 KAMEN_MATRIX_ALIGNED_EVIDENCE=1 KAMEN_MATRIX_FRAME_EVIDENCE=1 node dev/cinema_v3_matrix_benchmark.cjs http://127.0.0.1:5185 http://127.0.0.1:5184 /workspace/kamen-v5-results/matrix-final > /workspace/kamen-v5-results/matrix-rerun-531eaa7.txt 2>&1
printf '%s\n' "matrix_exit=$?"
