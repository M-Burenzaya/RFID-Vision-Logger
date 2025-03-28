from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

# SQLite: file-based
SQLALCHEMY_DATABASE_URL = "sqlite:///./database.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create the tables if they don't exist
Base.metadata.create_all(bind=engine)
