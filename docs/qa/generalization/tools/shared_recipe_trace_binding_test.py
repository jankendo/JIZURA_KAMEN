import unittest
from analyze_grammar_policy_v2_temporal_recipes import recipe_targets
class Targets(unittest.TestCase):
 def row(self,mode='OFF',**changes):return dict(kind='isolatedGrammarTemporalRecipe',mode=mode,**{'pass':'main'},matchedFunctions=1,cutIndex=4,line=7,range=[1,2],**changes)
 def test_off_trace_stays_off(self):
  d=recipe_targets([self.row()]);self.assertEqual(next(iter(d.values()))['mode'],'OFF')
 def test_on_preferred_without_relabeling(self):self.assertEqual(next(iter(recipe_targets([self.row('ON'),self.row()]).values()))['mode'],'ON')
 def test_unmatched_function_not_a_target(self):
  t=self.row();t['matchedFunctions']=0;self.assertFalse(recipe_targets([t]))
 def test_auxiliary_pass_not_primary(self):
  t=self.row();t['pass']='ghost';self.assertFalse(recipe_targets([t]))
 def test_same_line_different_ranges_stay_distinct(self):
  t=self.row();u=self.row();u['range']=[2,3];self.assertEqual(len(recipe_targets([t,u])),2)
if __name__=='__main__':unittest.main()
