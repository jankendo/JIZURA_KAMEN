"""Do not borrow adjacent fragment evidence or drop valid units after a zero-HOLD fragment."""
import unittest
from analyze_isolated_layout_presence import match_hold_populations as check
class Population(unittest.TestCase):
 def test_empty_interval_explicit_na_not_pass(self):self.assertEqual(check([],[],[],[7,6.95]),'NOT_APPLICABLE_EMPTY_HOLD')
 def test_positive_interval_missing_all_rejected(self):
  with self.assertRaisesRegex(AssertionError,'EXPECTED_HOLD'):check([],[],[],[7,8])
 def test_missing_one_control_clock_rejected(self):
  with self.assertRaisesRegex(AssertionError,'POPULATION_MISMATCH'):check([{'actualDecodedTimestamp':7}],[],[{'actualDecodedTimestamp':7}],[7,8])
 def test_other_fragment_cannot_fill_empty(self):
  with self.assertRaisesRegex(AssertionError,'FRAME_INSIDE_EMPTY'):check([{'actualDecodedTimestamp':7}],[{'actualDecodedTimestamp':7}],[{'actualDecodedTimestamp':7}],[7,6.95])
 def test_different_actual_clock_rejected(self):
  with self.assertRaisesRegex(AssertionError,'POPULATION_MISMATCH'):check([{'actualDecodedTimestamp':7}],[{'actualDecodedTimestamp':7.01}],[{'actualDecodedTimestamp':7}],[7,8])
if __name__=='__main__':unittest.main()
