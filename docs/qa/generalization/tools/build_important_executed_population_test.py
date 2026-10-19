import importlib.util,json,pathlib,tempfile,unittest
p=pathlib.Path(__file__).with_name('build_important_executed_population.py');s=importlib.util.spec_from_file_location('population',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Population(unittest.TestCase):
 def test_temporal_contract_retains_output_and_source_clock_and_state(self):
  tc={'unitKey':'u','time':2,'sourceTimestamp':1.9,'executionContext':'REMAPPED_SOURCE_CLOCK','charFnsAdded':1,'contract':{'status':'EXECUTABLE','mode':'UNIFORM_TRANSLATION','state':{'role':'light','phase':'exit'}}}
  direct={**tc,'time':1.8,'sourceTimestamp':1.8,'executionContext':'ADOPTED_OUTPUT_CLOCK'}
  rows=m.temporal_contract_calls([direct,tc]);self.assertEqual(len(rows),1);r=rows[0]
  self.assertEqual(r['calls'],2);self.assertEqual(r['firstTime'],1.8);self.assertEqual(r['lastTime'],2)
  self.assertEqual(r['clockPairs'][1],{'actualOutputTimestamp':2,'sourceTimestamp':1.9,'executionContext':'REMAPPED_SOURCE_CLOCK'})
  self.assertEqual(len(r['executionRecords']),2);self.assertEqual(r['contractEvidence'][1],tc);self.assertEqual(r['executionContext'],'MULTIPLE_PRESERVED_CLOCK_CONTEXTS')
 def test_old_trace_missing_source_clock_is_not_invented(self):
  tc={'unitKey':'u','time':2,'charFnsAdded':1,'contract':{'status':'EXECUTABLE','mode':'UNIFORM_TRANSLATION'}}
  r=m.temporal_contract_calls([tc])[0];self.assertIsNone(r['clockPairs'][0]['sourceTimestamp']);self.assertEqual(r['clockPairs'][0]['executionContext'],'UNMEASURED')
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
 def test_grammar_contract_with_other_char_functions_is_inventory_only(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'t.json';tc={'unitKey':'u','time':1,'charFnsAdded':5,'cinemaAnchorMotion':{'dx':0,'dy':-2},'contract':{'status':'EXECUTABLE','mode':'GRAMMAR','uniformTranslation':True,'state':{'role':'light'}}};t={'automaticSelection':True,'directionSelectionMethod':'SHIPPING_OPTIMIZE_DIRECTION_CANDIDATES_RENDERED','exactNativeRGBA':True,'artifactBinding':{'sourceCommit':'s'},'videoSHA256':'h','temporalContracts':[tc]};p.write_text(json.dumps(t));o=m.build([p],'s');self.assertEqual(len(o['expectedImportantIntentIds']),1);self.assertEqual(o['rows'][0]['encodedStatus'],'UNMEASURED');self.assertEqual(o['observations'],[])
   for field,value in [('cinemaAnchorMotion',None),('charFnsAdded',0)]:
    saved=tc[field];tc[field]=value;p.write_text(json.dumps(t));self.assertEqual(m.build([p],'s')['expectedImportantIntentIds'],[]);tc[field]=saved
if __name__=='__main__':unittest.main()
