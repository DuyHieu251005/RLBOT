"""
Bots Router - All endpoints secured with authentication and ownership verification
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session as DbSession
from typing import List

from dependencies import get_current_user, get_db
from schemas import BotCreate, BotShare
from models import (
    Bot,
    BotKnowledgeBase,
    BotSharedAccess,
    File,
    Group,
    GroupMember,
    Notification,
    KnowledgeBase
)
from junction_helpers import (
    add_bot_knowledge_base,
    share_bot_with_group,
    unshare_bot_from_group,
    get_bots_shared_with_user,
    unshare_bot_from_user
)
from auth_utils import lookup_user_by_email, lookup_user_by_id, lookup_users_batch
from constants import (
    AI_PROVIDER_GEMINI,
    NOTIFICATION_BOT_SHARE,
    NOTIFICATION_BOT_GROUP_SHARE,
    STATUS_PENDING,
    STATUS_READ,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


def verify_bot_access(session: DbSession, bot_id: str, user_id: str, require_owner: bool = False) -> Bot:
    """
    Verify user has access to a bot.
    - require_owner=True: Only bot owner can access
    - require_owner=False: Owner OR shared users can access
    Returns the bot if access is granted, raises HTTPException otherwise.
    """
    bot = session.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    if require_owner:
        if bot.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Only the bot owner can perform this action")
        return bot
    
    # Check if owner
    if bot.owner_id == user_id:
        return bot
    
    # Check if shared directly
    shared_access = session.query(BotSharedAccess).filter(
        BotSharedAccess.bot_id == bot_id,
        BotSharedAccess.user_id == user_id
    ).first()
    if shared_access:
        return bot
    
    # Check if shared via group
    user_groups = session.query(GroupMember.group_id).filter(GroupMember.user_id == user_id).all()
    user_group_ids = [g[0] for g in user_groups]
    
    group_access = session.query(BotSharedAccess).filter(
        BotSharedAccess.bot_id == bot_id,
        BotSharedAccess.group_id.in_(user_group_ids)
    ).first()
    if group_access:
        return bot
    
    raise HTTPException(status_code=403, detail="You do not have access to this bot")


@router.post("/bots")
async def create_bot(
    bot: BotCreate,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Create a new bot - authenticated and owner verification"""
    # Verify the owner_id matches authenticated user
    if bot.owner_id != user_session["id"]:
        raise HTTPException(
            status_code=403,
            detail="Cannot create bot for another user"
        )
    
    logger.debug(f"CREATE BOT REQUEST - Owner ID: {bot.owner_id}, Bot Name: {bot.name}")

    # Parse instructions into system and custom
    custom_inst = bot.custom_instructions

    new_bot = Bot(
        name=bot.name,
        custom_instructions=custom_inst,
        ai_provider=bot.ai_provider or AI_PROVIDER_GEMINI,
        is_public=bot.is_public or False,
        owner_id=bot.owner_id,
    )
    session.add(new_bot)
    session.commit()
    session.refresh(new_bot)

    # Sync knowledge bases to junction table
    for kb_id in bot.knowledge_base_ids or []:
        add_bot_knowledge_base(session, new_bot.id, kb_id)
    
    # Save uploaded files to File table
    saved_files = []
    for file_data in bot.uploaded_files or []:
        new_file = File(
            bot_id=new_bot.id,
            filename=file_data.get("name", "unknown"),
            file_size=file_data.get("size", 0),
            file_type=file_data.get("type", "text/plain"),
            content=file_data.get("content", ""),
            status="completed",
        )
        session.add(new_file)
        saved_files.append({
            "id": new_file.id,
            "name": new_file.filename,
            "size": new_file.file_size,
            "type": new_file.file_type,
            "content": new_file.content,
        })
    
    session.commit()
    logger.debug(f"Saved {len(saved_files)} files for bot {new_bot.id}")

    return {
        "id": new_bot.id,
        "name": new_bot.name,
        "custom_instructions": new_bot.custom_instructions,
        "knowledge_base_ids": bot.knowledge_base_ids,
        "uploaded_files": saved_files,
        "ai_provider": new_bot.ai_provider,
        "owner_id": new_bot.owner_id,
        "shared_with": [],
        "shared_with_groups": [],
        "created_at": new_bot.created_at,
    }


