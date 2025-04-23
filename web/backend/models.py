from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# Global item registry
class ItemMaster(Base):
    __tablename__ = "item_master"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    total_quantity = Column(Integer)

    box_items = relationship("BoxItem", back_populates="item", cascade="all, delete-orphan")
    user_items = relationship("UserItem", back_populates="item", cascade="all, delete-orphan")

# RFID-tagged boxes
class RfidBox(Base):
    __tablename__ = "rfid_boxes"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True)
    box_name = Column(String)

    box_items = relationship("BoxItem", back_populates="box", cascade="all, delete-orphan")

# Link table for items in each box
class BoxItem(Base):
    __tablename__ = "box_items"

    id = Column(Integer, primary_key=True, index=True)
    box_id = Column(Integer, ForeignKey("rfid_boxes.id"))
    item_id = Column(Integer, ForeignKey("item_master.id"))
    quantity = Column(Integer)

    box = relationship("RfidBox", back_populates="box_items")
    item = relationship("ItemMaster", back_populates="box_items")

# Users
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    image_filename = Column(String)
    face_encoding = Column(LargeBinary)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_items = relationship("UserItem", back_populates="user", cascade="all, delete-orphan")
    item_logs = relationship("ItemLog", back_populates="user", cascade="all, delete-orphan")

# Tracks what items each user currently holds
class UserItem(Base):
    __tablename__ = "user_items"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_id = Column(Integer, ForeignKey("item_master.id"))
    quantity = Column(Integer)

    user = relationship("User", back_populates="user_items")
    item = relationship("ItemMaster", back_populates="user_items")

# Logs of user actions (add/return)
class ItemLog(Base):
    __tablename__ = "item_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    items_added = Column(Text)      # JSON string: [{item_id, name, qty}]
    items_returned = Column(Text)   # JSON string: [{item_id, name, qty}]
    comment = Column(String)

    user = relationship("User", back_populates="item_logs")

