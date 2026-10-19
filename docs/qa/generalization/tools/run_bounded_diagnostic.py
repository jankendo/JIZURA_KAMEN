"""Bound an individual QA subprocess and its descendants; never target unrelated app/server processes."""
import os,signal,subprocess,time,json,pathlib,sys

def descendant_groups(pid):
 records=[tuple(map(int,line.split()))for line in subprocess.check_output(['ps','-e','-o','pid=,ppid=,pgid='],text=True).splitlines()];desc={pid}
 while True:
  expanded=desc|{p for p,parent,g in records if parent in desc}
  if expanded==desc:break
  desc=expanded
 return sorted({g for p,parent,g in records if p in desc and g>1 and g!=os.getpgrp()})

def run(command,seconds,log,env=None):
 start=time.monotonic();timed=False;groups=[]
 with open(log,'w')as out:
  process=subprocess.Popen(command,env=env,stdout=out,stderr=subprocess.STDOUT,start_new_session=True)
  try:code=process.wait(timeout=seconds)
  except subprocess.TimeoutExpired:
   timed=True;groups=descendant_groups(process.pid)
   for group in groups:
    try:os.killpg(group,signal.SIGTERM)
    except ProcessLookupError:pass
   try:process.wait(timeout=5)
   except subprocess.TimeoutExpired:pass
   for group in groups:
    try:os.killpg(group,signal.SIGKILL)
    except ProcessLookupError:pass
   process.wait();code=124
 return {'exitCode':code,'timedOut':timed,'elapsedSeconds':round(time.monotonic()-start,3),'deadlineSeconds':seconds,'terminatedDescendantProcessGroups':groups,'scope':'QA process only; timeout does not imply a normal production export failure or semantic PASS.'}
if __name__=='__main__':
 receipt,seconds,log,*command=sys.argv[1:];pathlib.Path(log).parent.mkdir(parents=True,exist_ok=True);d=run(command,float(seconds),log);pathlib.Path(receipt).write_text(json.dumps(d,indent=2)+'\n');print(json.dumps(d));raise SystemExit(d['exitCode'])
