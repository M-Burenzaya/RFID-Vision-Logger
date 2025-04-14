# models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary, Text
from sqlalchemy.orm import relationship
from database import Base  # ✅ Use Base from database.py
from datetime import datetime

class RfidBox(Base):
    __tablename__ = "rfid_boxes"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True)
    box_name = Column(String)
    items = relationship("Item", back_populates="rfid_box")

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String)
    item_description = Column(String)
    quantity = Column(Integer)
    rfid_box_id = Column(Integer, ForeignKey("rfid_boxes.id"))
    rfid_box = relationship("RfidBox", back_populates="items")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    image_filename = Column(String)
    face_encoding = Column(LargeBinary)  # Use binary blob
    created_at = Column(DateTime, default=datetime.utcnow)
