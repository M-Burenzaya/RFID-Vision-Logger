from fastapi import FastAPI, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
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

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from models import RfidBox, Item  # These are the models you created
from database import SessionLocal, init_db


import cv2

init_db()



# To run the backend:       cd RFID-Vision-Logger/web/backend/ 
#                           uvicorn main:app --reload
# Store the image capture counter (initially set to 0)
image_capture_counter = 0
# Add the src directory to the Python path
is_continuous_capture = False

connected_ws = None

reader = RFIDReader()
camera = CameraReader()
app = FastAPI()

current_dir = os.path.dirname(os.path.abspath(__file__))
image_directory = os.path.join(current_dir, "images")
os.makedirs(image_directory, exist_ok=True)
image_path = os.path.join(image_directory, "captured_image.jpg")

# Allow React frontend (adjust origin if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # For production, change to the frontend URL like: ["http://localhost:5173"]
    allow_credentials=True,
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

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Route to create a new RFID box
@app.post("/rfid-box/")
def create_rfid_box(uid: str, box_name: str, db: Session = Depends(get_db)):
    db_rfid_box = RfidBox(uid=uid, box_name=box_name)
    db.add(db_rfid_box)
    db.commit()
    db.refresh(db_rfid_box)
    return db_rfid_box

# Route to add an item to a box
@app.post("/add-item/")
def add_item(item_name: str, item_description: str, quantity: int, rfid_box_id: int, db: Session = Depends(get_db)):
    db_item = Item(item_name=item_name, item_description=item_description, quantity=quantity, rfid_box_id=rfid_box_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# Route to get items by RFID box UID
@app.get("/items/{rfid_uid}")
def get_items(rfid_uid: str, db: Session = Depends(get_db)):
    db_rfid_box = db.query(RfidBox).filter(RfidBox.uid == rfid_uid).first()
    if db_rfid_box is None:
        raise HTTPException(status_code=404, detail="RFID box not found")
    return db_rfid_box.items

# Initialize
@app.post("/initialize")
def initialize_rfid():
    """Initializes the RFID reader"""
    try:
        success, error = reader.initialize_rfid()
        if success:
            return JSONResponse(
                status_code=200,
                content={"message": "RFID reader initialized."}
            )
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
            return JSONResponse(
                status_code=200,
                content={"message": "Communication halted."}
            )
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
    # print("[INFO] Scanning for RFID card...")
    success, result = reader.scan_rfid()

    if success:
        return {"message": "RFID card detected.", "uid": result["uid"]}
    else:
        return JSONResponse(status_code=500, content={"message": result})

@app.post("/scancont")
def scan_rfid_continuous():
    """Scans for an RFID card continuously until detected"""
    success, result = reader.scan_rfid(continuous=True)
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
async def trigger_once():
    global is_continuous_capture
    is_continuous_capture = False
    """Handles the trigger action when the frontend clicks 'Trigger Once'"""
    try:
        # Capture the image using the CameraReader
        image = camera.capture_image()

        if image is None:
            raise Exception("Failed to capture image.")
        
        # Convert the image to bytes (as a Blob)
        _, img_encoded = cv2.imencode('.jpg', image)
        img_bytes = img_encoded.tobytes()

        # Check if WebSocket connection is established
        if connected_ws:
            # Send the image as Blob (binary data) over WebSocket
            await connected_ws.send_bytes(img_bytes)  # Send image as Blob to the frontend
            return {"message": "Image sent successfully over WebSocket."}
        else:
            # If no WebSocket connection, handle the case where no connection exists
            return JSONResponse(
                status_code=400,
                content={"message": "WebSocket connection not established."}
            )
    except Exception as e:
        # Handle exceptions and return an appropriate error code
        return JSONResponse(
            status_code=500,
            content={"message": f"An error occurred while triggering: {str(e)}"}
        )


@app.post("/startContinuous")
async def start_continuous_capture(background_tasks: BackgroundTasks):
    
    global is_continuous_capture
    is_continuous_capture = True  # Set flag to start capture

    background_tasks.add_task(continuous_capture)

    # print("Starting continuous capture...")

    return {"message": "Continuous capture started."}

@app.post("/stopContinuous")
async def stop_continuous_capture():
    
    global is_continuous_capture
    is_continuous_capture = False  # Set flag to stop capture

    # print("Stopping continuous capture...")

    return {"message": "Continuous capture stopped."}

async def continuous_capture():
    """Function that continuously captures and sends images."""
    while is_continuous_capture:
        try:
            # Capture the image using the CameraReader
            image = camera.capture_image()

            if image is None:
                raise Exception("Failed to capture image.")
            
            # Convert the image to bytes (as a Blob)
            _, img_encoded = cv2.imencode('.jpg', image)
            img_bytes = img_encoded.tobytes()

            # Check if WebSocket connection is established
            if connected_ws:
                # Send the image as Blob (binary data) over WebSocket
                await connected_ws.send_bytes(img_bytes)  # Send image as Blob to the frontend
            else:
                # If no WebSocket connection, handle the case where no connection exists
                print("WebSocket connection not established. Skipping image sending.")
        except Exception as e:
            # Handle exceptions and return an appropriate error code
            print(f"Error occurred while capturing or sending image: {str(e)}")


        # Sleep for a short duration before capturing the next image
        await asyncio.sleep(1 / 30)  # Capture an image every second (adjust as needed)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global connected_ws  # Use the global variable
    await websocket.accept()
    connected_ws = websocket  # Store the WebSocket connection

    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        print("Client disconnected")
        connected_ws = None  # Reset the WebSocket connection when disconnected