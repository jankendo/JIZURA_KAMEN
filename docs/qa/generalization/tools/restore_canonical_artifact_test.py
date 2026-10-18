import tempfile,pathlib,gzip,hashlib,copy
from restore_canonical_artifact import restore
h=lambda b:hashlib.sha256(b).hexdigest()
with tempfile.TemporaryDirectory() as td:
 r=pathlib.Path(td);root=r/'root';out=r/'out';root.mkdir();chunks=[b'one',b'two'];allraw=b''.join(chunks)
 entries=[];n=0
 for i,b in enumerate(chunks):
  (root/str(i)).write_bytes(b);entries.append({'preserved':str(i),'offset':n,'bytes':len(b),'SHA256':h(b)});n+=len(b)
 m={'files':[{'member':'trace.zip','bytes':n,'SHA256':h(allraw),'chunks':entries}]}
 assert restore(root,m,out,'')==1 and (out/'trace.zip').read_bytes()==allraw
 for mutate in ['chunk','offset','whole','path']:
  bad=copy.deepcopy(m)
  if mutate=='chunk':bad['files'][0]['chunks'][0]['SHA256']='0'*64
  if mutate=='offset':bad['files'][0]['chunks'][1]['offset']=0
  if mutate=='whole':bad['files'][0]['SHA256']='0'*64
  if mutate=='path':bad['files'][0]['chunks'][0]['preserved']='../outside'
  try:restore(root,bad,out,'')
  except AssertionError:pass
  else:raise AssertionError('CORRUPTION_ACCEPTED '+mutate)
  assert (out/'trace.zip').read_bytes()==allraw
 (root/'data.gz').write_bytes(gzip.compress(b'legacy',mtime=0));legacy={'files':[{'member':'a.json','preserved':'data.gz','bytes':6,'SHA256':h(b'legacy')}]}
 assert restore(root,legacy,out,'')==1 and (out/'a.json').read_bytes()==b'legacy'
print('6 PASS: chunk reconstruction, corruption/offset/whole/path rejection, legacy gzip')
