from fastapi import FastAPI, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from fastapi import Body
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import asyncio
import face_recognition
import json

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../src')))
from rfid_reader import RFIDReader
from camera import CameraReader

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from models import RfidBox, Item, User  # These are the models you created
from database import SessionLocal, init_db

from pydantic import BaseModel
from typing import List
import math

# import threading
# import queue


class ItemCreate(BaseModel):
    item_name: str
    item_description: str
    quantity: int

class RfidBoxCreate(BaseModel):
    uid: str
    box_name: str
    items: List[ItemCreate]

class UserCreate(BaseModel):
    name: str


import cv2

init_db()

rotation_angle = 180

rotate_map = {
    0: None,  # Optional: skip rotation
    90: cv2.ROTATE_90_CLOCKWISE,
    180: cv2.ROTATE_180,
    270: cv2.ROTATE_90_COUNTERCLOCKWISE
}

flip_horizontal = True
flip_vertical = False

# To run the backend:       cd RFID-Vision-Logger/web/backend/ 
#                           uvicorn main:app --reload
# Store the image capture counter (initially set to 0)

image_capture_counter = 0
captured_image = None

face_detection_queue = queue.Queue(maxsize=1)
face_encoding_queue = queue.Queue(maxsize=1)

face_locations_result_queue = queue.Queue(maxsize=1)



# Add the src directory to the Python path
is_continuous_capture = False
is_show_features = False
is_auto_capture = False

connected_ws = None

reader = RFIDReader()
camera = CameraReader(main_resolution=(512, 512))
app = FastAPI()

# @app.on_event("startup")
# def start_worker_threads():
#     threading.Thread(target=face_detection_worker, daemon=True).start()
#     threading.Thread(target=face_encoding_worker, daemon=True).start()
#     print("✅ Face detection and encoding threads started.")


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

def get_flip_code(flip_horizontal: bool, flip_vertical: bool):
    if flip_horizontal and flip_vertical:
        return -1
    elif flip_horizontal:
        return 1
    elif flip_vertical:
        return 0
    else:
        return None  # no flip

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
def create_rfid_box(data: RfidBoxCreate, db: Session = Depends(get_db)):
    # Check for duplicate UID
    existing = db.query(RfidBox).filter(RfidBox.uid == data.uid).first()
    if existing:
        raise HTTPException(status_code=400, detail="RFID UID already exists.")

    # Create new box
    new_box = RfidBox(uid=data.uid, box_name=data.box_name)
    db.add(new_box)
    db.commit()
    db.refresh(new_box)

    # Add items to that box
    for item in data.items:
        db_item = Item(
            item_name=item.item_name,
            item_description=item.item_description,
            quantity=item.quantity,
            rfid_box_id=new_box.id
        )
        db.add(db_item)

    db.commit()

    return {
        "message": "Box and items saved successfully.",
        "box_id": new_box.id,
        "uid": new_box.uid
    }


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
    global captured_image
    global is_continuous_capture
    is_continuous_capture = False
    """Handles the trigger action when the frontend clicks 'Trigger Once'"""
    try:
        # Capture the image using the CameraReader
        image = camera.capture_image()
        #---------------------------------------------          Maunual process
        if rotate_map[rotation_angle] is not None:

            image = cv2.rotate(image, rotate_map[rotation_angle])

        flip_code = get_flip_code(flip_horizontal, flip_vertical)
        
        if flip_code is not None:
            image = cv2.flip(image, flip_code)
        #---------------------------------------------

        if image is None:
            raise Exception("Failed to capture image.")
        
        # Convert the image to bytes (as a Blob)
        captured_image = image
        _, img_encoded = cv2.imencode('.jpg', image)
        img_bytes = img_encoded.tobytes()

        # Check if WebSocket connection is established
        if connected_ws:
            # Send the image as Blob (binary data) over WebSocket
            await connected_ws.send_bytes(img_bytes)  # Send image as Blob to the frontend
            print("Image sent successfully over WebSocket.")    
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


@app.post("/stopContinuous")
async def stop_continuous_capture():
    
    global is_continuous_capture
    is_continuous_capture = False  # Set flag to start capture

    # print("Stopping continuous capture...")

    return {"message": "Continuous capture stopped."}

@app.post("/startContinuous")
async def start_continuous_capture(background_tasks: BackgroundTasks):
    
    global is_continuous_capture
    is_continuous_capture = True
    background_tasks.add_task(continuous_capture)

    # print("Starting continuous capture...")

    return {"message": "Continuous capture started."}

