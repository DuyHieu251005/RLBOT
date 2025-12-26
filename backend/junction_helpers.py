"""
Helper functions for junction table operations
Implements dual-write pattern: write to both junction tables AND JSONB for backward compatibility
"""

from sqlalchemy.orm import Session as DbSession
from sqlalchemy import select, and_
from models import (
    Bot, Group, GroupMember, BotKnowledgeBase, 
    BotSharedAccess, SessionMessage, ChatSession
    # User removed - Supabase Auth handles users
)
from typing import List, Optional

# ============== GROUP MEMBERS ==============

def add_group_member(session: DbSession, group_id: str, user_id: str, role: str = 'viewer'):
    """Add member to group (junction table only)"""
    # 1. Add to junction table
    member = session.query(GroupMember).filter(
        and_(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
    ).first()
    
    if not member:
        member = GroupMember(group_id=group_id, user_id=user_id, role=role)
        session.add(member)
        session.commit()
    return member

def remove_group_member(session: DbSession, group_id: str, user_id: str):
    """Remove member from group"""
    # 1. Remove from junction table
    session.query(GroupMember).filter(
        and_(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
    ).delete()
    session.commit()

def get_group_members(session: DbSession, group_id: str) -> List[GroupMember]:
    """Get all members of a group (returns GroupMember records with user_id)"""
    members = session.query(GroupMember).filter(
        GroupMember.group_id == group_id
    ).all()
    
    return members

def get_user_groups(session: DbSession, user_id: str) -> List[Group]:
    """Get all groups user is member of"""
    groups = session.query(Group).join(
        GroupMember, Group.id == GroupMember.group_id
    ).filter(GroupMember.user_id == user_id).all()
    
    # Also include groups where user is owner
    owned_groups = session.query(Group).filter(Group.owner_id == user_id).all()
    
    # Merge and deduplicate
    all_groups = {g.id: g for g in groups + owned_groups}
    return list(all_groups.values())

# ============== BOT KNOWLEDGE BASES ==============

def add_bot_knowledge_base(session: DbSession, bot_id: str, kb_id: str):
    """Link bot to knowledge base"""
    # 1. Add to junction table
    link = session.query(BotKnowledgeBase).filter(
        and_(BotKnowledgeBase.bot_id == bot_id, BotKnowledgeBase.knowledge_base_id == kb_id)
    ).first()
    
    if not link:
        link = BotKnowledgeBase(bot_id=bot_id, knowledge_base_id=kb_id)
        session.add(link)
        session.commit()
    return link

def remove_bot_knowledge_base(session: DbSession, bot_id: str, kb_id: str):
    """Unlink bot from knowledge base"""
    # 1. Remove from junction table
    session.query(BotKnowledgeBase).filter(
        and_(BotKnowledgeBase.bot_id == bot_id, BotKnowledgeBase.knowledge_base_id == kb_id)
    ).delete()
    session.commit()

def get_bot_knowledge_bases(session: DbSession, bot_id: str) -> List[str]:
    """Get all knowledge base IDs for a bot"""
    kbs = session.query(BotKnowledgeBase.knowledge_base_id).filter(
        BotKnowledgeBase.bot_id == bot_id
    ).all()
    
    return [kb[0] for kb in kbs]

# ============== BOT SHARED ACCESS ==============

def share_bot_with_user(session: DbSession, bot_id: str, user_id: str):
    """Share bot with a user"""
    # 1. Add to junction table
    access = session.query(BotSharedAccess).filter(
        and_(BotSharedAccess.bot_id == bot_id, BotSharedAccess.user_id == user_id)
    ).first()
    
    if not access:
        access = BotSharedAccess(bot_id=bot_id, user_id=user_id)
        session.add(access)
        session.commit()
    return access

def unshare_bot_from_user(session: DbSession, bot_id: str, user_id: str):
    """Unshare bot from user"""
    # 1. Remove from junction table
    session.query(BotSharedAccess).filter(
        and_(BotSharedAccess.bot_id == bot_id, BotSharedAccess.user_id == user_id)
    ).delete()
    session.commit()

def share_bot_with_group(session: DbSession, bot_id: str, group_id: str):
    """Share bot with a group"""
    # 1. Add to junction table
    access = session.query(BotSharedAccess).filter(
        and_(BotSharedAccess.bot_id == bot_id, BotSharedAccess.group_id == group_id)
    ).first()
    
    if not access:
        access = BotSharedAccess(bot_id=bot_id, group_id=group_id)
        session.add(access)
        session.commit()
    return access

def unshare_bot_from_group(session: DbSession, bot_id: str, group_id: str):
    """Unshare bot from group"""
    # 1. Remove from junction table
    session.query(BotSharedAccess).filter(
        and_(BotSharedAccess.bot_id == bot_id, BotSharedAccess.group_id == group_id)
    ).delete()
    session.commit()

def get_bots_shared_with_user(session: DbSession, user_id: str) -> List[Bot]:
    """Get all bots shared with user (directly or via groups)"""
    # Direct shares
    direct_bots = session.query(Bot).join(
        BotSharedAccess, Bot.id == BotSharedAccess.bot_id
    ).filter(BotSharedAccess.user_id == user_id).all()
    
    # Group shares
    user_group_ids = [g.id for g in get_user_groups(session, user_id)]
    
    group_bots = []
    if user_group_ids:
        group_bots = session.query(Bot).join(
            BotSharedAccess, Bot.id == BotSharedAccess.bot_id
        ).filter(BotSharedAccess.group_id.in_(user_group_ids)).all()
    
    # Owned bots
    owned_bots = session.query(Bot).filter(Bot.owner_id == user_id).all()
    
    # Merge and deduplicate
    all_bots = {b.id: b for b in direct_bots + group_bots + owned_bots}
    return list(all_bots.values())

# ============== SESSION MESSAGES ==============

def add_session_message(session: DbSession, session_id: str, role: str, content: str):
    """Add message to session (SessionMessage table only)"""
    
    message = SessionMessage(
        session_id=session_id,
        role=role,
        content=content
    )
    session.add(message)
    # session.commit() should be called by the caller to ensure transaction atomicity
    
    return message

def get_session_messages(session: DbSession, session_id: str) -> List[SessionMessage]:
    """Get all messages for a session"""
    messages = session.query(SessionMessage).filter(
        SessionMessage.session_id == session_id
    ).order_by(SessionMessage.created_at).all()
    
    return messages
