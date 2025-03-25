from gpiozero import DigitalOutputDevice
from time import sleep

output = DigitalOutputDevice(5)  # GPIO pin

try:
    while True:
        output.on()   # HIGH
        sleep(1)
        output.off()  # LOW
        sleep(1)
except KeyboardInterrupt:
    print("Stopped.")