async def continuous_capture():
    global is_continuous_capture
    frame_count = 0
    TARGET_BOX = (128, 32, 384, 288)  # Define the target box (left, top, right, bottom)
    TARGET_POSITION = ((TARGET_BOX[0] + TARGET_BOX[2]) // 2, (TARGET_BOX[1] + TARGET_BOX[3]) // 2)
    last_detected_faces = []
    auto_trigger_capture = False

    """Function that continuously captures and sends images."""
    while is_continuous_capture:

        if connected_ws is None:
            print("Frontend disconnected. Stopping continuous capture.")
            is_continuous_capture = False
            break

        frame_count += 1
        try:
            # Capture the image using the CameraReader
            image = camera.capture_image()
            if image is None:
                raise Exception("Failed to capture image.")
            
            #------------------------------------------------------------Maunual process
            if rotate_map[rotation_angle] is not None:

                image = cv2.rotate(image, rotate_map[rotation_angle])

            flip_code = get_flip_code(flip_horizontal, flip_vertical)
            
            if flip_code is not None:
                image = cv2.flip(image, flip_code)

            #------------------------------------------------------------Draw features
            processed_image = image

            if is_show_features or is_auto_capture:
                # if frame_count % 5 == 0:
                #     small = cv2.resize(processed_image, (0, 0), fx=0.5, fy=0.5)
                #     image_rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
                #     face_locations = face_recognition.face_locations(image_rgb)
                #     last_detected_faces = face_locations  # Save latest detection
                # else:
                #     face_locations = last_detected_faces

                # encodings = face_recognition.face_encodings(processed_image)
                # print("Number of faces detected:", len(encodings))
                    
                try:
                    small = cv2.resize(processed_image, (0, 0), fx=0.5, fy=0.5)
                    image_rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
                    face_detection_queue.put_nowait(image_rgb.copy())
                except queue.Full:
                    # print("Detection queue full — skipping frame.")
                    pass

                try:
                    face_locations = face_locations_result_queue.get_nowait()
                    last_detected_faces = face_locations
                except queue.Empty:
                    face_locations = last_detected_faces


                if face_locations is not None:
                    for top, right, bottom, left in face_locations:
                        top *= 2
                        right *= 2
                        bottom *= 2
                        left *= 2
                    
                        face_center = ((left + right) // 2, (top + bottom) // 2)

                        if is_show_features:
                            #---------------------------------------------
                            cv2.arrowedLine(processed_image, face_center, TARGET_POSITION, (0, 0, 255), 1, tipLength=0.2)
                            #---------------------------------------------
                            cv2.rectangle(processed_image, (left, top), (right, bottom), (0, 255, 0), 1)
                if is_show_features:
                    cv2.rectangle(processed_image, (TARGET_BOX[0], TARGET_BOX[1]), (TARGET_BOX[2], TARGET_BOX[3]), (255, 255, 0), 1)
                #---------------------------------------------
            if is_auto_capture:
                # 1. Error vector
                dx = TARGET_POSITION[0] - face_center[0]
                dy = TARGET_POSITION[1] - face_center[1]

                # 2. Magnitude (Euclidean distance)
                error_magnitude = math.sqrt(dx**2 + dy**2)

                # 3. Threshold comparison
                THRESHOLD = 15  # you can tune this value

                if error_magnitude < THRESHOLD:
                    # 4. Trigger capture
                    auto_trigger_capture = True
                
            #---------------------------------------------
            # Convert the image to bytes (as a Blob)
            if is_show_features and not auto_trigger_capture :
                _, img_encoded = cv2.imencode('.jpg', processed_image)
            else:
                _, img_encoded = cv2.imencode('.jpg', image)

            img_bytes = img_encoded.tobytes()

            if connected_ws:                                    # Send the image as Blob (binary data) over WebSocket
                await connected_ws.send_text(json.dumps({"type": "auto_trigger", "status": auto_trigger_capture}))
                await connected_ws.send_bytes(img_bytes)
            else:
                print("WebSocket connection not established. Skipping image sending.")

        except Exception as e:
            print(f"Error occurred while capturing or sending image: {str(e)}")

        await asyncio.sleep(1 / 30)  # 30 FPS

# def face_detection_worker():
#     while True:
#         image = face_detection_queue.get()

#         try:
#             rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
#             face_locations = face_recognition.face_locations(rgb_image)

#             if len(face_locations) > 0:
#                 try:
#                     # Send face data to encoding thread
#                     face_encoding_queue.put_nowait((rgb_image, face_locations))
#                 except queue.Full:
#                     print("Encoding queue is full — skipping.")

#                 try:
#                     # Send face locations to main loop (non-blocking)
#                     if face_locations_result_queue.full():
#                         face_locations_result_queue.get_nowait()  # Remove stale data
#                     face_locations_result_queue.put_nowait(face_locations)
#                 except queue.Full:
#                     print("Result queue full — skipping.")

#             else:
#                 print("No face detected.")
#         except Exception as e:
#             print("Face detection error:", e)

#         face_detection_queue.task_done()


# def face_encoding_worker():
#     while True:
#         rgb_image, face_locations = face_encoding_queue.get()

#         try:
#             encodings = face_recognition.face_encodings(rgb_image, known_face_locations=face_locations)
#             if encodings:
#                 print(f"✅ Face encoded. {len(encodings)} face(s)")
#                 # TODO: Save to DB, compare with known users, etc.
#             else:
#                 print("⚠️ No encodings found.")
#         except Exception as e:
#             print("Encoding error:", e)

#         face_encoding_queue.task_done()



class ShowFeaturesRequest(BaseModel):
    show_features: bool
@app.post("/setShowFeatures")
async def set_show_features(data: ShowFeaturesRequest):
    global is_show_features
    is_show_features = data.show_features
    return {"is_show_features": is_show_features}

class AutoCaptureRequest(BaseModel):
    auto_capture: bool
@app.post("/setAutoCapture")
async def set_auto_capture(data: AutoCaptureRequest):
    global is_auto_capture
    is_auto_capture = data.auto_capture
    return {"is_auto_capture": is_auto_capture}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global connected_ws  # Use the global variable
    global is_continuous_capture

    if connected_ws is not None:
        await connected_ws.close()
        is_continuous_capture = False

    await websocket.accept()
    connected_ws = websocket  # Store the WebSocket connection

    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        # print("Client disconnected")
        connected_ws = None  # Reset the WebSocket connection when disconnected

# @app.post("/disconnected")
# async def frontend_disconnected(request: Request):
#     data = await request.json()
#     global is_continuous_capture

#     print("Frontend disconnected:", data)
#     is_continuous_capture = False
#     return {"message": "Goodbye acknowledged"}

@app.post("/rotateCW")
def rotate_clockwise():
    global rotation_angle
    rotation_angle = (rotation_angle + 90) % 360
    return {"rotation_angle": rotation_angle}

@app.post("/rotateCCW")
def rotate_counterclockwise():
    global rotation_angle
    rotation_angle = (rotation_angle - 90) % 360
    return {"rotation_angle": rotation_angle}

@app.post("/flipH")
def set_flip_horizontal():
    global flip_horizontal
    flip_horizontal = not flip_horizontal  # toggle
    return {"flip_horizontal": flip_horizontal}

@app.post("/flipV")
def set_flip_vertical():
    global flip_vertical
    flip_vertical = not flip_vertical  # toggle
    return {"flip_vertical": flip_vertical}

#----------------------------------------Get Requests----------------------------------------------------------
@app.get("/vision-settings")
def get_vision_settings():
    return {
        "is_show_features": is_show_features,
        "is_auto_capture": is_auto_capture
    }

@app.post("/add-user")
def add_user(user: UserCreate, db: Session = Depends(get_db)):
    # print("Received user data:", user)
    import shutil
    #-----------------------------------------------------------------------------User name-----------------------
    if not user.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    #-----------------------------------------------------------------------------User image----------------------
    global captured_image
    if captured_image is None:
        raise HTTPException(status_code=404, detail="No captured image found.")

    # Save the image with user's name
    safe_name = user.name.strip().replace(" ", "_")
    target_path = os.path.join(image_directory, f"{safe_name}.jpg")
    cv2.imwrite(target_path, captured_image)
    #-----------------------------------------------------------------------------User face encoding-------------
    rgb_image = cv2.cvtColor(captured_image, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb_image)
    if len(encodings) == 0:
        print("No face detected in image.")
        raise HTTPException(status_code=400, detail="No face detected in image.")

    face_encoding = encodings[0]
    encoding_json = json.dumps(face_encoding.tolist())

    # Save user to DB
    db_user = User(
        name=user.name,
        image_filename=f"{safe_name}.jpg",
        face_encoding=encoding_json
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {"message": f"User '{user.name}' added", "user_id": db_user.id}
