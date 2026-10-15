import pathlib,json,sys,hashlib
root=pathlib.Path(sys.argv[1]);case=sys.argv[2];rows=[]
def times(value,path=''):
 out=[]
 if isinstance(value,dict):
  for k,v in value.items():
   p=path+'.'+k
   if isinstance(v,(int,float)) and any(x in k.lower() for x in ['timestamp','actualtime','requestedtime','decodedtime']):out.append([p,v])
   elif isinstance(v,(dict,list)):out+=times(v,p)
 elif isinstance(value,list):
  for i,v in enumerate(value):out+=times(v,path+'['+str(i)+']')
 return out
for n in [1,2]:
 p=root/('repeat-'+str(n))/'observations.json'
 if not p.exists():rows.append({'repeat':n,'status':'UNVERIFIED_NO_OBSERVATION'});continue
 d=json.loads(p.read_text());assert len(d['rows'])==1;r=d['rows'][0];decoded=r['decodedCinema'];rows.append({'repeat':n,'status':'OBSERVED','videoSHA256':r['videoSHA256'],'referenceSHA256':r['referenceSHA256'],'observerBuild':r['observerBuild'],'environment':d['environment'],'metrics':decoded['metrics'],'typographyVectors':decoded.get('typographyVectors'),'timestamps':times(decoded),'timestampScope':'Only explicitly labeled actual/requested/decode timestamp fields; absent fields remain unmeasured','planHash':r['planHash'],'planAfterHash':r['planAfterHash'],'fonts':r.get('fonts'),'inputCorrespondence':r.get('inputCorrespondence'),'FAV':{'status':r['finalVerification']['status'],'failures':r['finalVerification'].get('failures')}})
complete=all(r['status']=='OBSERVED' for r in rows);comparison=None
if complete:
 a,b=rows;comparison={'sameInputCorrespondence':a['inputCorrespondence']==b['inputCorrespondence'],'sameVideoSHA256':a['videoSHA256']==b['videoSHA256'],'sameReferenceSHA256':a['referenceSHA256']==b['referenceSHA256'],'sameObserver':a['observerBuild']==b['observerBuild'],'sameFonts':a['fonts']==b['fonts'],'sameTimestampFields':a['timestamps']==b['timestamps'],'sameTypographicVectors':a['typographyVectors']==b['typographyVectors'],'scores':[a['metrics'].get('typographyDiversity'),b['metrics'].get('typographyDiversity')]}
(root/'same-video-repeat-summary.json').write_text(json.dumps({'fixture':case,'scope':'Observer reproducibility control, not a creative quality or release certificate','rows':rows,'complete':complete,'comparison':comparison},ensure_ascii=False,indent=2)+'\n')
if not complete:raise SystemExit(1)
