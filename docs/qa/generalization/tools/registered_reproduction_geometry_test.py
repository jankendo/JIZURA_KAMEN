import unittest,copy
from registered_reproduction_geometry import measure
class Identity(unittest.TestCase):
 def setUp(self):
  self.v={'frames':[{'unitId':'a','fragmentId':'f','actualDecodedTimestamp':1.,'phase':'hold','glyphEvidence':[{'index':0,'row':0,'character':'字','status':'MEASURED','nativeCentroid':[0,0],'decodedCentroid':[0,0]}]}]}
 def test_actual_matched_point(self):self.assertEqual(measure(self.v,self.v)['pointCount'],1)
 def test_same_line_or_time_cannot_borrow_other_unit(self):
  v=copy.deepcopy(self.v);v['frames'][0]['unitId']='b';self.assertEqual(len(measure(self.v,v)['missing']),1)
 def test_fragment_swap_rejected_as_missing(self):
  v=copy.deepcopy(self.v);v['frames'][0]['fragmentId']='g';self.assertEqual(len(measure(self.v,v)['missing']),1)
 def test_duplicate_clock_rejected(self):
  v=copy.deepcopy(self.v);v['frames']*=2
  with self.assertRaisesRegex(AssertionError,'AMBIGUOUS'):measure(self.v,v)
 def test_native_mismatch_retained(self):
  v=copy.deepcopy(self.v);v['frames'][0]['glyphEvidence'][0]['nativeCentroid']=[0,1];self.assertEqual(measure(self.v,v)['nativeCentroidMismatchPoints'],1)
 def test_registration_failure_not_pass(self):
  v=copy.deepcopy(self.v);v['frames'][0]['glyphEvidence'][0]['decodedCentroid']=[.6,0];self.assertEqual(measure(self.v,v)['decodedOutsideExistingHalfPixelPoints'],1)
 def test_missing_ink_retained(self):
  v=copy.deepcopy(self.v);v['frames'][0]['glyphEvidence'][0]['status']='FAILED';self.assertEqual(measure(self.v,v)['inkNotMeasuredPoints'],1)
if __name__=='__main__':unittest.main()
