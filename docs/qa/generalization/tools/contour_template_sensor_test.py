import unittest,cv2,numpy as np
from contour_template_sensor import measure
class Contour(unittest.TestCase):
 def setUp(self):
  self.d=np.zeros((80,100),np.float32);cv2.rectangle(self.d,(15,18),(65,54),30,3);cv2.line(self.d,(24,8),(79,65),18,2);self.mask=np.ones_like(self.d,np.uint8)*255;self.noise=np.ones_like(self.d)*.05
 def test_exact(self):self.assertEqual(measure(self.d,self.d.copy(),self.noise,self.mask)['status'],'VERIFIED_CONTOUR_TEMPLATE')
 def test_repeat_small_noise(self):
  e=self.d+np.random.default_rng(15).normal(0,.03,self.d.shape).astype(np.float32);self.assertEqual(measure(self.d,e,self.noise,self.mask)['status'],'VERIFIED_CONTOUR_TEMPLATE')
 def test_removed(self):self.assertEqual(measure(self.d,np.zeros_like(self.d),self.noise,self.mask)['status'],'UNMEASURED')
 def test_arbitrary_camera_image(self):
  e=np.tile(np.linspace(0,50,100,dtype=np.float32),(80,1));self.assertNotEqual(measure(self.d,e,self.noise,self.mask)['status'],'VERIFIED_CONTOUR_TEMPLATE')
 def test_wrong_position(self):
  e=cv2.warpAffine(self.d,np.float32([[1,0,2],[0,1,0]]),(100,80));self.assertNotEqual(measure(self.d,e,self.noise,self.mask)['status'],'VERIFIED_CONTOUR_TEMPLATE')
 def test_inverted(self):self.assertNotEqual(measure(self.d,-self.d,self.noise,self.mask)['status'],'VERIFIED_CONTOUR_TEMPLATE')
 def test_noise_unresolved(self):self.assertEqual(measure(self.d,self.d.copy(),np.ones_like(self.d)*10,self.mask)['status'],'UNMEASURED')
 def test_one_axis(self):
  d=np.tile(np.array([0]*30+[30]*10+[0]*60,np.float32),(80,1));self.assertEqual(measure(d,d.copy(),self.noise,self.mask)['status'],'UNMEASURED')
 def test_mask_absent(self):self.assertEqual(measure(self.d,self.d.copy(),self.noise,np.zeros_like(self.mask))['status'],'UNMEASURED')
if __name__=='__main__':unittest.main()
