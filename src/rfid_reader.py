from mfrc522 import MFRC522
import time

class RFIDReader:
    def __init__(self):
        # Initialize the MFRC522 module
        self._init_reader()

    def _init_reader(self):
        """Initialize the actual hardware."""
        self.MIFAREReader = MFRC522()
    
    def initialize_rfid(self):
        """Initialize the RC522 module."""
        try:
            self._init_reader()
            # print("RFID reader reinitialized.")
            return True, None
        except Exception as e:
            # print(f"[ERROR] Failed to initialize RFID reader: {e}")
            return False, str(e)

    def halt_rfid(self):
        """Halt communication with the RFID card."""
        try:
            buf = [self.MIFAREReader.PICC_HALT, 0x00]
            crc = self.MIFAREReader.CalulateCRC(buf)
            buf.append(crc[0])
            buf.append(crc[1])
            self.MIFAREReader.MFRC522_ToCard(self.MIFAREReader.PCD_TRANSCEIVE, buf)
            # print("Communication halted with the card.")
            return True, None
        except Exception as e:
            # print(f"[ERROR] Failed to halt RFID: {e}")
            return False, str(e)
        
    def reset_rfid(self):
        """Reset the RC522 module."""
        try:
            self.MIFAREReader.MFRC522_Reset()
            # print("Resetting the RFID reader...")
            return True, None
        except Exception as e:
            # print(f"[ERROR] Failed to reset RFID reader: {e}")
            return False, str(e)

    def close_rfid(self):
        """Clean up SPI and GPIO resources."""
        try:
            self.MIFAREReader.Close_MFRC522()
            # print("RFID reader closed and resources cleaned up.")
            return True, None
        except Exception as e:
            # print(f"[ERROR] Failed to close RFID reader: {e}")
            return False, str(e)

    def scan_rfid(self, continuous=False):
        """Scan for an RFID card. If continuous=True, keep scanning until a card is found."""
        try:
            if continuous:
                while True:
                    status, tag_type = self.MIFAREReader.MFRC522_Request(self.MIFAREReader.PICC_REQIDL)
                    if status == self.MIFAREReader.MI_OK:
                        status, uid = self.MIFAREReader.MFRC522_Anticoll()
                        if status == self.MIFAREReader.MI_OK:
                            uid_str = "-".join(map(str, uid))
                            return True, {"uid": uid_str}
                    time.sleep(0.1)
            else:
                timeout = 5  # seconds
                start_time = time.time()
                while time.time() - start_time < timeout:
                    status, tag_type = self.MIFAREReader.MFRC522_Request(self.MIFAREReader.PICC_REQIDL)
                    if status == self.MIFAREReader.MI_OK:
                        status, uid = self.MIFAREReader.MFRC522_Anticoll()
                        if status == self.MIFAREReader.MI_OK:
                            uid_str = "-".join(map(str, uid))
                            return True, {"uid": uid_str}
                    time.sleep(0.1)
                return False, "Timeout: No RFID card detected within 5 seconds."
        except Exception as e:
            return False, str(e)

        
        

    def read_rfid(self, block, key=[0xFF]*6):
        """Scan for a card and read data from a specific block."""
        try:
            timeout = 5
            start_time = time.time()

            while time.time() - start_time < timeout:
                status, tag_type = self.MIFAREReader.MFRC522_Request(self.MIFAREReader.PICC_REQIDL)
                if status == self.MIFAREReader.MI_OK:
                    status, uid = self.MIFAREReader.MFRC522_Anticoll()
                    if status == self.MIFAREReader.MI_OK:
                        self.MIFAREReader.MFRC522_SelectTag(uid)
                        auth_status = self.MIFAREReader.MFRC522_Auth(
                            self.MIFAREReader.PICC_AUTHENT1A,
                            block,
                            key,
                            uid
                        )
                        if auth_status == self.MIFAREReader.MI_OK:
                            data = self.MIFAREReader.MFRC522_Read(block)

                            # Stop encryption
                            self.MIFAREReader.MFRC522_StopCrypto1()
                            # Halt communication
                            self.halt_rfid()

                            if data:
                                return True, {"uid": "-".join(map(str, uid)), "data": data}
                            else:
                                return False, "Failed to read data from the card."
                        else:
                            return False, "Authentication failed."
                time.sleep(0.1)

            return False, "Timeout: No RFID card detected within 5 seconds."
        except Exception as e:
            return False, str(e)


    
    def write_rfid(self, block, data_str, key=[0xFF]*6):
        """Scan for a card and write string data to a specific block."""
        try:
            timeout = 5
            start_time = time.time()

            while time.time() - start_time < timeout:
                status, tag_type = self.MIFAREReader.MFRC522_Request(self.MIFAREReader.PICC_REQIDL)
                if status == self.MIFAREReader.MI_OK:
                    status, uid = self.MIFAREReader.MFRC522_Anticoll()
                    if status == self.MIFAREReader.MI_OK:
                        self.MIFAREReader.MFRC522_SelectTag(uid)
                        auth_status = self.MIFAREReader.MFRC522_Auth(
                            self.MIFAREReader.PICC_AUTHENT1A,
                            block,
                            key,
                            uid
                        )
                        if auth_status == self.MIFAREReader.MI_OK:
                            # Convert string to 16-byte padded list
                            byte_data = list(data_str.encode("utf-8"))
                            if len(byte_data) > 16:
                                byte_data = byte_data[:16]
                            else:
                                byte_data += [0] * (16 - len(byte_data))

                            self.MIFAREReader.MFRC522_Write(block, byte_data)
                            self.MIFAREReader.MFRC522_StopCrypto1()
                            self.halt_rfid()

                            return True, {"uid": "-".join(map(str, uid)), "block": block}, None
                        else:
                            return False, None, "auth_failed"
                time.sleep(0.1)

            return False, None, "timeout"
        except Exception as e:
            return False, None, f"exception: {str(e)}"


