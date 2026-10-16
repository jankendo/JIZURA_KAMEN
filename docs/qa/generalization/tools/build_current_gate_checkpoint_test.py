import unittest,pathlib,json,tempfile,sys
from build_current_gate_checkpoint import build,A
class ActiveGate(unittest.TestCase):
 def test_no_historical_pass_promotion(self):
  
  with tempfile.TemporaryDirectory()as t:
   p=pathlib.Path(t)/'minimal.json';p.write_text(json.dumps({'releaseSourceCommit':json.loads((A/'context.json').read_text())['sourceCommit'],'evidence':{}}));g=build(sys.argv[1],p)
  self.assertEqual(g['sourceCommit'],json.loads((A/'context.json').read_text())['sourceCommit']);self.assertEqual(g['historicalBaseline']['sourceCommit'],'b002cdd75845d189221312a82456c33a131f5e8d');self.assertEqual(g['TECHNICAL_GO'],'UNVERIFIED');self.assertEqual(g['QUALITY_GO'],'UNVERIFIED');self.assertFalse(g['productionChanged'])
 def test_stale_release_manifest_rejected(self):
  d=json.loads((A/'release-gate-manifest.json').read_text());d['releaseSourceCommit']='b002cdd75845d189221312a82456c33a131f5e8d'
  with tempfile.TemporaryDirectory()as t:
   p=pathlib.Path(t)/'manifest.json';p.write_text(json.dumps(d))
   with self.assertRaisesRegex(AssertionError,'ACTIVE_SOURCE_MANIFEST_MISMATCH'):build(sys.argv[1],p)
if __name__=='__main__':unittest.main(argv=[sys.argv[0]])
