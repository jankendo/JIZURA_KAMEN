"""Primary HOLD registration only; never turns differing decoded pixels into exact equality."""
import math
def measure(original,reproduced):
 key=lambda x:(x['unitId'],x['fragmentId'],x['actualDecodedTimestamp'])
 lookup={}
 for f in reproduced['frames']:
  k=key(f);assert k not in lookup,'AMBIGUOUS_ACTUAL_UNIT_FRAGMENT_CLOCK';lookup[k]=f
 points=[];missing=[]
 for a in original['frames']:
  if a['phase']!='hold':continue
  b=lookup.get(key(a))
  if b is None:missing.append({'key':key(a),'reason':'ACTUAL_UNIT_FRAGMENT_CLOCK_MISSING'});continue
  glyphs={}
  for g in b.get('glyphEvidence',[]):
   k=(g['index'],g['row'],g['character']);assert k not in glyphs,'DUPLICATE_REGISTERED_GLYPH';glyphs[k]=g
  for g in a.get('glyphEvidence',[]):
   k=(g['index'],g['row'],g['character']);h=glyphs.get(k)
   if h is None or not all(z.get('nativeCentroid')and z.get('decodedCentroid')for z in [g,h]):missing.append({'key':key(a),'glyph':k,'reason':'REGISTERED_GLYPH_MISSING'});continue
   points.append({'unitId':a['unitId'],'fragmentId':a['fragmentId'],'actualDecodedTimestamp':a['actualDecodedTimestamp'],'glyph':k,'originalInkStatus':g['status'],'reproducedInkStatus':h['status'],'nativeCentroidErrorPixels':math.dist(g['nativeCentroid'],h['nativeCentroid']),'decodedCentroidErrorPixels':math.dist(g['decodedCentroid'],h['decodedCentroid'])})
 return {'pointCount':len(points),'missing':missing,'nativeCentroidMismatchPoints':sum(x['nativeCentroidErrorPixels']!=0 for x in points),'decodedOutsideExistingHalfPixelPoints':sum(x['decodedCentroidErrorPixels']>.5 for x in points),'inkNotMeasuredPoints':sum(x['originalInkStatus']!='MEASURED'or x['reproducedInkStatus']!='MEASURED'for x in points),'maximumDecodedCentroidErrorPixels':max((x['decodedCentroidErrorPixels']for x in points),default=None),'points':points}
