/**
 * useBots - Custom hook for bot state management
 * Extracted from AppContext to reduce complexity
 */
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { logger } from "../utils/logger";
import { BotData, GroupData } from "../types";
import {
    createBotOnBackend,
    deleteBotFromBackend,
    updateBotOnBackend,
} from "../services/api";
import { STORAGE_KEYS } from "../constants";

interface UseBotsProps {
    isAuthenticated: boolean;
    user: { id: string; email: string } | null;
    groups: GroupData[];
    initialBots?: BotData[];
}

interface UseBotsReturn {
    bots: BotData[];
    setBots: React.Dispatch<React.SetStateAction<BotData[]>>;
    activeBot: BotData | null;
    setActiveBot: (bot: BotData | null) => void;
    botsLoaded: boolean;
    setBotsLoaded: (loaded: boolean) => void;
    handleAddBot: (bot: BotData) => Promise<void>;
    handleDeleteBot: (botId: string) => Promise<void>;
    handleUpdateBot: (bot: BotData) => Promise<void>;
    promptsCache: Record<string, string[]>;
    updatePromptsCache: (botId: string, prompts: string[]) => void;
}

export function useBots({
    isAuthenticated,
    user,
    groups,
    initialBots = [],
}: UseBotsProps): UseBotsReturn {
    const [bots, setBots] = useState<BotData[]>(initialBots);
    const [botsLoaded, setBotsLoaded] = useState(false);
    const [activeBot, setActiveBot] = useState<BotData | null>(null);
    const [promptsCache, setPromptsCache] = useState<Record<string, string[]>>({});

    const updatePromptsCache = useCallback((botId: string, prompts: string[]) => {
        setPromptsCache((prev) => ({
            ...prev,
            [botId]: prompts,
        }));
    }, []);

    // Auto-select bot when bots list changes
    useEffect(() => {
        if (activeBot) {
            const isAIModel = activeBot.id === "gemini-pro" || activeBot.id === "deepseek-r1t2";
            if (isAIModel) return;
        }

        if (bots.length > 0 && !activeBot) {
            if (isAuthenticated && user) {
                const accessibleBot = bots.find((bot) => {
                    const isOwner = bot.ownerId === user.id || !bot.ownerId;
                    const isSharedDirectly = bot.sharedWith?.includes(user.id) || bot.sharedWith?.includes(user.email);
                    const isSharedViaGroup = bot.sharedWithGroups?.some((groupId) =>
                        groups.some((userGroup) => userGroup.id === groupId)
                    ) || false;
                    return isOwner || isSharedDirectly || isSharedViaGroup;
                });
                if (accessibleBot) {
                    logger.log(`✅ Auto-selecting accessible bot: ${accessibleBot.name}`);
                    setActiveBot(accessibleBot);
                }
            } else {
                setActiveBot(bots[0]);
            }
        } else if (bots.length === 0 && activeBot) {
            const isAIModel = activeBot.id === "gemini-pro" || activeBot.id === "deepseek-r1t2";
            if (!isAIModel) {
                logger.log(`⚠️ No bots available, clearing user bot ${activeBot.id}`);
                setActiveBot(null);
            }
        }
    }, [bots, activeBot, isAuthenticated, user, groups]);

    // Validate active bot access
    useEffect(() => {
        if (activeBot && isAuthenticated && user) {
            const isAIModel = activeBot.id === "gemini-pro" || activeBot.id === "deepseek-r1t2";
            if (isAIModel) return;

            const isOwner = activeBot.ownerId === user.id || !activeBot.ownerId;
            const isSharedDirectly = activeBot.sharedWith?.includes(user.id) || activeBot.sharedWith?.includes(user.email);
            const isSharedViaGroup = activeBot.sharedWithGroups?.some((groupId) =>
                groups.some((userGroup) => userGroup.id === groupId)
            ) || false;

            if (!isOwner && !isSharedDirectly && !isSharedViaGroup) {
                logger.log(`⛔ User lost access to bot ${activeBot.id}, clearing active bot`);
                setActiveBot(null);
            }
        }
    }, [activeBot, isAuthenticated, user, groups]);

    const handleAddBot = useCallback(
        async (newBot: BotData) => {
            if (!isAuthenticated || !user) {
                toast.error("Please login to create bots");
                return;
            }

            try {
                const result = await createBotOnBackend({
                    ...newBot,
                    type: newBot.type === "RAG" ? "rag" : "chat",
                    knowledgeBaseIds: newBot.knowledgeBaseIds || [],
                    uploadedFiles: newBot.uploadedFiles || [],
                    ownerId: user.id,
                } as any);

                if (!result.success) {
                    toast.error(result.message || "Failed to create bot");
                    return;
                }

                const botWithBackendId = {
                    ...newBot,
                    id: result.id!,
                    ownerId: user.id,
                };

                setBots((prev) => [botWithBackendId, ...prev]);
                setActiveBot(botWithBackendId);
            } catch (error) {
                logger.error("Error creating bot:", error);
                toast.error("Failed to create bot");
            }
        },
        [isAuthenticated, user]
    );

    const handleDeleteBot = useCallback(
        async (botId: string) => {
            if (!isAuthenticated || !user) {
                toast.error("Vui lòng đăng nhập để xóa bot");
                return;
            }

            try {
                const result = await deleteBotFromBackend(botId);

                if (!result.success) {
                    if (result.message?.includes("đăng nhập") || result.message?.includes("authenticated")) {
                        toast.error(result.message);
                    } else {
                        toast.error(result.message || "Không thể xóa bot");
                    }
                    return;
                }

                const deletingActiveBot = activeBot?.id === botId;
                setBots((prev) => prev.filter((bot) => bot.id !== botId));

                if (deletingActiveBot) {
                    setActiveBot(null);
                }

                try {
                    const botStorageKey = `${STORAGE_KEYS.LAST_INSTRUCTIONS}_${botId}`;
                    localStorage.removeItem(botStorageKey);
                    setPromptsCache((prev) => {
                        const newCache = { ...prev };
                        delete newCache[botId];
                        return newCache;
                    });
                } catch (error) {
                    logger.error("Error cleaning up bot data from localStorage:", error);
                }

                toast.success("Bot deleted successfully");
            } catch (error) {
                logger.error("Error deleting bot:", error);
                toast.error("Failed to delete bot");
            }
        },
        [activeBot, isAuthenticated, user]
    );

    const handleUpdateBot = useCallback(
        async (updatedBot: BotData) => {
            logger.log("🔄 Updating bot with isPublic:", updatedBot.isPublic);

            const result = await updateBotOnBackend(updatedBot.id, {
                name: updatedBot.name,
                customInstructions: updatedBot.customInstructions,
                knowledgeBaseIds: updatedBot.knowledgeBaseIds,
                uploadedFiles: updatedBot.uploadedFiles,
                sharedWith: updatedBot.sharedWith,
                sharedWithGroups: updatedBot.sharedWithGroups,
                aiProvider: updatedBot.aiProvider,
                isPublic: updatedBot.isPublic,
            });

            if (!result.success) {
                toast.error("Failed to update bot on server");
                return;
            }

            const isOwner = updatedBot.ownerId === user?.id || !updatedBot.ownerId;
            const isShared = updatedBot.sharedWith?.includes(user?.email || "");

            if (!isOwner && !isShared) {
                setBots((prev) => prev.filter((bot) => bot.id !== updatedBot.id));
                if (activeBot?.id === updatedBot.id) {
                    setActiveBot(null);
                }
            } else {
                setBots((prev) =>
                    prev.map((bot) => (bot.id === updatedBot.id ? updatedBot : bot))
                );
                if (activeBot?.id === updatedBot.id) {
                    setActiveBot(updatedBot);
                }
            }

            setPromptsCache((prev) => {
                const newCache = { ...prev };
                delete newCache[updatedBot.id];
                return newCache;
            });

            toast.success("Bot updated successfully");
        },
        [activeBot, user]
    );

    return {
        bots,
        setBots,
        activeBot,
        setActiveBot,
        botsLoaded,
        setBotsLoaded,
        handleAddBot,
        handleDeleteBot,
        handleUpdateBot,
        promptsCache,
        updatePromptsCache,
    };
}
