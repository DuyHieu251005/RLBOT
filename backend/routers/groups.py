"""
Groups Router - All endpoints secured with authentication and ownership verification
"""
import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session as DbSession
from typing import List

from dependencies import get_current_user, get_db
from schemas import GroupCreate, GroupInvite
from models import Group, GroupMember, Notification
from junction_helpers import add_group_member, get_group_members, get_user_groups, remove_group_member
from auth_utils import lookup_user_by_email, lookup_user_by_id
from constants import (
    NOTIFICATION_GROUP_INVITE,
    STATUS_PENDING,
    ROLE_ADMIN,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/groups")


def verify_group_ownership(session: DbSession, group_id: str, user_id: str) -> Group:
    """Verify user owns the group. Returns Group if owned, raises HTTPException otherwise."""
    group = session.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the group owner can perform this action")
    return group


@router.post("")
async def create_group(
    group_data: GroupCreate,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Create a new group - authenticated"""
    new_group = Group(
        name=group_data.name,
        description=group_data.description,
        owner_id=user_session["id"],
        bot_count=0,
    )
    session.add(new_group)
    session.commit()
    session.refresh(new_group)

    # Add owner as admin member
    add_group_member(session, new_group.id, user_session["id"], role=ROLE_ADMIN)

    # Get final member list for response
    final_members = get_group_members(session, new_group.id)
    member_ids = [m.user_id for m in final_members]

    logger.info(f"Group '{new_group.name}' created by {user_session['id']}")

    return {
        "id": new_group.id,
        "name": new_group.name,
        "description": new_group.description,
        "members": [user_session["email"]],
        "owner_id": new_group.owner_id,
        "bot_count": new_group.bot_count,
        "created_at": new_group.created_at,
    }


@router.get("/{user_id}")
async def get_user_groups_endpoint(
    user_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Get all groups for a user - authenticated"""
    # Verify user is accessing their own groups
    if user_id != user_session["id"]:
        raise HTTPException(status_code=403, detail="Cannot access another user's groups")
    
    groups = get_user_groups(session, user_id)
    if not groups:
        return []

    # Get pending invites for this user
    pending_invites = (
        session.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.type == NOTIFICATION_GROUP_INVITE,
            Notification.status == STATUS_PENDING,
        )
        .all()
    )
    pending_group_ids = {
        notif.data.get("group_id")
        for notif in pending_invites
        if notif.data and "group_id" in notif.data
    }

    group_ids = [g.id for g in groups]

    # Pre-fetch Members for these groups
    group_members_mappings = (
        session.query(GroupMember.group_id, GroupMember.user_id)
        .filter(GroupMember.group_id.in_(group_ids))
        .all()
    )
    
    # Collect all unique user_ids to batch lookup
    all_user_ids = set()
    for group_id, uid in group_members_mappings:
        all_user_ids.add(uid)
    
    # Lookup emails for all user_ids in parallel
    user_id_to_email = {}
    logger.debug(f"Looking up emails for {len(all_user_ids)} unique user_ids in parallel")
    
    async def get_email_mapping(uid):
        try:
            user_info = await lookup_user_by_id(uid)
            if user_info and user_info.get("email"):
                return uid, user_info["email"]
        except Exception as e:
            logger.error(f"Parallel lookup failed for {uid}: {e}")
        return uid, uid  # Fallback to UID

    results = await asyncio.gather(*[get_email_mapping(uid) for uid in all_user_ids])
    for uid, email in results:
        user_id_to_email[uid] = email
        if uid != email:
            logger.debug(f"{uid} -> {email}")
        else:
            logger.warning(f"Failed to lookup email for {uid}, using UID as fallback")
    
    # Build member emails map per group
    group_members_map = {}
    for group_id, uid in group_members_mappings:
        email = user_id_to_email.get(uid, uid)
        group_members_map.setdefault(group_id, []).append(email)

    filtered_groups = []
    for g in groups:
        # Skip if pending invite (and not owner)
        if g.id in pending_group_ids and g.owner_id != user_id:
            continue
        filtered_groups.append(g)

    return [
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


@router.put("/{group_id}")
async def update_group(
    group_id: str,
    group_update: dict,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Update a group - authenticated, owner only"""
    # Verify ownership
    group = verify_group_ownership(session, group_id, user_session["id"])

    allowed_fields = {
        "name": "name",
        "description": "description",
    }

    updated = False
    for field, db_field in allowed_fields.items():
        if field in group_update:
            setattr(group, db_field, group_update[field])
            updated = True

    if not updated:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    session.commit()
    logger.info(f"Group {group_id} updated by owner {user_session['id']}")
    return {"message": "Group updated successfully"}


@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Delete a group - authenticated, owner only"""
    # Verify ownership
    group = verify_group_ownership(session, group_id, user_session["id"])

    session.delete(group)
    session.commit()
    logger.info(f"Group {group_id} deleted by owner {user_session['id']}")
    return {"message": "Group deleted successfully"}


@router.post("/{group_id}/invite")
async def invite_to_group(
    group_id: str,
    invite: GroupInvite,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Invite a user to a group - authenticated, owner only"""
    # Verify ownership
    group = verify_group_ownership(session, group_id, user_session["id"])

    email = invite.email.strip()
    
    # Lookup user by email using Supabase Admin API
    target_user = await lookup_user_by_email(email)
    
    if not target_user:
        raise HTTPException(status_code=404, detail=f"User with email {email} not found")
    
    target_user_id = target_user["id"]
    
    # Check if already a member via junction table
    existing = (
        session.query(GroupMember)
        .filter(GroupMember.group_id == group.id, GroupMember.user_id == target_user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    # Check if there's already a pending invite notification
    existing_notif = (
        session.query(Notification)
        .filter(
            Notification.user_id == target_user_id,
            Notification.type == NOTIFICATION_GROUP_INVITE,
            Notification.status == STATUS_PENDING,
        )
        .all()
    )
    
    for notif in existing_notif:
        if notif.data and notif.data.get("group_id") == group_id:
            raise HTTPException(status_code=400, detail="Invitation already pending for this user")

    # Create notification with real user_id from Supabase
    notification = Notification(
        user_id=target_user_id,
        type=NOTIFICATION_GROUP_INVITE,
        content=f"You have been invited to join group '{group.name}'",
        status=STATUS_PENDING,
        data={
            "group_id": group_id,
            "group_name": group.name,
            "invitee_email": email,
            "inviter_email": user_session.get("email", "system"),
        },
    )

    session.add(notification)
    session.commit()
    logger.info(f"Invitation sent to {email} (uid: {target_user_id}) for group '{group.name}'")

    return {"success": True, "message": f"Invitation sent to {email}"}


@router.post("/{group_id}/remove-member")
async def remove_member_from_group(
    group_id: str,
    data: dict = Body(...),
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Remove a member from group - authenticated, owner only"""
    user_id_to_remove = data.get("user_id")
    email = data.get("email")
    
    if not user_id_to_remove and not email:
        raise HTTPException(status_code=400, detail="user_id or email is required")

    # Verify ownership
    group = verify_group_ownership(session, group_id, user_session["id"])

    # Cannot remove owner
    if user_id_to_remove == group.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove group owner")
    
    # If only email provided, check if it's the owner's email
    if email and not user_id_to_remove:
        if email == user_session["email"]:
            raise HTTPException(status_code=400, detail="Cannot remove yourself by email, use leave endpoint")
        # Without User table, we cannot lookup user by email easily
        raise HTTPException(status_code=400, detail="Please provide user_id - email lookup not available")

    # Check if member exists via junction table
    existing = (
        session.query(GroupMember)
        .filter(GroupMember.group_id == group.id, GroupMember.user_id == user_id_to_remove)
        .first()
    )

    if existing:
        remove_group_member(session, group.id, user_id_to_remove)
        session.commit()
        logger.info(f"Member {user_id_to_remove} removed from group {group_id}")
        return {"success": True, "message": "Removed member from group"}
    else:
        raise HTTPException(status_code=400, detail="User not in group")


@router.post("/{group_id}/leave")
async def leave_group(
    group_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Leave a group - authenticated"""
    group = session.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    user_id = user_session["id"]

    # Owner cannot leave
    if group.owner_id == user_id:
        raise HTTPException(
            status_code=400, detail="Owner cannot leave group. Delete group instead."
        )

    # Check if member via junction table
    existing = (
        session.query(GroupMember)
        .filter(GroupMember.group_id == group.id, GroupMember.user_id == user_id)
        .first()
    )

    if existing:
        remove_group_member(session, group.id, user_id)
        session.commit()
        logger.info(f"User {user_id} left group {group_id}")
        return {"success": True, "message": "Left group successfully"}

    raise HTTPException(status_code=400, detail="User not in group")
