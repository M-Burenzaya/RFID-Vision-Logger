from fastapi import FastAPI, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from fastapi import Path, Body
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

import asyncio
import json

import sys, os

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
import numpy as np

import threading
import queue

# Load the InsightFace model globally (once)
from insightface.app import FaceAnalysis
from insightface.data import get_image as ins_get_image

# Only load the detection module (fast and lightweight)
det_model = FaceAnalysis(allowed_modules=['detection'])  
det_model.prepare(ctx_id=-1, det_size=(160, 160))  # -1 = CPU

rec_model = FaceAnalysis(name='buffalo_s', allowed_modules=['detection', 'recognition'])
rec_model.prepare(ctx_id=-1, det_size=(640, 640))
# print("Modules:", rec_model.models.keys())


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

image_capture_counter = 0
captured_image = None

face_detection_queue = queue.Queue(maxsize=1)
face_detection_result_queue = queue.Queue(maxsize=1)

face_embedding_queue = queue.Queue(maxsize=1)
face_embedding_result_queue = queue.Queue(maxsize=1)

face_recognition_queue = queue.Queue(maxsize=1)
face_recognition_result_queue = queue.Queue(maxsize=1)

# Add the src directory to the Python path
is_continuous_capture = False
is_show_features = False
is_auto_capture = False

connected_ws = None

reader = RFIDReader()
camera = CameraReader(main_resolution=(512, 512))
app = FastAPI()

@app.on_event("startup")
def start_worker_threads():
    threading.Thread(target=face_detection_worker, daemon=True).start()
    threading.Thread(target=face_embedding_worker, daemon=True).start()
    threading.Thread(target=face_recognition_worker, daemon=True).start()
    print("✅ Face detection thread started.")

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

def load_all_embeddings(db: Session):
    users = db.query(User).all()
    embeddings = []

    for user in users:
        if user.face_encoding:
            emb = np.frombuffer(user.face_encoding, dtype=np.float32)
            print(f"User: {user.name}, Embedding shape: {emb.shape}, First 5 values: {emb[:5]}")
            embeddings.append((user.name, emb))

    return embeddings

# Route to create a new RFID box

@app.post("/rfid-box/")
def create_or_update_rfid_box(data: RfidBoxCreate, db: Session = Depends(get_db)):
    existing = db.query(RfidBox).filter(RfidBox.uid == data.uid).first()

    if existing:
        # Update box name
        existing.box_name = data.box_name

        # Delete existing items
        db.query(Item).filter(Item.rfid_box_id == existing.id).delete()

        # Add new items
        for item in data.items:
            db_item = Item(
                item_name=item.item_name,
                item_description=item.item_description,
                quantity=item.quantity,
                rfid_box_id=existing.id
            )
            db.add(db_item)

        db.commit()
        return {"message": "Box updated successfully", "box_id": existing.id, "uid": existing.uid}

    else:
        # Create new box
        new_box = RfidBox(uid=data.uid, box_name=data.box_name)
        db.add(new_box)
        db.commit()
        db.refresh(new_box)

        # Add items
        for item in data.items:
            db_item = Item(
                item_name=item.item_name,
                item_description=item.item_description,
                quantity=item.quantity,
                rfid_box_id=new_box.id
            )
            db.add(db_item)

        db.commit()
        return {"message": "Box created successfully", "box_id": new_box.id, "uid": new_box.uid}


