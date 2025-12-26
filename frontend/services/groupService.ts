/**
 * Group Service - All group-related API calls
 */
import { BACKEND_URL, getAuthToken } from "./apiHelpers";

/**
 * Group data structure
 */
export interface GroupData {
    id: string;
    name: string;
    description: string;
    members: string[];
    memberCount: number;
    botCount: number;
    createdAt: Date;
    ownerId?: string;
}

/**
 * Get user's groups
 */
export async function getUserGroups(userId: string): Promise<GroupData[]> {
    try {
        const token = await getAuthToken();
        if (!token) return [];

        const response = await fetch(`${BACKEND_URL}/api/groups/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.map((g: any) => ({
            ...g,
            ownerId: g.owner_id || g.ownerId,
            createdAt: new Date(g.created_at || g.createdAt),
        }));
    } catch (error) {
        console.error("Error fetching groups:", error);
        return [];
    }
}

/**
 * Create a new group
 */
export async function createGroup(
    group: Omit<GroupData, "id" | "createdAt" | "memberCount" | "botCount"> & {
        ownerId: string;
    },
): Promise<GroupData | null> {
    try {
        const token = await getAuthToken();
        if (!token) return null;

        const response = await fetch(`${BACKEND_URL}/api/groups`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                name: group.name,
                description: group.description,
                members: group.members,
                owner_id: group.ownerId,
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        return {
            ...data,
            ownerId: data.owner_id || data.ownerId,
            createdAt: new Date(data.created_at),
        };
    } catch (error) {
        console.error("Error creating group:", error);
        return null;
    }
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<boolean> {
    try {
        const token = await getAuthToken();
        if (!token) return false;

        const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return response.ok;
    } catch (error) {
        console.error("Error deleting group:", error);
        return false;
    }
}

/**
 * Invite a user to a group
 */
export async function inviteUserToGroup(
    groupId: string,
    email: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) return { success: false, message: "Not authenticated" };

        const response = await fetch(
            `${BACKEND_URL}/api/groups/${groupId}/invite`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email }),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to invite user");
        }

        return { success: true };
    } catch (error) {
        console.error("Error inviting user:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Leave a group
 */
export async function leaveGroup(
    groupId: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) return { success: false, message: "Not authenticated" };

        const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/leave`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to leave group");
        }

        return { success: true };
    } catch (error) {
        console.error("Error leaving group:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Remove a member from a group
 */
export async function removeMemberFromGroup(
    groupId: string,
    email: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) return { success: false, message: "Not authenticated" };

        const response = await fetch(
            `${BACKEND_URL}/api/groups/${groupId}/remove-member`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email }),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to remove member");
        }

        return { success: true };
    } catch (error) {
        console.error("Error removing member:", error);
        return { success: false, message: String(error) };
    }
}
