import cv2
from picamera2 import Picamera2
import time

print("[INFO] Initializing Picamera2...")
picam2 = Picamera2()

print("[INFO] Available sensor modes:")
for mode in picam2.sensor_modes:
    print(" - Mode:", mode["size"], mode["format"], "FPS:", mode.get("fps", "N/A"))

picam2.configure(picam2.create_preview_configuration(
    raw={"size": (2028, 1520)},
    main={"format": 'RGB888', "size": (1024, 760)}
))

print("[INFO] Starting camera...")
picam2.start()
time.sleep(2)

while True:
    capt = picam2.capture_array()
    if capt is not None:
        print("[DEBUG] Captured image shape:", capt.shape)
        cv2.imshow("Output", capt)
        cv2.imwrite("Output.jpg", capt)

    if cv2.waitKey(34) & 0xFF == ord('q'):
        break

picam2.stop()
picam2.close()
cv2.destroyAllWindows()
print("[INFO] Program finished.")
