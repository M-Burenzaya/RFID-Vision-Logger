from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import Request

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))
from rfid_reader import RFIDReader

# To run the backend:       cd RFID-Vision-Logger/web/backend/ 
#                           uvicorn main:app --reload

# Add the src directory to the Python path

reader = RFIDReader()
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

# Initialize
@app.post("/initialize")
def initialize_rfid():
    """Initializes the RFID reader"""
    try:
        success, error = reader.initialize_rfid()
        if success:
            return {"message": "RFID reader initialized."}
        else:
            return JSONResponse(
                status_code=500,
                content={"message": f"Failed to initialize RFID reader: {error}"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Exception while initializing: {e}"}
        )

# Halt
@app.post("/halt")
def halt_rfid():
    """Halts communication with the RFID card"""
    try:
        success, error = reader.halt_rfid()
        if success:
            return {"message": "Communication halted."}
        else:
            return JSONResponse(
                status_code=500,
                content={"message": f"Failed to halt communication: {error}"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Exception while halting: {e}"}
        )

# Reset
@app.post("/reset")
def reset_rfid():
    """Resets the RFID reader"""
    try:
        success, error = reader.reset_rfid()
        if success:
            return {"message": "RFID reader has been reset."}
        else:
            return JSONResponse(
                status_code=500,
                content={"message": f"Failed to reset RFID reader: {error}"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Exception while resetting: {e}"}
        )

# Close
@app.post("/close")
def close_rfid():
    """Closes the RFID reader"""
    try:
        success, error = reader.close_rfid()
        if success:
            return {"message": "RFID reader closed successfully."}
        else:
            return JSONResponse(
                status_code=500,
                content={"message": f"Failed to close RFID reader: {error}"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Failed to close RFID reader: {e}"}
        )


# Scan
@app.post("/scan")
def scan_rfid():
    """Scans for an RFID card and returns UID"""
    success, result = reader.scan_rfid()
    if success:
        return {"message": "RFID card detected.", "uid": result["uid"]}
    else:
        return JSONResponse(status_code=500, content={"message": result})

# Read
@app.post("/read")
async def read_rfid(request: Request):
    """Reads data from a specified RFID block"""
    try:
        body = await request.json()
        block = body.get("block", 8)  # default to block 8 if not provided
        success, result = reader.read_rfid(block=block)

        if success:
            return {
                "message": "Card read successfully.",
                "uid": result["uid"],
                "data": result["data"]
            }
        else:
            return JSONResponse(status_code=500, content={"message": result})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})


# Write
@app.post("/write")
async def write_rfid(request: Request):
    try:
        body = await request.json()
        block = int(body.get("block"))
        data_str = body.get("data", "")

        success, result, error = reader.write_rfid(block, data_str)

        if success:
            return {
                "message": "Data written successfully.",
                "uid": result["uid"],
                "block": result["block"]
            }
        else:
            return JSONResponse(
                status_code=500,
                content={"message": "Failed to write RFID card.", "error": error}
            )
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})