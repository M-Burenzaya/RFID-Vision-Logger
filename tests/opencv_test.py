import cv2
from picamera2 import Picamera2
import time

cap = cv2.VideoCapture("tests/Vids/The Hobbit.mp4")

while True:
    success, img = cap.read()
    if success == True:
        print("[DEBUG] Captured image shape:", img.shape)
        cv2.imshow("Output", img)
    else:
        break
    if cv2.waitKey(34) & 0xFF == ord('q'):
        break

cv2.destroyAllWindows()