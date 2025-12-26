/**
 * useGroups Hook - Groups state management
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { createGroup, deleteGroup as deleteGroupAPI } from '../services/api';
import { GroupData, User } from '../types';
import { logger } from '../utils/logger';

interface UseGroupsReturn {
    groups: GroupData[];
    setGroups: React.Dispatch<React.SetStateAction<GroupData[]>>;
    groupsLoaded: boolean;
    setGroupsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
    handleAddGroup: (group: GroupData) => Promise<GroupData | null>;
    handleDeleteGroup: (groupId: string) => Promise<void>;
}

export function useGroups(user: User | null): UseGroupsReturn {
    const [groups, setGroups] = useState<GroupData[]>([]);
    const [groupsLoaded, setGroupsLoaded] = useState(false);

    const handleAddGroup = useCallback(
        async (newGroup: GroupData): Promise<GroupData | null> => {
            if (!user) return null;

            try {
                const created = await createGroup({
                    name: newGroup.name,
                    description: newGroup.description || '',
                    members: newGroup.members || [],
                    ownerId: user.id,
                });

                if (created) {
                    setGroups((prev) => [created, ...prev]);
                    return created;
                } else {
                    toast.error('Failed to create group');
                    return null;
                }
            } catch (error) {
                logger.error('Error creating group:', error);
                toast.error('Failed to create group');
                return null;
            }
        },
        [user]
    );

    const handleDeleteGroup = useCallback(async (groupId: string) => {
        try {
            const success = await deleteGroupAPI(groupId);
            if (success) {
                setGroups((prev) => prev.filter((group) => group.id !== groupId));
                toast.success('Group deleted');
            } else {
                toast.error('Failed to delete group');
            }
        } catch (error) {
            logger.error('Error deleting group:', error);
            toast.error('Failed to delete group');
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

