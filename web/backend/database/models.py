from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class RFIDLog(Base):
    __tablename__ = "rfid_logs"

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    image_path = Column(String, nullable=True)
