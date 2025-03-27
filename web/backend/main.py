from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow React frontend (adjust origin if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Use your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared counter
counter = {"value": 0}

@app.get("/api/counter")
def get_counter():
    return {"value": counter["value"]}

@app.post("/api/increment")
def increment_counter():
    counter["value"] += 1
    return {"value": counter["value"]}

@app.post("/api/decrement")
def decrement_counter():
    counter["value"] -= 1
    return {"value": counter["value"]}
