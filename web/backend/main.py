from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))
from rfid_reader import RFIDReader

# To run the backend:       cd RFID-Vision-Logger/web/backend/ 
#                           uvicorn main:app --reload

# Add the src directory to the Python path

app = FastAPI()

# Allow React frontend (adjust origin if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, change to the frontend URL like: ["http://localhost:5173"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# For POST /read and /write requests
class BlockData(BaseModel):
    block: str
    data: str | None = None  # Optional in /read

# Shared counter (in-memory)
counter = {"value": 0}

@app.get("/counter")
def get_counter():
    """Returns the current counter value"""
    return {"value": counter["value"]}

@app.post("/increment")
def increment_counter():
    """Increments the counter value"""
    counter["value"] += 1
    return {"value": counter["value"]}

@app.post("/decrement")
def decrement_counter():
    """Decrements the counter value"""
    counter["value"] -= 1
    return {"value": counter["value"]}

# Example of integrating RFIDReader if needed
@app.post("/initialize")
def initialize_rfid():
    """Initializes the RFID reader"""
    # print("Initializing the RFID reader...")
    # RFIDReader().initialize_reader()  # Call your actual RFID initialization function here
    return {"message": "Reader initialized"}

# Reset
@app.post("/reset")
def reset_rfid():
    # RFIDReader().reset()
    return {"message": "Reader reset to default state."}

# Close
@app.post("/close")
def close_rfid():
    # RFIDReader().close()
    return {"message": "Reader session closed."}

# Halt
@app.post("/halt")
def halt_rfid():
    # RFIDReader().halt()
    return {"message": "Communication halted."}

# Scan
@app.post("/scan")
def scan_rfid():
    # uid = RFIDReader().scan()
    uid = "04AABBCCDDEE"  # Example dummy UID
    return {"message": "Card scanned successfully.", "uid": uid}

# Read
@app.post("/read")
def read_data(body: BlockData):
    block = body.block
    # data = RFIDReader().read_block(int(block))
    data = "TestDataBlock"  # Dummy data
    return {"message": f"Data read from block {block}.", "data": data}

# Write
@app.post("/write")
def write_data(body: BlockData):
    block = body.block
    data = body.data
    # RFIDReader().write_block(int(block), data)
    return {"message": f"Data written to block {block}: {data}"}