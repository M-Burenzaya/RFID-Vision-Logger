import cv2
from picamera2 import Picamera2
import time

class CameraReader:
    def __init__(self, main_resolution=(1024, 1024), raw_resolution=(2028, 1520)):
        """Initialize the camera and set it up with custom resolution."""
        self.camera = Picamera2()

        self.camera.configure(
            self.camera.create_preview_configuration(
                raw={"size": raw_resolution},
                main={"format": 'RGB888', "size": main_resolution}
            )
        )

        self.camera.start()

    def capture_image(self):
        """Capture a single image."""
        image = self.camera.capture_array()
        return image

    def continous_capture(self):
        """Capture images continuously."""
        while True:
            image = self.camera.capture_array()
            if image is not None:
                yield image

    def stop_camera(self):
        """Stop the camera and release resources."""
        self.camera.stop()

    def test_camera(self):
        """Test the camera by continuously showing the captured image."""
        while True:
            image = self.camera.capture_array()
            if image is not None:
                cv2.imshow("Output", image)
                # Press 'q' to quit the loop
                if cv2.waitKey(34) & 0xFF == ord('q'):
                    break
            else:
                print("[WARNING] No image captured.")

        # Close the camera properly
        self.stop_camera()
        cv2.destroyAllWindows()
        print("[INFO] Camera stopped.")

# Usage Example:
if __name__ == "__main__":
    camera_reader = CameraReader()
    
    # Example of capturing a single image
    single_image = camera_reader.capture_image()
    if single_image is not None:
        print("[INFO] Single image captured.")
        cv2.imwrite("CapturedImage.jpg", single_image)

    # Start continuous capture (as a generator)
    # Example to continuously get frames
    # for image in camera_reader.continous_capture():
    #     cv2.imshow("Continuous Capture", image)
    #     if cv2.waitKey(1) & 0xFF == ord('q'):
    #         break

    # Test camera (show camera output until 'q' is pressed)
    camera_reader.test_camera()
