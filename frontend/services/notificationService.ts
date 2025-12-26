/**
 * Notification Service - All notification-related API calls + Supabase Realtime
 */
import { supabase } from "../supabaseClient";
import { BACKEND_URL, getAuthToken } from "./apiHelpers";
import { logger } from "../utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Notification data structure
 */
export interface Notification {
    id: string;
    user_id: string;
    type: "group_invite" | "bot_share" | "system";
    content: string;
    status: "pending" | "accepted" | "rejected" | "read";
    data?: any;
    created_at: string;
}

// Store active subscription channel and current user
let notificationChannel: RealtimeChannel | null = null;
let currentSubscribedUserId: string | null = null;

/**
 * Subscribe to realtime notifications for a user
 * @param userId User ID to subscribe notifications for
 * @param onNotification Callback when new notification received
 * @param onUpdate Callback when notification is updated
 * @param onDelete Callback when notification is deleted
 */
export function subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void,
    onUpdate?: (notification: Notification) => void,
    onDelete?: (notification: Notification) => void,
): () => void {
    // Prevent duplicate subscription for same user (React Strict Mode fix)
    if (notificationChannel && currentSubscribedUserId === userId) {
        logger.log(`🔔 Already subscribed to notifications for user: ${userId}`);
        return () => {
            logger.log("🔕 Unsubscribing from notifications");
            if (notificationChannel) {
                notificationChannel.unsubscribe();
                notificationChannel = null;
                currentSubscribedUserId = null;
            }
        };
    }

    // Unsubscribe from existing channel if different user
    if (notificationChannel) {
        notificationChannel.unsubscribe();
        notificationChannel = null;
    }

    logger.log(`🔔 Subscribing to realtime notifications for user: ${userId}`);
    currentSubscribedUserId = userId;

    notificationChannel = supabase
        .channel(`notifications:${userId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                logger.log("🔔 New notification received:", payload.new);
                onNotification(payload.new as Notification);
            },
        )
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                logger.log("🔔 Notification updated:", payload.new);
                if (onUpdate) {
                    onUpdate(payload.new as Notification);
                }
            },
        )
        .on(
            "postgres_changes",
            {
                event: "DELETE",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                logger.log("🔔 Notification deleted:", payload.old);
                if (onDelete) {
                    onDelete(payload.old as Notification);
                }
            },
        )
        .subscribe((status) => {
            logger.log(`🔔 Notification subscription status: ${status}`);
        });

    // Return unsubscribe function
    return () => {
        logger.log("🔕 Unsubscribing from notifications");
        if (notificationChannel) {
            notificationChannel.unsubscribe();
            notificationChannel = null;
            currentSubscribedUserId = null;
        }
    };
}

/**
 * Get user notifications (initial load) with retry for auth
 */
export async function getUserNotifications(
    userId: string,
): Promise<Notification[]> {
    const maxRetries = 3;
    const baseDelay = 100;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const token = await getAuthToken();
            if (!token) return [];

            const response = await fetch(`${BACKEND_URL}/api/notifications/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            // Retry on 401
            if (response.status === 401 && attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                logger.log(`[Notifications] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (!response.ok) return [];

            return await response.json();
        } catch (error) {
            if (attempt >= maxRetries - 1) {
                logger.error("Error fetching notifications:", error);
                return [];
            }
            // Retry on network error
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return [];
}

/**
 * Handle notification action (accept/reject/read)
 */
export async function handleNotificationAction(
    notificationId: string,
    action: "accept" | "reject" | "read",
): Promise<boolean> {
    try {
        const token = await getAuthToken();
        if (!token) return false;

        const response = await fetch(
            `${BACKEND_URL}/api/notifications/${notificationId}/${action}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        return response.ok;
    } catch (error) {
        logger.error("Error handling notification:", error);
        return false;
    }
}


