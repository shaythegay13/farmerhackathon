from sqlalchemy.orm import Session
from app.models import get_db

def get_database():
    """Dependency to get database session"""
    return next(get_db())
