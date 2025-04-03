from fastapi import FastAPI, BackgroundTasks, Request, WebSocket, Response
from fastapi.responses import StreamingResponse 
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import asyncio

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))
from rfid_reader import RFIDReader
from camera import CameraReader

import cv2

# To run the backend:       cd RFID-Vision-Logger/web/backend/ 
#                           uvicorn main:app --reload
# Store the image capture counter (initially set to 0)
image_capture_counter = 0
# Add the src directory to the Python path
is_continuous_capture = False

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
        
        temp_image_path = os.path.join(image_directory, "temp.jpg")
        cv2.imwrite(temp_image_path, image)  # Save as temp.jpg

        final_image_path = os.path.join(image_directory, "captured_image.jpg")
        os.rename(temp_image_path, final_image_path)  # Rename file

        image_url = f"/static/{os.path.basename(final_image_path)}" 
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
    image_path = os.path.join(image_directory, image_name)  # Ensure this path is correct
    print(f"Serving image from: {image_path}")  # Print the image path for debugging
    if os.path.exists(image_path):
        return FileResponse(image_path)
    else:
        return JSONResponse(status_code=404, content={"message": "Image not found"})








@app.post("/startContinuous")
async def start_continuous_capture(background_tasks: BackgroundTasks):
    """Starts continuous image capture and streams to the frontend."""
    global is_continuous_capture
    is_continuous_capture = True  # Set flag to start capture

    # Start the image capture in the background
    background_tasks.add_task(generate_frames)
    print("[INFO] Continuous capture started.")

    return {"message": "Continuous capture started."}

@app.post("/stopContinuous")
async def stop_continuous_capture():
    """Stops continuous image capture."""
    global is_continuous_capture
    is_continuous_capture = False  # Set flag to stop capture
    print("[INFO] Continuous capture stopped.")

    return {"message": "Continuous capture stopped."}



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        # Capture the frame
        image = camera.capture_array()
        if image is not None:
            ret, buffer = cv2.imencode('.jpg', image)  # Encode the frame as JPEG
            if not ret:
                break
            frame_bytes = buffer.tobytes()

            try:
                # Send the frame over WebSocket
                await websocket.send_bytes(frame_bytes)
            except Exception as e:
                print(f"Error sending frame: {e}")
                break

            await asyncio.sleep(1 / 30)  # 30 FPS

@app.get("/video_feed")
async def video_feed():
    """Stream video frames."""
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

async def generate_frames():
    """Generate frames for the video stream."""
    while is_continuous_capture:
        image = camera.capture_image()
        if image is not None:
            ret, buffer = cv2.imencode('.jpg', image)
            if not ret:
                break
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        await asyncio.sleep(1 / 30)
            