@router.get("/bots/{user_id}")
async def get_user_bots(
    user_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Get all bots for a user (owned + shared + group shared) - authenticated"""
    # Verify user is requesting their own bots
    if user_id != user_session["id"]:
        raise HTTPException(
            status_code=403,
            detail="Cannot access another user's bots"
        )
    
    bots = get_bots_shared_with_user(session, user_id)
    if not bots:
        return []

    bot_ids = [b.id for b in bots]

    # 1. Load KBs
    kb_mappings = (
        session.query(BotKnowledgeBase.bot_id, BotKnowledgeBase.knowledge_base_id)
        .filter(BotKnowledgeBase.bot_id.in_(bot_ids))
        .all()
    )
    bot_kbs = {}
    for bot_id, kb_id in kb_mappings:
        bot_kbs.setdefault(bot_id, []).append(kb_id)

    # 2. Load Shared Users (user IDs)
    shared_users_mappings = (
        session.query(BotSharedAccess.bot_id, BotSharedAccess.user_id)
        .filter(
            BotSharedAccess.bot_id.in_(bot_ids), BotSharedAccess.user_id.isnot(None)
        )
        .all()
    )
    
    # Collect all unique user IDs to lookup
    all_shared_user_ids = list(set(
        uid for bot_id, uid in shared_users_mappings if uid
    ))
    
    # OPTIMIZED: Batch lookup user emails from Supabase (parallel, not sequential)
    # This eliminates the N+1 query problem
    user_lookup_results = await lookup_users_batch(all_shared_user_ids)
    user_id_to_email = {
        uid: info.get("email", uid) for uid, info in user_lookup_results.items()
    }
    
    # Map bot_id to list of emails (not UUIDs)
    bot_shared_users = {}
    for bot_id, uid in shared_users_mappings:
        email = user_id_to_email.get(uid, uid)
        bot_shared_users.setdefault(bot_id, []).append(email)

    # 3. Load Shared Groups
    shared_groups_mappings = (
        session.query(BotSharedAccess.bot_id, BotSharedAccess.group_id)
        .filter(
            BotSharedAccess.bot_id.in_(bot_ids), BotSharedAccess.group_id.isnot(None)
        )
        .all()
    )
    bot_shared_groups = {}
    for bot_id, group_id in shared_groups_mappings:
        bot_shared_groups.setdefault(bot_id, []).append(group_id)

    # 4. Load Bot Files
    bot_files_mappings = session.query(File).filter(File.bot_id.in_(bot_ids)).all()
    bot_files = {}
    for f in bot_files_mappings:
        file_data = {
            "id": f.id,
            "name": f.filename,
            "type": f.file_type,
            "size": f.file_size,
        }
        bot_files.setdefault(f.bot_id, []).append(file_data)

    return [
        {
            "id": b.id,
            "name": b.name,
            "custom_instructions": getattr(b, "custom_instructions", None),
            "knowledge_base_ids": bot_kbs.get(b.id, []),
            "uploaded_files": bot_files.get(b.id, []),
            "ai_provider": b.ai_provider or AI_PROVIDER_GEMINI,
            "is_public": getattr(b, "is_public", False),
            "owner_id": b.owner_id,
            "shared_with": bot_shared_users.get(b.id, []),
            "shared_with_groups": bot_shared_groups.get(b.id, []),
            "created_at": b.created_at,
        }
        for b in bots
    ]



@router.get("/public/bots/{bot_id}")
async def get_public_bot(bot_id: str, session: DbSession = Depends(get_db)):
    """Get a bot by ID for public widget access - ONLY for Widget Bots (is_public=True)"""
    bot = session.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Only allow public access for Widget Bots (is_public = True)
    if not getattr(bot, "is_public", False):
        raise HTTPException(status_code=403, detail="This bot is not available for public embedding. Only Widget Bots can be embedded.")

    # Get files from File table
    files = session.query(File).filter(File.bot_id == bot_id).all()
    uploaded_files = [
        {"name": f.filename, "type": f.file_type, "size": f.file_size, "path": ""}
        for f in files
    ]

    # Calculate KB IDs
    kbs = session.query(BotKnowledgeBase.knowledge_base_id).filter(BotKnowledgeBase.bot_id == bot_id).all()
    fixed_bot_kbs = [kb_id for (kb_id,) in kbs]
    
    return {
        "id": bot.id,
        "name": bot.name,
        "custom_instructions": bot.custom_instructions,
        "knowledge_base_ids": fixed_bot_kbs,
        "uploaded_files": uploaded_files,
        "ai_provider": bot.ai_provider or AI_PROVIDER_GEMINI,
        "owner_id": bot.owner_id,
        "shared_with": [],
        "shared_with_groups": [],
        "created_at": bot.created_at,
    }


@router.post("/bots/{bot_id}/unshare")
async def unshare_bot(
    bot_id: str,
    data: dict = Body(...),
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Remove a user from bot's shared_with list - authenticated, owner only"""
    # Verify ownership
    bot = verify_bot_access(session, bot_id, user_session["id"], require_owner=True)
    
    user_id = data.get("user_id")
    email = data.get("email")
    
    # If email provided, lookup user_id from Supabase
    if email and not user_id:
        user_info = await lookup_user_by_email(email)
        if user_info:
            user_id = user_info.get("id")
        else:
            raise HTTPException(status_code=404, detail=f"User with email {email} not found")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id or email is required")

    # Check if share exists
    existing = session.query(BotSharedAccess).filter(
        BotSharedAccess.bot_id == bot_id,
        BotSharedAccess.user_id == user_id
    ).first()
    
    if existing:
        unshare_bot_from_user(session, bot_id, user_id)
        return {"message": "Bot unshared from user successfully"}
    else:
        raise HTTPException(status_code=400, detail="User is not in shared list")


@router.post("/bots/{bot_id}/unshare-group")
async def unshare_bot_from_group_endpoint(
    bot_id: str,
    data: dict = Body(...),
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Remove a group from bot's shared_with_groups list - authenticated, owner only"""
    group_id = data.get("group_id")
    if not group_id:
        raise HTTPException(status_code=400, detail="Group ID is required")

    # Verify ownership
    bot = verify_bot_access(session, bot_id, user_session["id"], require_owner=True)

    # Use junction helper to unshare from group
    unshare_bot_from_group(session, bot_id, group_id)
    logger.info(f"Bot {bot_id} unshared from group {group_id}")
    return {"message": "Bot unshared from group"}


@router.post("/bots/{bot_id}/leave")
async def leave_shared_bot(
    bot_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Allow a shared user to remove themselves from a shared bot - authenticated"""
    user_id = user_session.get("id") or user_session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    bot = session.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    # Owner cannot "leave" their own bot
    if bot.owner_id == user_id:
        raise HTTPException(status_code=400, detail="Owner cannot leave their own bot. Use delete instead.")

    # Check if user is actually shared
    existing = session.query(BotSharedAccess).filter(
        BotSharedAccess.bot_id == bot_id,
        BotSharedAccess.user_id == user_id
    ).first()
    
    if not existing:
        raise HTTPException(status_code=400, detail="You are not shared on this bot")

    # Remove user from shared access
    unshare_bot_from_user(session, bot_id, user_id)
    logger.info(f"User {user_id} left shared bot {bot_id}")
    return {"message": "Successfully left the shared bot"}


@router.post("/bots/share")
async def share_bot(
    share_data: BotShare,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Share a bot with another user or group - authenticated, owner only"""
    # Verify ownership
    bot = verify_bot_access(session, share_data.bot_id, user_session["id"], require_owner=True)

    current_user_id = user_session.get("id") or user_session.get("user_id")

    # Share with user email - send notification for acceptance
    if share_data.email:
        email = share_data.email.strip()
        
        # Lookup user by email using Supabase Admin API
        target_user = await lookup_user_by_email(email)
        
        if not target_user:
            raise HTTPException(
                status_code=404, detail=f"User with email {email} not found"
            )
        
        target_user_id = target_user["id"]
        
        # Check if already shared
        existing_share = (
            session.query(BotSharedAccess)
            .filter(
                BotSharedAccess.bot_id == bot.id,
                BotSharedAccess.user_id == target_user_id,
            )
            .first()
        )
        if existing_share:
            return {"message": f"Bot already shared with {email}"}

        owner_name = user_session.get("name") or user_session.get("email", "Someone")

        # Create notification for bot sharing
        notification = Notification(
            user_id=target_user_id,
            type=NOTIFICATION_BOT_SHARE,
            content=f"{owner_name} wants to share bot '{bot.name}' with you",
            status=STATUS_PENDING,
            data={
                "bot_id": bot.id,
                "bot_name": bot.name,
                "owner_id": bot.owner_id,
                "owner_name": owner_name,
                "target_email": email,
            },
        )
        session.add(notification)
        session.commit()
        logger.info(f"Notification created for {email} (uid: {target_user_id}) for bot '{bot.name}'")
        return {"message": f"Bot share request sent to {email}", "success": True}

    # Share with group
    elif share_data.group_id:
        logger.info(f"Sharing bot {bot.id} with group {share_data.group_id}")
        group = session.query(Group).filter(Group.id == share_data.group_id).first()
        if not group:
            logger.error(f"Group not found: {share_data.group_id}")
            raise HTTPException(status_code=404, detail="Group not found")

        # Check if user is owner of the group
        is_group_owner = group.owner_id == user_session["id"]

        if not is_group_owner:
            logger.error(f"User is not the owner of group {group.name}")
            raise HTTPException(
                status_code=403,
                detail="Only the group owner can share bots with this group",
            )

        logger.info(f"Group found: {group.name}, User is owner")

        # Share bot with group using helper
        share_bot_with_group(session, bot.id, group.id)
        logger.info("Bot shared with group via junction table")

        owner_name = user_session.get("name") or user_session.get("email", "Someone")

        # Get group member user_ids
        member_records = (
            session.query(GroupMember.user_id)
            .filter(GroupMember.group_id == group.id)
            .all()
        )

        # Notify all group members
        notification_count = 0
        for (member_user_id,) in member_records:
            if member_user_id != bot.owner_id:
                notification = Notification(
                    user_id=member_user_id,
                    type=NOTIFICATION_BOT_GROUP_SHARE,
                    content=f"Bot '{bot.name}' has been shared with group '{group.name}'",
                    status=STATUS_READ,
                    data={
                        "bot_id": bot.id,
                        "bot_name": bot.name,
                        "group_id": group.id,
                        "group_name": group.name,
                        "owner_name": owner_name,
                    },
                )
                session.add(notification)
                notification_count += 1

        session.commit()
        logger.info(f"Notifications sent to {notification_count} group members")
        return {"message": f"Bot shared with group {group.name}"}

    else:
        raise HTTPException(
            status_code=400, detail="Either email or group_id must be provided"
        )


@router.put("/bots/{bot_id}")
async def update_bot(
    bot_id: str,
    bot_update: dict,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Update a bot - authenticated, owner only"""
    # Verify ownership (only owner can update)
    bot = verify_bot_access(session, bot_id, user_session["id"], require_owner=True)

    # Fields that map directly to Bot columns
    direct_fields = {
        "name": "name",
        "custom_instructions": "custom_instructions",
        "customInstructions": "custom_instructions",
        "ai_provider": "ai_provider",
        "aiProvider": "ai_provider",
        "is_public": "is_public",
        "isPublic": "is_public",
    }

    updated = False

    # 1. Update direct columns
    for field, db_field in direct_fields.items():
        if field in bot_update:
            setattr(bot, db_field, bot_update[field])
            updated = True

    # 2. Handle Knowledge Base IDs (Junction Table)
    kb_ids = bot_update.get("knowledge_base_ids") or bot_update.get("knowledgeBaseIds")
    if kb_ids is not None:
        session.query(BotKnowledgeBase).filter(
            BotKnowledgeBase.bot_id == bot_id
        ).delete()
        for kb_id in kb_ids:
            add_bot_knowledge_base(session, bot_id, kb_id)
        updated = True

    # 3. Handle uploaded_files
    uploaded_files_data = bot_update.get("uploaded_files") or bot_update.get("uploadedFiles")
    if uploaded_files_data is not None:
        existing_files = session.query(File).filter(File.bot_id == bot_id).all()
        existing_file_ids = {f.id for f in existing_files}
        
        frontend_file_ids = set()
        for file_data in uploaded_files_data:
            file_id = file_data.get("id")
            if file_id:
                frontend_file_ids.add(file_id)
        
        # DELETE files that were removed
        files_to_delete = existing_file_ids - frontend_file_ids
        if files_to_delete:
            session.query(File).filter(File.id.in_(files_to_delete)).delete(synchronize_session=False)
            logger.info(f"Deleted {len(files_to_delete)} removed files for bot {bot_id}")
            updated = True
        
        # ADD new files
        new_files_count = 0
        for file_data in uploaded_files_data:
            file_id = file_data.get("id")
            if file_id and file_id in existing_file_ids:
                continue
            
            new_file = File(
                bot_id=bot_id,
                filename=file_data.get("name", "unknown"),
                file_size=file_data.get("size", 0),
                file_type=file_data.get("type", "text/plain"),
                content=file_data.get("content", ""),
                status="completed",
            )
            session.add(new_file)
            new_files_count += 1
        
        if new_files_count > 0:
            logger.info(f"Added {new_files_count} new files for bot {bot_id}")
            updated = True

    if not updated:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    session.commit()
    return {"message": "Bot updated successfully"}


@router.delete("/bots/{bot_id}")
async def delete_bot(
    bot_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Delete a bot - authenticated, owner only"""
    # Verify ownership (CRITICAL: only owner can delete)
    bot = verify_bot_access(session, bot_id, user_session["id"], require_owner=True)

    session.delete(bot)
    session.commit()
    logger.info(f"Bot {bot_id} deleted by owner {user_session['id']}")
    return {"message": "Bot deleted successfully"}
