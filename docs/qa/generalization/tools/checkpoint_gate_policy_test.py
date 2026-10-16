import copy,json,pathlib,unittest
from checkpoint_gate_policy import evaluate_technical
R=pathlib.Path(__file__).resolve().parents[1]/'composition-recovery';source='b002cdd75845d189221312a82456c33a131f5e8d'
class Policy(unittest.TestCase):
 def setUp(self):
  self.c=json.loads((R/'ci-b002-validation/ci-summary.json').read_text());self.s=json.loads((R/'final-fresh30-selected-artifacts.json').read_text())
 def test_real_source(self):self.assertEqual(evaluate_technical(source,self.c,self.s)['status'],'PASS')
 def test_counterexamples(self):
  cases=[lambda c,s:c.update(expectedPRSourceCommit='old'),lambda c,s:c['githubGitTreeExactMatch'].update(mergeTree='other'),lambda c,s:c['tests'].update(failed=1),lambda c,s:c['tests'].update(total=999),lambda c,s:c['browser']['checks'].pop(),lambda c,s:c['browser'].update(pageErrors=['error']),lambda c,s:c.update(overlayReportStatus='FAIL'),lambda c,s:c.update(workflowStatus='PENDING'),lambda c,s:s['artifacts'].pop(),lambda c,s:s['artifacts'][0]['binding'].update(sourceCommit='old'),lambda c,s:s['artifacts'][0]['binding'].update(sourceDirty=True),lambda c,s:s['artifacts'][0].update(FAVStatus='UNMEASURED'),lambda c,s:s['artifacts'][0].update(fullDecode='FAIL'),lambda c,s:s.update(oldSourceMovieReuseCount=1),lambda c,s:s['artifacts'][1].update(fixture=s['artifacts'][0]['fixture']),lambda c,s:c['browser']['checks'][-1].update(oneClick=False)]
  for i,change in enumerate(cases):
   with self.subTest(counterexample=i):
    c=copy.deepcopy(self.c);s=copy.deepcopy(self.s);change(c,s);self.assertNotEqual(evaluate_technical(source,c,s)['status'],'PASS')
if __name__=='__main__':unittest.main()
