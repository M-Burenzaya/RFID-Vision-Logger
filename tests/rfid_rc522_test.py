import signal
import time
from mfrc522 import MFRC522  # Make sure this path is correct if in another folder

# Initialize the reader
reader = MFRC522()

def uidToString(uid):
    return ''.join('{:02X}'.format(x) for x in uid)

print("Place your RFID card near the reader.")
print("Press Ctrl+C to exit.")

try:
    while True:
        # Look for cards
        (status, tag_type) = reader.MFRC522_Request(reader.PICC_REQIDL)

        # If a card is found
        if status == reader.MI_OK:
            print("Card detected")

            # Get the UID
            (status, uid) = reader.MFRC522_Anticoll()
            if status == reader.MI_OK:
                print("Card UID:", uidToString(uid))
                time.sleep(1)  # Prevent multiple readings of the same tag
except KeyboardInterrupt:
    print("\nExiting...")
finally:
    reader.Close_MFRC522()
