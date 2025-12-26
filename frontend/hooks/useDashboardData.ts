/**
 * useDashboardData - Composite hook for dashboard state management
 * Manages bots, knowledge bases, and groups with unified loading
 * Extracted from AppContext to reduce complexity
 */
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { logger } from "../utils/logger";
import { BotData, KnowledgeBaseData, GroupData } from "../types";
import { STORAGE_KEYS } from "../constants";
import {
    getUserDashboard,
    createBotOnBackend,
    deleteBotFromBackend,
    updateBotOnBackend,
    deleteKnowledgeBaseFromBackend,
    updateKnowledgeBaseOnBackend,
    getKnowledgeBasesFromBackend,
    createGroup,
    deleteGroup,
} from "../services/api";

interface UseDashboardDataProps {
    isAuthenticated: boolean;
    user: { id: string; email: string } | null;
}

interface UseDashboardDataReturn {
    // Loading state
    isLoading: boolean;

    // Bots
    bots: BotData[];
    setBots: React.Dispatch<React.SetStateAction<BotData[]>>;
    botsLoaded: boolean;
    activeBot: BotData | null;
    setActiveBot: (bot: BotData | null) => void;
    handleAddBot: (bot: BotData) => Promise<void>;
    handleDeleteBot: (botId: string) => Promise<void>;
    handleUpdateBot: (bot: BotData) => Promise<void>;

    // Knowledge Bases
    knowledgeBases: KnowledgeBaseData[];
    setKnowledgeBases: React.Dispatch<React.SetStateAction<KnowledgeBaseData[]>>;
    kbLoaded: boolean;
    handleAddKB: (kb: KnowledgeBaseData) => Promise<void>;
    handleDeleteKB: (kbId: string) => Promise<void>;
    handleUpdateKB: (kb: KnowledgeBaseData) => void;
    reloadKnowledgeBases: () => Promise<void>;

    // Groups
    groups: GroupData[];
    setGroups: React.Dispatch<React.SetStateAction<GroupData[]>>;
    groupsLoaded: boolean;
    handleAddGroup: (group: GroupData) => Promise<GroupData | null>;
    handleDeleteGroup: (groupId: string) => Promise<void>;

    // Prompts Cache
    promptsCache: Record<string, string[]>;
    updatePromptsCache: (botId: string, prompts: string[]) => void;
}

