import unittest
from build_important_executed_population import contracts_for_unit
class Binding(unittest.TestCase):
 def setUp(self):
  self.t={'temporalContracts':[{'unitKey':'cloneA','contract':{'state':{'role':'light'}}},{'unitKey':'cloneB','contract':{'state':{'role':'echo'}}}]}
  self.b={'bindings':{k:{'resolvedUnitKey':v}for k,v in [('A','unitA'),('cloneA','unitA'),('B','unitB'),('cloneB','unitB')]}}
 def test_renderer_clone_joins_same_verified_final_unit(self):self.assertEqual(contracts_for_unit(self.t,'A',self.b)[0]['contract']['state']['role'],'light')
 def test_other_unit_never_borrowed(self):self.assertEqual(len(contracts_for_unit(self.t,'B',self.b)),1)
 def test_no_binding_uses_only_exact_raw_identity(self):self.assertEqual(contracts_for_unit(self.t,'A'),[])
 def test_unknown_key_does_not_fallback_to_same_line(self):
  with self.assertRaises(KeyError):contracts_for_unit(self.t,'unknown',self.b)
if __name__=='__main__':unittest.main()