def test_rfid_reader():
    import keyboard
    """Test function to interact with keypresses and execute corresponding functions."""
    reader = RFIDReader()
    reader.initialize_reader()

    State1 = False
    State2 = False
    State3 = False
    State4 = False
    State5 = False
    State6 = False

    while True:
        print("\nPress a key to enter the corresponding state:")
        print("1 - Initialize Reader")
        print("2 - Scan RFID Tag")
        print("3 - Read RFID Data")
        print("4 - Write RFID Data")
        print("5 - Halt Communication")
        print("6 - Reset Reader")
        print("Q - Quit")
        
        key = keyboard.read_event(suppress=True).name  # Wait for key press

        if key == '1':
            State1 = True
            print("Entered State 1: Initialize Reader")
            while State1:
                print("Are you sure you want to initialize the reader? (Y/n)")
                if input().lower() == 'y':
                    reader.initialize_rfid()
                    print("Initialization complete! Press any key to return.")
                    input()
                    State1 = False
        elif key == '2':
            State2 = True
            print("Entered State 2: Scan RFID Tag")
            while State2:
                print("Are you sure you want to scan RFID tag? (Y/n)")
                if input().lower() == 'y':
                    uid = reader.scan_rfid()
                    if uid:
                        print(f"UID of the scanned card: {uid}")
                    else:
                        print("No RFID card detected.")
                    print("Press any key to return.")
                    input()
                    State2 = False
        elif key == '3':
            State3 = True
            print("Entered State 3: Read RFID Data")
            while State3:
                reader.read_rfid()
                print("Press any key to return.")
                input()
                State3 = False
        elif key == '4':
            State4 = True
            print("Entered State 4: Write RFID Data")
            while State4:
                reader.write_rfid()
                print("Press any key to return.")
                input()
                State4 = False
        elif key == '5':
            State5 = True
            print("Entered State 5: Halt Communication")
            while State5:
                reader.halt_rfid()
                print("Press any key to return.")
                input()
                State5 = False
        elif key == '6':
            State6 = True
            print("Entered State 6: Reset Reader")
            while State6:
                reader.reset_rfid()
                print("Press any key to return.")
                input()
                State6 = False
        elif key.lower() == 'q':
            print("Exiting...")
            break  # Exit the loop and stop the program

    # Cleanup resources after exiting the loop
    reader.close()

# This block will be executed when the script is run directly (not imported)
if __name__ == "__main__":
    test_rfid_reader()
