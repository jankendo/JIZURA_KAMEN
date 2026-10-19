import pathlib,tempfile,sys,time,unittest
from run_bounded_diagnostic import run
class Bounded(unittest.TestCase):
 def test_normal(self):
  with tempfile.TemporaryDirectory()as tmp:
   p=pathlib.Path(tmp)/'log';r=run([sys.executable,'-c','print("actual")'],5,p);self.assertEqual(r['exitCode'],0);self.assertFalse(r['timedOut']);self.assertEqual(p.read_text().strip(),'actual')
 def test_failure_preserved(self):
  with tempfile.TemporaryDirectory()as tmp:self.assertEqual(run([sys.executable,'-c','raise SystemExit(7)'],5,pathlib.Path(tmp)/'log')['exitCode'],7)
 def test_timeout_including_independently_grouped_descendant(self):
  with tempfile.TemporaryDirectory()as tmp:
   marker=pathlib.Path(tmp)/'not-created';child='import time,pathlib;time.sleep(.7);pathlib.Path('+repr(str(marker))+').write_text("leak")';parent='import subprocess,sys,time;subprocess.Popen([sys.executable,"-c",'+repr(child)+'],start_new_session=True);print("started",flush=True);time.sleep(10)';r=run([sys.executable,'-c',parent],.15,pathlib.Path(tmp)/'log');self.assertEqual(r['exitCode'],124);self.assertTrue(r['timedOut']);time.sleep(.8);self.assertFalse(marker.exists());self.assertGreaterEqual(len(r['terminatedDescendantProcessGroups']),2)
if __name__=='__main__':unittest.main()
