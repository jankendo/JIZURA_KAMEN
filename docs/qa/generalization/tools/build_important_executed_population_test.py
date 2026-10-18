import importlib.util,json,pathlib,tempfile,unittest
p=pathlib.Path(__file__).with_name('build_important_executed_population.py');s=importlib.util.spec_from_file_location('population',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Population(unittest.TestCase):
 def test_static_not_excluded(self):self.assertEqual(m.classify({'group':'HOLD','id':'still'})[0],'INTENTIONAL_STATIC')
 def test_small_decor_still_important(self):self.assertEqual(m.classify({'group':'DECOR','id':'rings'})[0],'EXECUTED_IMPORTANT')
 def test_composite_not_independent(self):self.assertEqual(m.classify({'group':'COMPOSITE_HOOK','id':'drawCinemaGrammar'})[0],'COMPOSITE_IMPORTANT')
 def test_manual_distinct(self):self.assertEqual(m.classify({'group':'LAYOUTS','id':'photoCondensed'},True)[0],'MANUAL_LOCKED')
 def test_alias_does_not_collapse_or_verify(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.json';p.write_text(json.dumps({'automaticSelection':True,'directionSelectionMethod':'SHIPPING_OPTIMIZE_DIRECTION_CANDIDATES_RENDERED','exactNativeRGBA':True,'artifactBinding':{'sourceCommit':'s'},'videoSHA256':'h','planHash':'p','calls':[{'group':'ENTER','id':i,'unitKey':'u','calls':1} for i in ['a','b']],'implementationIdentity':[{'group':'ENTER','id':i,'functionObjectId':1,'functionSHA256':'f'} for i in ['a','b']]}));o=m.build([p],'s');self.assertEqual(len(o['expectedImportantIntentIds']),2);self.assertTrue(all(x['encodedStatus']=='UNMEASURED' for x in o['rows']));self.assertEqual(o['observations'],[])
 def test_stale_and_unknown_cannot_become_current_natural(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.json';p.write_text(json.dumps({'exactNativeRGBA':False,'artifactBinding':{'sourceCommit':'old'},'videoSHA256':'h','calls':[{'group':'ENTER','id':'wipe','unitKey':'u','calls':1}]}));o=m.build([p],'new');self.assertEqual(o['expectedImportantIntentIds'],[]);self.assertEqual(len(o['unknownNaturalPopulation']),1);self.assertEqual(o['rows'][0]['bindingStatus'],'STALE_OR_UNMEASURED')
 def test_forced_selection_never_counts_natural(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'t.json';p.write_text(json.dumps({'automaticSelection':True,'directionSelectionMethod':'FIXED_INITIAL_LAYOUT_COMPARISON_NOT_NATURAL_SELECTION_PROOF','exactNativeRGBA':True,'artifactBinding':{'sourceCommit':'s'},'videoSHA256':'h','calls':[{'group':'ENTER','id':'wipe','unitKey':'u','calls':1}]}));o=m.build([p],'s');self.assertEqual(o['expectedImportantIntentIds'],[]);self.assertEqual(len(o['unknownNaturalPopulation']),1)
 def test_qualified_uniform_contract_requires_execution(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'t.json';t={'automaticSelection':True,'directionSelectionMethod':'SHIPPING_OPTIMIZE_DIRECTION_CANDIDATES_RENDERED','exactNativeRGBA':True,'artifactBinding':{'sourceCommit':'s'},'videoSHA256':'h','temporalContracts':[{'unitKey':'u','time':1,'charFnsAdded':1,'contract':{'status':'EXECUTABLE','mode':'UNIFORM_TRANSLATION','state':{'role':'light'}}}]};p.write_text(json.dumps(t));o=m.build([p],'s');self.assertEqual(len(o['expectedImportantIntentIds']),1);t['temporalContracts'][0]['charFnsAdded']=0;p.write_text(json.dumps(t));self.assertEqual(m.build([p],'s')['expectedImportantIntentIds'],[])
if __name__=='__main__':unittest.main()
