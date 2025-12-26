/**
 * useGroupsHook - Custom hook for group state management
 * Extracted from AppContext to reduce complexity
 */
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "../utils/logger";
import { GroupData } from "../types";
import { createGroup, deleteGroup } from "../services/api";

interface UseGroupsHookProps {
    user: { id: string; email: string } | null;
    initialGroups?: GroupData[];
}

interface UseGroupsHookReturn {
    groups: GroupData[];
    setGroups: React.Dispatch<React.SetStateAction<GroupData[]>>;
    groupsLoaded: boolean;
    setGroupsLoaded: (loaded: boolean) => void;
    handleAddGroup: (group: GroupData) => Promise<GroupData | null>;
    handleDeleteGroup: (groupId: string) => Promise<void>;
}

export function useGroupsHook({
    user,
    initialGroups = [],
}: UseGroupsHookProps): UseGroupsHookReturn {
    const [groups, setGroups] = useState<GroupData[]>(initialGroups);
    const [groupsLoaded, setGroupsLoaded] = useState(false);

    const handleAddGroup = useCallback(
        async (newGroup: GroupData): Promise<GroupData | null> => {
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
        },
        [user]
    );

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
        groups,
        setGroups,
        groupsLoaded,
        setGroupsLoaded,
        handleAddGroup,
        handleDeleteGroup,
    };
}
