import signal
import time
import csv
import os
from datetime import datetime
from mfrc522 import MFRC522  # Your local or installed version

# Convert UID list to string
def uidToString(uid):
    return ''.join('{:02X}'.format(x) for x in uid)

# Get current file directory
base_dir = os.path.dirname(os.path.abspath(__file__))

# Create /Excel subfolder next to script if not exists
csv_dir = os.path.join(base_dir, "Excel")
os.makedirs(csv_dir, exist_ok=True)

# Set the CSV output file path
csv_file = os.path.join(csv_dir, "Output.csv")

# ✅ Check if the file exists
file_exists = os.path.exists(csv_file)

# 📝 Open the file once in append mode, keep it open during runtime
log_file = open(csv_file, mode='a', newline='')
writer = csv.writer(log_file)

# 🧾 If the file is new, write the header
if not file_exists:
    writer.writerow(["Timestamp", "UID"])

# Initialize the reader
reader = MFRC522()

print("📡 Place your RFID card near the reader.")
print("🔴 Press Ctrl+C to exit.")

try:
    while True:
        (status, tag_type) = reader.MFRC522_Request(reader.PICC_REQIDL)

        if status == reader.MI_OK:
            print("✅ Card detected")

            (status, uid) = reader.MFRC522_Anticoll()
            if status == reader.MI_OK:
                uid_str = uidToString(uid)
                now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                print(f"🔍 UID: {uid_str}")

                # Save to CSV
                writer.writerow([now, uid_str])
                log_file.flush()  # 💾 Ensure it's written to disk

                time.sleep(1)  # Debounce to avoid multiple reads

except KeyboardInterrupt:
    print("\n🛑 Exiting...")

finally:
    log_file.close()
    reader.Close_MFRC522()