export function useDashboardData({
    isAuthenticated,
    user,
}: UseDashboardDataProps): UseDashboardDataReturn {
    // ============ STATE ============
    const [isLoading, setIsLoading] = useState(false);

    // Bots
    const [bots, setBots] = useState<BotData[]>([]);
    const [botsLoaded, setBotsLoaded] = useState(false);
    const [activeBot, setActiveBot] = useState<BotData | null>(null);

    // Knowledge Bases
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseData[]>([]);
    const [kbLoaded, setKbLoaded] = useState(false);

    // Groups
    const [groups, setGroups] = useState<GroupData[]>([]);
    const [groupsLoaded, setGroupsLoaded] = useState(false);

    // Prompts Cache
    const [promptsCache, setPromptsCache] = useState<Record<string, string[]>>({});

    // ============ DASHBOARD LOADING ============
    useEffect(() => {
        let mounted = true;

        const loadAll = async () => {
            if (!isAuthenticated || !user) {
                setBots([]);
                setBotsLoaded(false);
                setKnowledgeBases([]);
                setKbLoaded(false);
                setGroups([]);
                setGroupsLoaded(false);
                setIsLoading(false);
                setActiveBot(null);
                return;
            }

            setIsLoading(true);
            if (!mounted) return;

            try {
                const dashboard = await getUserDashboard(user.id);
                if (!mounted) return;

                setBots(dashboard.bots);
                setBotsLoaded(true);
                setKnowledgeBases(dashboard.knowledgeBases);
                setKbLoaded(true);
                setGroups(dashboard.groups);
                setGroupsLoaded(true);

                logger.log(`✅ Dashboard loaded: ${dashboard.bots.length} bots, ${dashboard.knowledgeBases.length} KBs, ${dashboard.groups.length} groups`);
            } catch (error) {
                logger.error("Error loading dashboard:", error);
                setBots([]);
                setBotsLoaded(true);
                setKnowledgeBases([]);
                setKbLoaded(true);
                setGroups([]);
                setGroupsLoaded(true);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        loadAll();
        return () => { mounted = false; };
    }, [isAuthenticated, user?.id]);

    // ============ BOT AUTO-SELECT ============
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

    // ============ BOT ACCESS VALIDATION ============
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

    // ============ BOT HANDLERS ============
    const handleAddBot = useCallback(async (newBot: BotData) => {
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

            const botWithBackendId = { ...newBot, id: result.id!, ownerId: user.id };
            setBots((prev) => [botWithBackendId, ...prev]);
            setActiveBot(botWithBackendId);
        } catch (error) {
            logger.error("Error creating bot:", error);
            toast.error("Failed to create bot");
        }
    }, [isAuthenticated, user]);

    const handleDeleteBot = useCallback(async (botId: string) => {
        if (!isAuthenticated || !user) {
            toast.error("Vui lòng đăng nhập để xóa bot");
            return;
        }

        try {
            const result = await deleteBotFromBackend(botId);
            if (!result.success) {
                toast.error(result.message || "Không thể xóa bot");
                return;
            }

            const deletingActiveBot = activeBot?.id === botId;
            setBots((prev) => prev.filter((bot) => bot.id !== botId));
            if (deletingActiveBot) setActiveBot(null);

            try {
                localStorage.removeItem(`${STORAGE_KEYS.LAST_INSTRUCTIONS}_${botId}`);
                setPromptsCache((prev) => {
                    const newCache = { ...prev };
                    delete newCache[botId];
                    return newCache;
                });
            } catch (e) {
                logger.error("Error cleaning up bot data:", e);
            }

            toast.success("Bot deleted successfully");
        } catch (error) {
            logger.error("Error deleting bot:", error);
            toast.error("Failed to delete bot");
        }
    }, [activeBot, isAuthenticated, user]);

    const handleUpdateBot = useCallback(async (updatedBot: BotData) => {
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
            if (activeBot?.id === updatedBot.id) setActiveBot(null);
        } else {
            setBots((prev) => prev.map((bot) => (bot.id === updatedBot.id ? updatedBot : bot)));
            if (activeBot?.id === updatedBot.id) setActiveBot(updatedBot);
        }

        setPromptsCache((prev) => {
            const newCache = { ...prev };
            delete newCache[updatedBot.id];
            return newCache;
        });

        toast.success("Bot updated successfully");
    }, [activeBot, user]);

    const updatePromptsCache = useCallback((botId: string, prompts: string[]) => {
        setPromptsCache((prev) => ({ ...prev, [botId]: prompts }));
    }, []);

    // ============ KB HANDLERS ============
    const handleAddKB = useCallback(async (newKB: KnowledgeBaseData) => {
        logger.log("📥 handleAddKB called with:", newKB);
        setKnowledgeBases((prev) => [newKB, ...prev]);
        logger.log("✅ KB added to local state:", newKB.id, newKB.name);
    }, []);

    const handleDeleteKB = useCallback(async (kbId: string) => {
        const kbToDelete = knowledgeBases.find((kb) => kb.id === kbId);
        setKnowledgeBases((prev) => prev.filter((kb) => kb.id !== kbId));

        if (kbToDelete && user) {
            try {
                const success = await deleteKnowledgeBaseFromBackend(user.id, kbId);
                if (success) {
                    logger.log("✅ KB deleted:", kbId);
                    toast.success(`Knowledge Base "${kbToDelete.name}" deleted`);
                } else {
                    toast.error("Failed to delete Knowledge Base from server");
                }
            } catch (error) {
                logger.warn("⚠️ Failed to delete KB:", error);
                toast.error("Error deleting Knowledge Base");
            }
        } else {
            toast.success("Knowledge Base removed");
        }
    }, [knowledgeBases, user]);

    const handleUpdateKB = useCallback(async (updatedKB: KnowledgeBaseData) => {
        if (!user) return;
        setKnowledgeBases((prev) => prev.map((kb) => (kb.id === updatedKB.id ? updatedKB : kb)));

        try {
            const result = await updateKnowledgeBaseOnBackend(user.id, updatedKB.id, {
                name: updatedKB.name,
                description: updatedKB.description,
            });
            if (!result.success) {
                logger.error("Failed to update KB on backend:", result.message);
                toast.error("Failed to update Knowledge Base on server");
            } else {
                logger.log("✅ KB updated on backend:", updatedKB.id);
            }
        } catch (error) {
            logger.error("Error updating KB:", error);
        }
    }, [user]);

    const reloadKnowledgeBases = useCallback(async () => {
        if (!user) return;
        try {
            const backendKBs = await getKnowledgeBasesFromBackend(user.id);
            const mappedKBs: KnowledgeBaseData[] = (backendKBs || []).map((kb: any) => ({
                id: kb.id,
                name: kb.name,
                type: "Documentation",
                fileCount: kb.file_count,
                size: `${kb.chunk_count} chunks`,
                createdAt: kb.created_at ? new Date(kb.created_at) : new Date(),
            }));
            setKnowledgeBases(mappedKBs);
        } catch (error) {
            logger.error("Error reloading knowledge bases:", error);
        }
    }, [user]);

    // ============ GROUP HANDLERS ============
    const handleAddGroup = useCallback(async (newGroup: GroupData): Promise<GroupData | null> => {
        if (!user) return null;

        try {
            const created = await createGroup({
                name: newGroup.name,
                description: newGroup.description || "",
                members: newGroup.members || [],
                ownerId: user.id,
            });

            if (created) {
                setGroups((prev) => [created, ...prev]);
                return created;
            } else {
                toast.error("Failed to create group");
                return null;
            }
        } catch (error) {
            logger.error("Error creating group:", error);
            toast.error("Failed to create group");
            return null;
        }
    }, [user]);

    const handleDeleteGroup = useCallback(async (groupId: string) => {
        try {
            const success = await deleteGroup(groupId);
            if (success) {
                setGroups((prev) => prev.filter((group) => group.id !== groupId));
                toast.success("Group deleted");
            } else {
                toast.error("Failed to delete group");
            }
        } catch (error) {
            logger.error("Error deleting group:", error);
            toast.error("Failed to delete group");
        }
    }, []);

    return {
        isLoading,
        bots,
        setBots,
        botsLoaded,
        activeBot,
        setActiveBot,
        handleAddBot,
        handleDeleteBot,
        handleUpdateBot,
        knowledgeBases,
        setKnowledgeBases,
        kbLoaded,
        handleAddKB,
        handleDeleteKB,
        handleUpdateKB,
        reloadKnowledgeBases,
        groups,
        setGroups,
        groupsLoaded,
        handleAddGroup,
        handleDeleteGroup,
        promptsCache,
        updatePromptsCache,
    };
}
