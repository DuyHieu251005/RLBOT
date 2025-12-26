from fastapi import Header, Depends
from sqlalchemy.orm import Session
from database import db
from auth_utils import get_current_user_supabase

# Dependency for Database Session
def get_db():
    session = db.get_session()
    try:
        yield session
    finally:
        session.close()

# Dependency for Auth
async def get_current_user(authorization: str = Header(None)):
    """
    Dependency to get current authenticated user from Supabase JWT
    """
    return await get_current_user_supabase(authorization)
