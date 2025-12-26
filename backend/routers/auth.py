from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession
from dependencies import get_current_user, get_db
from junction_helpers import get_bots_shared_with_user, get_user_groups
from models import (
    BotKnowledgeBase,
    BotSharedAccess,
    KnowledgeBase,
    GroupMember,
    Notification,
    File,
)

router = APIRouter(prefix="/api")

@router.get("/auth/verify")
async def verify_auth(user: dict = Depends(get_current_user)):
    """Verify Supabase JWT token and return user info"""
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", user["email"].split("@")[0]),
    }

@router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", user["email"].split("@")[0]),
    }

@router.get("/user/{user_id}/dashboard")
async def get_user_dashboard(
    user_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """
    OPTIMIZED: Load ALL dashboard data in ONE request
    Returns: bots, knowledge_bases, groups
    Reduces 3 API calls to 1 → Faster login!
    """
    # Verify user is requesting their own dashboard
    if user_id != user_session["id"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Cannot access another user's dashboard")

    # --- 1. Load Bots (Shared + Owned) ---
    bots = get_bots_shared_with_user(session, user_id)
    bot_ids = [b.id for b in bots]

    # Pre-fetch Knowledge Bases for these bots
    kb_mappings = (
        session.query(BotKnowledgeBase.bot_id, BotKnowledgeBase.knowledge_base_id)
        .filter(BotKnowledgeBase.bot_id.in_(bot_ids))
        .all()
        if bot_ids
        else []
    )
    bot_kbs = {}
    for bot_id, kb_id in kb_mappings:
        bot_kbs.setdefault(bot_id, []).append(kb_id)

    # Pre-fetch Shared With Users (user_ids only - no User table)
    shared_users_mappings = (
        session.query(BotSharedAccess.bot_id, BotSharedAccess.user_id)
        .filter(
            BotSharedAccess.bot_id.in_(bot_ids), BotSharedAccess.user_id.isnot(None)
        )
        .all()
        if bot_ids
        else []
    )
    bot_shared_users = {}
    for bot_id, user_id in shared_users_mappings:
        bot_shared_users.setdefault(bot_id, []).append(user_id)

    # Pre-fetch Shared With Groups
    shared_groups_mappings = (
        session.query(BotSharedAccess.bot_id, BotSharedAccess.group_id)
        .filter(
            BotSharedAccess.bot_id.in_(bot_ids), BotSharedAccess.group_id.isnot(None)
        )
        .all()
        if bot_ids
        else []
    )
    bot_shared_groups = {}
    for bot_id, group_id in shared_groups_mappings:
        bot_shared_groups.setdefault(bot_id, []).append(group_id)

    # Pre-fetch Bot Files from File table
    bot_files_mappings = (
        session.query(File)
        .filter(File.bot_id.in_(bot_ids))
        .all()
        if bot_ids
        else []
    )
    bot_files = {}
    for f in bot_files_mappings:
        file_data = {
            "id": f.id,
            "name": f.filename,
            "type": f.file_type,
            "size": f.file_size,
        }
        bot_files.setdefault(f.bot_id, []).append(file_data)

    bots_data = [
        {
            "id": b.id,
            "name": b.name,
            "custom_instructions": b.custom_instructions,
            "knowledge_base_ids": bot_kbs.get(b.id, []),
            "uploaded_files": bot_files.get(b.id, []),
            "ai_provider": b.ai_provider or "gemini",
            "is_public": getattr(b, "is_public", False),
            "owner_id": b.owner_id,
            "shared_with": bot_shared_users.get(b.id, []),
            "shared_with_groups": bot_shared_groups.get(b.id, []),
            "created_at": b.created_at,
        }
        for b in bots
    ]

    # --- 2. Load Knowledge Bases ---
    kbs = session.query(KnowledgeBase).filter(KnowledgeBase.owner_id == user_id).all()
    kbs_data = [
        {
            "id": kb.id,
            "name": kb.name,
            "description": kb.description,
            "file_count": kb.file_count,
            "chunk_count": kb.chunk_count,
            "created_at": kb.created_at,
        }
        for kb in kbs
    ]

    # --- 3. Load Groups (Member or Owner) ---
    user_groups = get_user_groups(session, user_id)
    group_ids = [g.id for g in user_groups]

    # Pre-fetch Members for these groups (user_ids only - no User table)
    group_members_mappings = (
        session.query(GroupMember.group_id, GroupMember.user_id)
        .filter(GroupMember.group_id.in_(group_ids))
        .all()
        if group_ids
        else []
    )
    group_members_map = {}
    for group_id, user_id in group_members_mappings:
        group_members_map.setdefault(group_id, []).append(user_id)

    # Check pending invites
    pending_invites = (
        session.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.type == "group_invite",
            Notification.status == "pending",
        )
        .all()
    )
    pending_group_ids = {
        notif.data.get("group_id")
        for notif in pending_invites
        if notif.data and "group_id" in notif.data
    }

    filtered_groups = []
    for g in user_groups:
        # Skip if pending invite
        if g.id in pending_group_ids and g.owner_id != user_id:
            continue
        filtered_groups.append(g)

    groups_data = [
        {
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "members": group_members_map.get(g.id, []),
            "owner_id": g.owner_id,
            "bot_count": g.bot_count,
            "member_count": len(group_members_map.get(g.id, [])),
            "created_at": g.created_at,
        }
        for g in filtered_groups
    ]

    return {"bots": bots_data, "knowledge_bases": kbs_data, "groups": groups_data}
