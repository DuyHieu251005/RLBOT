"""
Notifications Router - All endpoints secured with authentication
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession
from typing import List

from dependencies import get_db, get_current_user
from schemas import NotificationResponse
from models import Notification, Bot, Group, GroupMember
from junction_helpers import share_bot_with_user, add_group_member, remove_group_member
from constants import (
    NOTIFICATION_BOT_SHARE,
    NOTIFICATION_GROUP_INVITE,
    STATUS_ACCEPTED,
    STATUS_REJECTED,
    STATUS_READ,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications")


@router.get("/{user_id}", response_model=List[NotificationResponse])
async def get_user_notifications(
    user_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Get all notifications for a user - authenticated"""
    # Verify user is accessing their own notifications
    if user_id != user_session["id"]:
        raise HTTPException(status_code=403, detail="Cannot access another user's notifications")
    
    notifications = (
        session.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    return [
        {
            "id": n.id,
            "user_id": n.user_id,
            "type": n.type,
            "content": n.content,
            "status": n.status,
            "data": n.data,
            "created_at": n.created_at,
        }
        for n in notifications
    ]


@router.post("/{notification_id}/{action}")
async def handle_notification(
    notification_id: str,
    action: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Handle notification action - authenticated"""
    if action not in ["accept", "reject", "read"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    notif = (
        session.query(Notification).filter(Notification.id == notification_id).first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Verify the notification belongs to the current user
    if notif.user_id != user_session["id"]:
        raise HTTPException(status_code=403, detail="Cannot access another user's notification")

    new_status = (
        STATUS_ACCEPTED
        if action == "accept"
        else STATUS_REJECTED
        if action == "reject"
        else STATUS_READ
    )
    notif.status = new_status

    if action == "accept" and notif.type == NOTIFICATION_BOT_SHARE:
        # Add user to bot's shared_with using helper
        if notif.data:
            bot_id = notif.data.get("bot_id")
            user_id = notif.user_id

            if bot_id and user_id:
                bot = session.query(Bot).filter(Bot.id == bot_id).first()
                if bot:
                    share_bot_with_user(session, bot.id, user_id)
                    logger.info(f"Shared bot '{bot.name}' with user {user_id} via junction table")

    elif action == "reject" and notif.type == NOTIFICATION_BOT_SHARE:
        logger.info("User rejected bot sharing notification")

    elif action == "accept" and notif.type == NOTIFICATION_GROUP_INVITE:
        if not notif.data:
            session.commit()
            return {"success": True, "status": new_status}

        group_id = notif.data.get("group_id")
        user_id = notif.user_id

        if group_id and user_id:
            group = session.query(Group).filter(Group.id == group_id).first()

            if group:
                # Check if already a member via junction table
                existing = (
                    session.query(GroupMember)
                    .filter(
                        GroupMember.group_id == group.id, GroupMember.user_id == user_id
                    )
                    .first()
                )

                if not existing:
                    add_group_member(session, group.id, user_id)
                    logger.info(f"Added user {user_id} to group '{group.name}' via junction table")
                    
    elif action == "reject" and notif.type == NOTIFICATION_GROUP_INVITE:
        # On reject, ensure user is NOT in group members
        if notif.data:
            group_id = notif.data.get("group_id")
            user_id = notif.user_id

            if group_id and user_id:
                group = session.query(Group).filter(Group.id == group_id).first()

                if group:
                    remove_group_member(session, group.id, user_id)
                    logger.info(f"Removed user {user_id} from group '{group.name}' via junction table")

    session.commit()
    return {"success": True, "status": new_status}
