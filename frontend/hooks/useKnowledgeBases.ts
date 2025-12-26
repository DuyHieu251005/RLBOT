/**
 * useKnowledgeBases - Custom hook for knowledge base state management
 * Extracted from AppContext to reduce complexity
 */
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "../utils/logger";
import { KnowledgeBaseData } from "../types";
import {
    deleteKnowledgeBaseFromBackend,
    updateKnowledgeBaseOnBackend,
    getKnowledgeBasesFromBackend,
} from "../services/api";

interface UseKnowledgeBasesProps {
    user: { id: string; email: string } | null;
    initialKBs?: KnowledgeBaseData[];
}

interface UseKnowledgeBasesReturn {
    knowledgeBases: KnowledgeBaseData[];
    setKnowledgeBases: React.Dispatch<React.SetStateAction<KnowledgeBaseData[]>>;
    kbLoaded: boolean;
    setKbLoaded: (loaded: boolean) => void;
    handleAddKB: (kb: KnowledgeBaseData) => Promise<void>;
    handleDeleteKB: (kbId: string) => Promise<void>;
    handleUpdateKB: (kb: KnowledgeBaseData) => void;
    reloadKnowledgeBases: () => Promise<void>;
}

export function useKnowledgeBases({
    user,
    initialKBs = [],
}: UseKnowledgeBasesProps): UseKnowledgeBasesReturn {
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseData[]>(initialKBs);
    const [kbLoaded, setKbLoaded] = useState(false);

    const handleAddKB = useCallback(async (newKB: KnowledgeBaseData) => {
        logger.log("📥 handleAddKB called with:", newKB);
        setKnowledgeBases((prev) => {
            const updated = [newKB, ...prev];
            logger.log("📦 Updated KB list:", updated.map((kb) => ({ id: kb.id, name: kb.name })));
            return updated;
        });
        logger.log("✅ KB added to local state:", newKB.id, newKB.name);
    }, []);

    const handleDeleteKB = useCallback(
        async (kbId: string) => {
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
        },
        [knowledgeBases, user]
    );

    const handleUpdateKB = useCallback(
        async (updatedKB: KnowledgeBaseData) => {
            if (!user) return;

            setKnowledgeBases((prev) =>
                prev.map((kb) => (kb.id === updatedKB.id ? updatedKB : kb))
            );

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
        },
        [user]
    );

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

    return {
        knowledgeBases,
        setKnowledgeBases,
        kbLoaded,
        setKbLoaded,
        handleAddKB,
        handleDeleteKB,
        handleUpdateKB,
        reloadKnowledgeBases,
    };
}
