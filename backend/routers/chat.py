from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession
from typing import List
import uuid

from dependencies import get_db
from schemas import ChatSessionCreate, ChatSessionUpdate, MessageAdd
from models import ChatSession, SessionMessage
from junction_helpers import add_session_message, get_session_messages

router = APIRouter(prefix="/api/chat-sessions")

@router.post("")
async def create_chat_session(
    session_data: ChatSessionCreate, session: DbSession = Depends(get_db)
):
    """Create or update a chat session"""
    # No need to verify/create user - Supabase Auth handles users
    # owner_id is just the Supabase user UUID

    # Generate IDs for messages if not provided
    messages_with_ids = []
    for msg in session_data.messages:
        msg_dict = msg.dict()
        if not msg_dict.get("id"):
            msg_dict["id"] = str(uuid.uuid4())
        messages_with_ids.append(msg_dict)

    # Create session (messages column removed)
    new_session = ChatSession(
        title=session_data.title,
        owner_id=session_data.owner_id,
    )
    session.add(new_session)
    session.commit()
    session.refresh(new_session)

    # Add messages to junction table
    for msg_dict in messages_with_ids:
        add_session_message(
            session, new_session.id, msg_dict["role"], msg_dict["content"]
        )
    session.commit()

    return {"id": new_session.id, "message": "Session created"}

@router.get("/{user_id}")
async def get_user_chat_sessions(user_id: str, session: DbSession = Depends(get_db)):
    """Get all chat sessions for a user"""
    sessions = (
        session.query(ChatSession)
        .filter(ChatSession.owner_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

    result = []
    for s in sessions:
        # Get last message for preview in HistoryDrawer
        last_msg = (
            session.query(SessionMessage)
            .filter(SessionMessage.session_id == s.id)
            .order_by(SessionMessage.created_at.desc())
            .first()
        )

        msgs = []
        if last_msg:
            msgs.append(
                {
                    "id": last_msg.id,
                    "role": last_msg.role,
                    "content": last_msg.content,
                    "timestamp": last_msg.created_at.isoformat()
                    if last_msg.created_at
                    else None,
                }
            )

        result.append(
            {
                "id": s.id,
                "title": s.title,
                "messages": msgs,  # Return list with just last message for preview
                "owner_id": s.owner_id,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
        )

    return result

@router.get("/{session_id}/messages")
async def get_session_messages_endpoint(
    session_id: str, session: DbSession = Depends(get_db)
):
    """Get all messages for a specific chat session"""
    messages = get_session_messages(session, session_id)
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "timestamp": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]

@router.post("/{session_id}/messages")
async def add_message_to_session(
    session_id: str,
    message_data: MessageAdd,
    session: DbSession = Depends(get_db),
):
    """Add a single message to an existing chat session (Append-only, optimized)"""
    # Verify session exists
    chat_session = (
        session.query(ChatSession).filter(ChatSession.id == session_id).first()
    )
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add the new message
    new_message = add_session_message(session, session_id, message_data.role, message_data.content)
    session.commit()

    # Update session's updated_at timestamp
    chat_session.updated_at = None  # Will be set by onupdate
    session.commit()

    return {
        "id": new_message.id,
        "role": new_message.role,
        "content": new_message.content,
        "timestamp": new_message.created_at.isoformat() if new_message.created_at else None,
    }

@router.put("/{session_id}")
async def update_chat_session(
    session_id: str,
    session_data: ChatSessionUpdate,
    session: DbSession = Depends(get_db),
):
    """Update a chat session"""
    chat_session = (
        session.query(ChatSession).filter(ChatSession.id == session_id).first()
    )
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session_data.title:
        chat_session.title = session_data.title

    if session_data.messages:
        # Generate IDs for messages if not provided
        messages_with_ids = []
        for msg in session_data.messages:
            msg_dict = msg.dict()
            if not msg_dict.get("id"):
                msg_dict["id"] = str(uuid.uuid4())
            messages_with_ids.append(msg_dict)

        # Clear old messages from junction table and re-add
        # Ideally we should diff and update, but for simplicity in this MVP we replace
        session.query(SessionMessage).filter(
            SessionMessage.session_id == session_id
        ).delete()

        # Add new messages to junction table
        for msg_dict in messages_with_ids:
            add_session_message(
                session, session_id, msg_dict["role"], msg_dict["content"]
            )

    session.commit()
    return {"message": "Session updated"}

@router.delete("/{session_id}")
async def delete_chat_session(session_id: str, session: DbSession = Depends(get_db)):
    """Delete a chat session"""
    chat_session = (
        session.query(ChatSession).filter(ChatSession.id == session_id).first()
    )
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.delete(chat_session)
    session.commit()
    return {"message": "Session deleted"}