# Route to add an item to a box
@app.post("/add-item/")
def add_item(item_name: str, item_description: str, quantity: int, rfid_box_id: int, db: Session = Depends(get_db)):
    db_item = Item(item_name=item_name, item_description=item_description, quantity=quantity, rfid_box_id=rfid_box_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/rfid-box/{uid}")
def get_rfid_box(uid: str, db: Session = Depends(get_db)):
    # Check if box exists
    box = db.query(RfidBox).filter(RfidBox.uid == uid).first()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")

    # Get related items
    items = db.query(Item).filter(Item.rfid_box_id == box.id).all()

    return {
        "uid": box.uid,
        "box_name": box.box_name,
        "items": [
            {
                "item_name": item.item_name,
                "item_description": item.item_description,
                "quantity": item.quantity
            } for item in items
        ]
    }

# Route to get items by RFID box UID
@app.get("/items/{rfid_uid}")
def get_items(rfid_uid: str, db: Session = Depends(get_db)):
    db_rfid_box = db.query(RfidBox).filter(RfidBox.uid == rfid_uid).first()
    if db_rfid_box is None:
        raise HTTPException(status_code=404, detail="RFID box not found")
    return db_rfid_box.items

@app.get("/get-all-boxes")
def get_all_boxes(db: Session = Depends(get_db)):
    boxes = db.query(RfidBox).all()
    result = []
    for box in boxes:
        result.append({
            "id": box.id,
            "uid": box.uid,
            "box_name": box.box_name,
            "items": [
                {
                    "id": item.id,
                    "item_name": item.item_name,
                    "item_description": item.item_description,
                    "quantity": item.quantity,
                }
                for item in box.items
            ]
        })
    return result

@app.delete("/delete-box/{box_id}")
def delete_box(box_id: int = Path(...), db: Session = Depends(get_db)):
    box = db.query(RfidBox).filter(RfidBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")

    db.delete(box)  # Will also delete items if cascade is set
    db.commit()
    return {"message": "Box deleted successfully"}


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

    if not is_continuous_capture:
        return {"message": "Continuous capture already stopped."}

    is_continuous_capture = False
    return {"message": "Continuous capture stopped."}


@app.post("/startContinuous")
async def start_continuous_capture(background_tasks: BackgroundTasks):
    global is_continuous_capture, connected_ws

    if connected_ws is None:
        return JSONResponse(
            status_code=400,
            content={"message": "WebSocket connection not established. Cannot start capture."}
        )

    if is_continuous_capture:
        return {"message": "Already running continuous capture."}

    is_continuous_capture = True
    background_tasks.add_task(continuous_capture)
    return {"message": "Continuous capture started."}


async def continuous_capture():
    global is_continuous_capture
    frame_count = 0
    TARGET_BOX = (128, 32, 384, 288)  # Define the target box (left, top, right, bottom)
    TARGET_POSITION = ((TARGET_BOX[0] + TARGET_BOX[2]) // 2, (TARGET_BOX[1] + TARGET_BOX[3]) // 2)
    auto_trigger_capture = False
    face_center = (0, 0)
    last_recognition_result = {"name": None, "distance": None}

    """Function that continuously captures and sends images."""
    while is_continuous_capture and not auto_trigger_capture:

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
                try:
                    if face_detection_queue.empty():
                        face_detection_queue.put_nowait(processed_image.copy())
                except queue.Full:
                    pass

                try:
                    face = face_detection_result_queue.get_nowait()
                    face_detection_result_queue.task_done()
                    last_face = face  # 🔁 Update the cache
                except queue.Empty:
                    face = last_face  # ⏪ Reuse cached result

                if face is not None and len(face) > 0:
                    try:
                        if face_recognition_queue.empty():
                            face_recognition_queue.put_nowait(image.copy())
                    except queue.Full:
                        pass

                    # Get recognition result (non-blocking)
                    try:
                        recognition_result = face_recognition_result_queue.get_nowait()
                        face_recognition_result_queue.task_done()
                    except queue.Empty:
                        recognition_result = None

                    # Send only if new and valid
                    if connected_ws and recognition_result:
                        name = recognition_result.get("name")
                        distance = recognition_result.get("distance")

                        if (name != last_recognition_result["name"]) or (distance != last_recognition_result["distance"]):
                            last_recognition_result = {"name": name, "distance": distance}

                            await connected_ws.send_text(json.dumps({
                                "type": "recognition",
                                "name": name,
                                "distance": float(distance) if distance is not None else None
                            }))


                    for f in face:
                        x1, y1, x2, y2 = map(int, f.bbox)
                        face_center = ((x1 + x2) // 2, (y1 + y2) // 2)
            #---------------------------------------------
                    if is_show_features:
                        cv2.arrowedLine(processed_image, face_center, TARGET_POSITION, (0, 0, 255), 1, tipLength=0.2)
                        cv2.rectangle(processed_image, (x1, y1), (x2, y2), (0, 255, 0), 1)

                        for x, y in f.kps:
                            cv2.circle(processed_image, (int(x), int(y)), 1, (255, 0, 0), -1)
            #---------------------------------------------
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
                    is_continuous_capture = False
                
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

    try:
        face_detection_queue.queue.clear()
        face_detection_result_queue.queue.clear()
        # face_embedding_queue.queue.clear()
        # face_embedding_result_queue.queue.clear()
        # print("✅ All queues cleared after continuous capture.")
    except Exception as e:
        print(f"⚠️ Failed to clear queues: {e}")

def face_detection_worker():
    while True:
        image = face_detection_queue.get()
        try:
            face = det_model.get(image, max_num=1)
            # print(faces)
            if face_detection_result_queue.full():
                face_detection_result_queue.get_nowait()
            face_detection_result_queue.put_nowait(face)
        except Exception as e:
            print("Worker error:", e)
        finally:
            face_detection_queue.task_done()

def face_embedding_worker():
    while True:
        image = face_embedding_queue.get()
        try:
            face = det_model.get(image, max_num=1)

            for face in face:
                embedding = face[0].embedding
                embedding.append({
                    'bbox': face.bbox,
                    'embedding': embedding
                })

            if face_embedding_result_queue.full():
                face_embedding_result_queue.get_nowait()
            face_embedding_result_queue.put_nowait(embedding)

        except Exception as e:
            print("Embedding worker error:", e)
        finally:
            face_detection_result_queue.task_done()


def face_recognition_worker():
    db = next(get_db())  # Get DB session from generator
    known_embeddings = load_all_embeddings(db)  # [(name, np_embedding), ...]

    while True:
        image = face_recognition_queue.get()
        try:
            face = rec_model.get(image, max_num=1)

            if not face:
                face_recognition_result_queue.put_nowait(None)
                continue

            embedding = face[0].embedding

            # Find best match
            best_match = None
            best_distance = float("inf")
            for name, db_embedding in known_embeddings:
                distance = np.linalg.norm(embedding - db_embedding)
                if distance < best_distance:
                    best_distance = distance
                    best_match = name

            # Threshold for "recognition"
            THRESHOLD = 20.0
            if best_distance < THRESHOLD:
                result = {"name": best_match, "distance": best_distance}
            else:
                result = {"name": None, "distance": best_distance}

            face_recognition_result_queue.put_nowait(result)
            print(result)

        except Exception as e:
            print("Recognition worker error:", e)
        finally:
            face_recognition_queue.task_done()



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

    # if connected_ws is not None:
    #     await connected_ws.close()
    #     is_continuous_capture = False

    await websocket.accept()
    connected_ws = websocket  # Store the WebSocket connection

    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        # print("Client disconnected")
        is_continuous_capture = False
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
    import shutil

    normalized_name = user.name.strip().lower()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    # Check for duplicate name
    existing_user = db.query(User).filter(User.name == normalized_name).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="User with this name already exists.")

    global captured_image
    if captured_image is None:
        raise HTTPException(status_code=404, detail="No captured image found.")

    # Save image
    safe_filename = normalized_name.replace(" ", "_") + ".jpg"
    target_path = os.path.join(image_directory, safe_filename)
    cv2.imwrite(target_path, captured_image)

    # Convert image and run embedding
    rgb_image = cv2.cvtColor(captured_image, cv2.COLOR_BGR2RGB)
    faces = rec_model.get(rgb_image, max_num=1)

    if not faces:
        raise HTTPException(status_code=400, detail="No face detected in image.")

    embedding = faces[0].embedding
    embedding_blob = embedding.astype(np.float32).tobytes()

    # Save to DB
    db_user = User(
        name=normalized_name,
        image_filename=safe_filename,
        face_encoding=embedding_blob
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {"message": f"User '{normalized_name}' added", "user_id": db_user.id}

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": user.id,
            "name": user.name,
            "image_url": f"/user-image/{user.image_filename}"
        }
        for user in users
    ]

@app.get("/user-image/{filename}")
def get_user_image(filename: str):
    image_path = os.path.join(image_directory, filename)
    if os.path.exists(image_path):
        return FileResponse(image_path, media_type="image/jpeg")
    else:
        raise HTTPException(status_code=404, detail="Image not found")

@app.put("/update-user/{user_id}")
def update_user(user_id: int, user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Normalize name
    normalized_name = user.name.strip().lower()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    # Prevent duplicate name
    existing_user = db.query(User).filter(User.name == normalized_name, User.id != user_id).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Another user with this name already exists.")

    old_filename = db_user.image_filename
    old_image_path = os.path.join(image_directory, old_filename)
    new_filename = normalized_name.replace(" ", "_") + ".jpg"
    new_image_path = os.path.join(image_directory, new_filename)

    # Update DB name and filename
    db_user.name = normalized_name
    db_user.image_filename = new_filename

    global captured_image
    if captured_image:
        # Save new captured image
        cv2.imwrite(new_image_path, captured_image)

        # Recalculate embedding
        rgb_image = cv2.cvtColor(captured_image, cv2.COLOR_BGR2RGB)
        faces = rec_model.get(rgb_image, max_num=1)
        if not faces:
            raise HTTPException(status_code=400, detail="No face found")

        embedding = faces[0].embedding
        db_user.face_encoding = embedding.astype(np.float32).tobytes()

        # Optionally delete the old file if filename changed
        if old_filename != new_filename and os.path.exists(old_image_path):
            os.remove(old_image_path)

    else:
        # If no new image, rename the file if name changed
        if old_filename != new_filename and os.path.exists(old_image_path):
            os.rename(old_image_path, new_image_path)

    db.commit()
    return {"message": f"User '{normalized_name}' updated successfully"}
