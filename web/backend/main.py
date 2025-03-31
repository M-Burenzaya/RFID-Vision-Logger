from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))

from rfid_reader import RFIDReader

from rfid_reader import RFIDReader  # Optional, if you want to integrate RFID functionality

app = FastAPI()

# Allow React frontend (adjust origin if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, change to the frontend URL like: ["http://localhost:3000"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared counter (in-memory)
counter = {"value": 0}

@app.get("/api/counter")
def get_counter():
    """Returns the current counter value"""
    return {"value": counter["value"]}

@app.post("/api/increment")
def increment_counter():
    """Increments the counter value"""
    counter["value"] += 1
    return {"value": counter["value"]}

@app.post("/api/decrement")
def decrement_counter():
    """Decrements the counter value"""
    counter["value"] -= 1
    return {"value": counter["value"]}

# Example of integrating RFIDReader if needed
@app.get("/api/rfid/init")
def initialize_rfid():
    """Initializes the RFID reader"""
    # RFIDReader().initialize_reader()  # Call your actual RFID initialization function here
    return {"status": "RFID reader initialized"}

@app.post("/api/rfid/scan")
def scan_rfid():
    """Scans the RFID card and returns the UID"""
    # uid = RFIDReader().scan_rfid_tag()  # Call your actual scan function here
    uid = "1234567890"  # Mock UID for now
    return {"uid": uid}
