import unittest,copy
from analyze_grammar_policy_v2_temporal_recipes import resolve_selected_recipe_fragment as bind
class Clip(unittest.TestCase):
 def setUp(self):
  self.p={'cuts':[{'index':7,'line':2,'start':6.1,'end':10.64}]};self.u=[{'unitId':'a','line':2,'fragments':[{'index':0,'id':'f','from':6.1,'to':10}]}];self.profile={'range':[0,10]}
 def test_export_clip_bound_by_selected_ordinal(self):self.assertEqual(bind(self.p,self.u,7,2,6.1,10.64,self.profile)[1]['to'],10)
 def test_authored_index_is_not_final_ordinal(self):
  with self.assertRaisesRegex(AssertionError,'TARGET_NOT_UNIQUE'):bind(self.p,self.u,0,2,6.1,10.64,self.profile)
 def test_same_line_different_unit_not_borrowed(self):
  u=copy.deepcopy(self.u);u[0]['fragments'][0]['index']=1
  with self.assertRaisesRegex(AssertionError,'FRAGMENT_NOT_UNIQUE'):bind(self.p,u,7,2,6.1,10.64,self.profile)
 def test_duplicate_selected_tuple_rejected(self):
  with self.assertRaisesRegex(AssertionError,'TARGET_NOT_UNIQUE'):bind({'cuts':self.p['cuts']*2},self.u,7,2,6.1,10.64,self.profile)
 def test_outside_export_range_rejected(self):
  u=copy.deepcopy(self.u);u[0]['fragments'][0]['to']=10.64
  with self.assertRaisesRegex(AssertionError,'OUTSIDE_TARGET'):bind(self.p,u,7,2,6.1,10.64,self.profile)
if __name__=='__main__':unittest.main()
