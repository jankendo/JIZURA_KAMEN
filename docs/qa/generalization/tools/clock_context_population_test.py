import copy,unittest
from build_important_executed_population import merge_clock_context_calls
class ClockTests(unittest.TestCase):
 def row(self,context='ADOPTED_OUTPUT_CLOCK'):
  return dict(**{'pass':'GLOBAL'},group='CAMERA_HOOK',id='focus',unitKey='[0,7,0,1,4,"a"]',line=0,from_=1,calls=2,firstTime=1.,lastTime=2.,executionContext=context,clockPairs=[dict(actualOutputTimestamp=1.,sourceTimestamp=0. if context=='REMAPPED_SOURCE_CLOCK'else 1.)],actuation=dict(ownPaintCalls=0,returnedTransforms={'identity':2},opaqueItemFields=[]))
 def test_merge_preserves_clocks(self):
  a,b=self.row(),self.row('REMAPPED_SOURCE_CLOCK');original=copy.deepcopy([a,b]);out=merge_clock_context_calls([a,b]);self.assertEqual(len(out),1);self.assertEqual(out[0]['calls'],4);self.assertEqual(len(out[0]['clockPairs']),2);self.assertEqual(out[0]['actuation']['returnedTransforms']['identity'],4);self.assertEqual(out[0]['executionRecords'],original);self.assertEqual([a,b],original)
 def test_distinct_same_line_units(self):
  a,b=self.row(),self.row();b['unitKey']='[1,7,0,4,8,"a"]';self.assertEqual(len(merge_clock_context_calls([a,b])),2)
 def test_different_pass_preserved(self):
  a,b=self.row(),self.row();b['pass']='main';self.assertEqual(len(merge_clock_context_calls([a,b])),2)
 def test_conflict_rejected(self):
  a,b=self.row(),self.row();b['line']=1
  with self.assertRaisesRegex(ValueError,'CONFLICTING_UNIT_INTERVAL'):merge_clock_context_calls([a,b])
 def test_float_clocks_never_rounded(self):
  a,b=self.row(),self.row();b['clockPairs'][0]['sourceTimestamp']=1.+1e-14;out=merge_clock_context_calls([a,b]);self.assertNotEqual(out[0]['clockPairs'][0],out[0]['clockPairs'][1])
if __name__=='__main__':unittest.main()
