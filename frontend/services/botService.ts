/**
 * Bot Service - All bot-related API calls
 */
import { BotData } from "../types";
import { BACKEND_URL, getAuthToken } from "./apiHelpers";
import { AI_MODELS } from "../constants";

// Default AI provider constant
const DEFAULT_AI_PROVIDER = AI_MODELS.GEMINI.provider;


/**
 * Create bot on backend
 */
export async function createBotOnBackend(
    botData: BotData,
): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        // Convert camelCase to snake_case for backend
        const backendBotData = {
            name: botData.name,
            custom_instructions: botData.customInstructions,
            knowledge_base_ids: botData.knowledgeBaseIds || [],
            uploaded_files: botData.uploadedFiles || [],
            ai_provider: botData.aiProvider || DEFAULT_AI_PROVIDER,
            is_public: botData.isPublic || false,
            owner_id: botData.ownerId || "",
        };

        const response = await fetch(`${BACKEND_URL}/api/bots`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(backendBotData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to create bot");
        }

        return { success: true, id: data.id };
    } catch (error) {
        console.error("Error creating bot:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Get user's bots (owned + shared)
 */
export async function getUserBots(userId: string): Promise<BotData[]> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return [];
        }

        const response = await fetch(`${BACKEND_URL}/api/bots/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return [];
        }

        const bots = await response.json();

        // Convert snake_case to camelCase for frontend
        return bots.map((bot: any) => ({
            ...bot,
            customInstructions: bot.custom_instructions,
            knowledgeBaseIds: bot.knowledge_base_ids || [],
            uploadedFiles: bot.uploaded_files || [],
            aiProvider: bot.ai_provider || DEFAULT_AI_PROVIDER,
            isPublic: bot.is_public || false,
            ownerId: bot.owner_id,
            sharedWith: bot.shared_with || [],
            sharedWithGroups: bot.shared_with_groups || [],
            createdAt: bot.created_at ? new Date(bot.created_at) : new Date(),
        }));
    } catch (error) {
        console.error("Error fetching bots:", error);
        return [];
    }
}

/**
 * Share bot with another user or group
 */
export async function shareBotWithUser(
    botId: string,
    email?: string,
    groupId?: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const body: { bot_id: string; email?: string; group_id?: string } = {
            bot_id: botId,
        };
        if (email) {
            body.email = email;
        }
        if (groupId) {
            body.group_id = groupId;
        }

        const response = await fetch(`${BACKEND_URL}/api/bots/share`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to share bot");
        }

        return { success: true };
    } catch (error) {
        console.error("Error sharing bot:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Update bot on backend
 */
export async function updateBotOnBackend(
    botId: string,
    botData: any,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        // Convert camelCase to snake_case for backend
        const backendData: any = { ...botData };
        if (backendData.customInstructions !== undefined) {
            backendData.custom_instructions = backendData.customInstructions;
            delete backendData.customInstructions;
        }
        if (backendData.knowledgeBaseIds !== undefined) {
            backendData.knowledge_base_ids = backendData.knowledgeBaseIds;
            delete backendData.knowledgeBaseIds;
        }
        if (backendData.uploadedFiles !== undefined) {
            backendData.uploaded_files = backendData.uploadedFiles;
            delete backendData.uploadedFiles;
        }
        if (backendData.isPublic !== undefined) {
            backendData.is_public = backendData.isPublic;
            delete backendData.isPublic;
        }
        if (backendData.aiProvider !== undefined) {
            backendData.ai_provider = backendData.aiProvider;
            delete backendData.aiProvider;
        }

        const response = await fetch(`${BACKEND_URL}/api/bots/${botId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(backendData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to update bot");
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating bot:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Delete bot from backend
 */
export async function deleteBotFromBackend(
    botId: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return {
                success: false,
                message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            };
        }

        const response = await fetch(`${BACKEND_URL}/api/bots/${botId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.status === 401) {
            return {
                success: false,
                message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            };
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to delete bot");
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting bot:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Unshare bot with user
 */
export async function unshareBotWithUser(
    botId: string,
    userId: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        // Detect if it's an email or user_id based on format
        const isEmail = userId.includes("@");
        const payload = isEmail ? { email: userId } : { user_id: userId };

        const response = await fetch(`${BACKEND_URL}/api/bots/${botId}/unshare`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to unshare bot");
        }

        return { success: true };
    } catch (error) {
        console.error("Error unsharing bot:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Unshare bot with group
 */
export async function unshareBotWithGroup(
    botId: string,
    groupId: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(
            `${BACKEND_URL}/api/bots/${botId}/unshare-group`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ group_id: groupId }),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to unshare bot from group");
        }

        return { success: true };
    } catch (error) {
        console.error("Error unsharing bot from group:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Leave a shared bot (for shared users to remove themselves)
 */
export async function leaveSharedBot(
    botId: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(
            `${BACKEND_URL}/api/bots/${botId}/leave`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to leave shared bot");
        }

        return { success: true };
    } catch (error) {
        console.error("Error leaving shared bot:", error);
        return { success: false, message: String(error) };
    }
}
