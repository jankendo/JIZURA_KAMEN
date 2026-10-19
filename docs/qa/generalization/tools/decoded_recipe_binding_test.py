"""Counterexamples for internal unit evidence swaps, not score implementation assertions."""
import unittest
from analyze_grammar_policy_v2_temporal_recipes import resolve_recipe_target
class Binding(unittest.TestCase):
 def setUp(self):
  self.u=[{'unitId':'A','line':7,'fragments':[{'index':4,'from':1.,'to':2.}]},{'unitId':'B','line':7,'fragments':[{'index':5,'from':2.,'to':3.}]}]
 def test_same_line_separate_internal_units(self):self.assertEqual(resolve_recipe_target(self.u,7,2,3)[0]['unitId'],'B')
 def test_cut_label_is_not_final_ordinal(self):self.assertEqual(resolve_recipe_target(self.u,7,1,2)[1]['index'],4)
 def test_partial_range_cannot_borrow_whole(self):
  with self.assertRaises(AssertionError):resolve_recipe_target(self.u,7,1,1.9)
 def test_wrong_line(self):
  with self.assertRaises(AssertionError):resolve_recipe_target(self.u,8,1,2)
 def test_duplicate_fragment_reject(self):
  with self.assertRaises(AssertionError):resolve_recipe_target(self.u+[self.u[0]],7,1,2)
 def test_boundary_does_not_borrow_previous(self):self.assertEqual(resolve_recipe_target(self.u,7,2,3)[1]['index'],5)
if __name__=='__main__':unittest.main()
