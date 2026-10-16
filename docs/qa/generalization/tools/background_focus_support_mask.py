"""Conservative ownership for fixed pyramidal LK support, not a score threshold."""
import cv2,numpy as np
from background_focus_flow_sensor import LK

def support_radius():
 # Full-resolution support of the coarsest interpolation window plus the
 # 5-tap Gaussian pyramid. Preserve room for one interpolation sample.
 level=LK['maxLevel'];half=max((x-1)//2 for x in LK['winSize'])
 return (half+1)*2**level+2*(2**level-1)
def owned_support(mask):
 radius=support_radius()
 return cv2.erode(mask,np.ones((2*radius+1,2*radius+1),np.uint8),borderType=cv2.BORDER_CONSTANT,borderValue=0)
