from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi import Request
from fastapi.staticfiles import StaticFiles

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))
from rfid_reader import RFIDReader
from camera import CameraReader

import cv2

# To run the backend:       cd RFID-Vision-Logger/web/backend/ 
#                           uvicorn main:app --reload

# Add the src directory to the Python path

reader = RFIDReader()
camera = CameraReader()
app = FastAPI()

current_dir = os.path.dirname(os.path.abspath(__file__))
image_directory = os.path.join(current_dir, "images")
os.makedirs(image_directory, exist_ok=True) 

# Allow React frontend (adjust origin if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # For production, change to the frontend URL like: ["http://localhost:5173"]
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

@app.post("/initialize")
def initialize_rfid():
    """Initializes the RFID reader"""
    try:
        success, error = reader.initialize_rfid()
        if success:
            return {"message": "RFID reader initialized."}
        else:
            raise Exception(f"Failed to initialize RFID reader: {error}")
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Failed to initialize: {str(e)}"}
        )

@app.post("/triggerOnce")
def trigger_once():
    """Handles the trigger action when the frontend clicks 'Trigger Once'"""
    try:
        # Capture the image using the CameraReader
        image = camera.capture_image()

        if image is None:
            raise Exception("Failed to capture image.")

        # Save the captured image in the 'captured_images' directory
        image_path = os.path.join(image_directory, "captured_image.jpg")
        cv2.imwrite(image_path, image)  # Save the image as a file

        # Return the image URL to be used in the frontend
        image_url = f"/static/{os.path.basename(image_path)}"  # Serving the image through FastAPI static files
        return {"message": "Action triggered successfully!", "image_url": image_url}

    except Exception as e:
        # Handle exceptions and return an appropriate error code
        return JSONResponse(
            status_code=500,
            content={"message": f"An error occurred while triggering: {str(e)}"}
        )

# Serve static files (images) from the 'captured_images' directory
app.mount("/static", StaticFiles(directory=image_directory), name="static")

@app.get("/static/{image_name}")
async def get_image(image_name: str):
    image_path = os.path.join("path_to_images", image_name)  # Ensure this path is correct
    print(f"Serving image from: {image_path}")  # Print the image path for debugging
    if os.path.exists(image_path):
        return FileResponse(image_path)
    else:
        return JSONResponse(status_code=404, content={"message": "Image not found"})
