"""Counterexamples use an authentic current trace and immutable selected reference."""
import pathlib,json,copy,unittest,os
from bind_actual_dispatch_units import bind
from build_important_executed_population import build
Q=pathlib.Path(__file__).resolve().parents[1];R=Q/'composition-recovery';S='d6fe7be2fa53475dc7493f35229af6ad4f57235f'
class ActualBinding(unittest.TestCase):
 def setUp(self):
  self.p=R/'automatic-contract-focused-0/dispatch/development-15/native-dispatch-trace.json.gz';self.b=bind(self.p,self.p.parents[2])
 def test_clone_maps_exact_final_fragment(self):
  rows=[v for k,v in self.b['bindings'].items() if k.startswith('[-1,7,2,6.1,9.11,')];self.assertTrue(rows);self.assertTrue(all(v['ordinal']==2 and v['unitId'] and v['fragmentId'] for v in rows))
 def test_wrong_raw_hash_cannot_rebind(self):
  bad=copy.deepcopy(self.b);bad['traceRawSHA256']='0'*64
  with self.assertRaisesRegex(AssertionError,'RAW_SHA_MISMATCH'):build([self.p],S,{str(self.p):bad})
 def test_bound_controlled_intent_preserves_raw_dispatch_key(self):
  o=build([self.p],S,{str(self.p):self.b});a=[x for x in o['rows'] if x['group']=='LYRIC_TEMPORAL_CONTRACT'];self.assertEqual(len(a),1);self.assertTrue(a[0]['dispatch']['unitKey'].startswith('[-1,'));self.assertTrue(a[0]['unitKey'].startswith('[2,'));self.assertEqual(a[0]['encodedStatus'],'UNMEASURED')
if __name__=='__main__':unittest.main()
