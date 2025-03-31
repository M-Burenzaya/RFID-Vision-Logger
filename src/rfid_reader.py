from mfrc522 import MFRC522

class RFIDReader:
    def __init__(self):
        # Initialize the MFRC522 module
        self.MIFAREReader = MFRC522()
    
    def initialize_reader(self):
        """Initialize the RC522 module."""
        print("Initializing the RFID reader...")

    def scan_rfid_tag(self):
        """Check if an RFID card is present and read its UID."""
        print("Waiting for RFID card...")
        # Check if a new card is detected
        if self.MIFAREReader.MFRC522_Request(self.MIFAREReader.PICC_REQIDL) == self.MIFAREReader.MI_OK:
            print("Card detected")
            # Get the UID of the card
            status, uid = self.MIFAREReader.MFRC522_Anticoll()
            if status == self.MIFAREReader.MI_OK:
                # Convert UID to hex and return
                uid_str = ''.join([str(x) for x in uid])
                return uid_str
        return None

    def read_rfid_data(self):
        """Read data from a block on the RFID card."""
        print("Enter block number to read (0-63):")
        block = int(input())
        print("Are you sure you want to read data from block", block, "? (Y/n)")
        if input().lower() == 'y':
            data = self.MIFAREReader.MFRC522_Read(block)
            if data:
                print(f"Data read from block {block}: {data}")
            else:
                print(f"Failed to read from block {block}")
        else:
            print("Cancelled read operation.")
    
    def write_rfid_data(self):
        """Write data to a block on the RFID card."""
        print("Enter block number to write to (0-63):")
        block = int(input())
        print("Enter data to write (16 bytes):")
        data = list(map(int, input().split()))
        if len(data) != 16:
            print("Data must be exactly 16 bytes!")
            return
        print(f"Are you sure you want to write to block {block} with data {data}? (Y/n)")
        if input().lower() == 'y':
            self.MIFAREReader.MFRC522_Write(block, data)
            print(f"Data written to block {block}.")
        else:
            print("Cancelled write operation.")
    
    def halt_communication(self):
        """Halt communication with the RFID card."""
        self.MIFAREReader.MFRC522_StopCrypto1()
        print("Communication halted with the card.")
        
    def reset_reader(self):
        """Reset the RC522 module."""
        print("Resetting the RFID reader...")
        self.MIFAREReader.MFRC522_Reset()

    def close(self):
        """Clean up GPIO and other resources."""
        # GPIO.cleanup()
        print("Cleaned up GPIO resources.")

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
                    reader.initialize_reader()
                    print("Initialization complete! Press any key to return.")
                    input()
                    State1 = False
        elif key == '2':
            State2 = True
            print("Entered State 2: Scan RFID Tag")
            while State2:
                print("Are you sure you want to scan RFID tag? (Y/n)")
                if input().lower() == 'y':
                    uid = reader.scan_rfid_tag()
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
                reader.read_rfid_data()
                print("Press any key to return.")
                input()
                State3 = False
        elif key == '4':
            State4 = True
            print("Entered State 4: Write RFID Data")
            while State4:
                reader.write_rfid_data()
                print("Press any key to return.")
                input()
                State4 = False
        elif key == '5':
            State5 = True
            print("Entered State 5: Halt Communication")
            while State5:
                reader.halt_communication()
                print("Press any key to return.")
                input()
                State5 = False
        elif key == '6':
            State6 = True
            print("Entered State 6: Reset Reader")
            while State6:
                reader.reset_reader()
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
