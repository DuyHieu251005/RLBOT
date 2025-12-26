/**
 * Dashboard Service - Optimized single-request data loading
 * Reduces 3 API calls (bots, KBs, groups) to 1 for faster login
 * Uses smart retry with exponential backoff for session establishment
 */
import { BotData, KnowledgeBaseData, GroupData } from "../types";
import { BACKEND_URL, getAuthToken } from "./apiHelpers";
import { AI_MODELS } from "../constants";

const DEFAULT_AI_PROVIDER = AI_MODELS.GEMINI.provider;

export interface DashboardData {
    bots: BotData[];
    knowledgeBases: KnowledgeBaseData[];
    groups: GroupData[];
}

/**
 * Smart retry helper with exponential backoff
 * Retries on 401 errors (session not yet established)
 */
async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 100
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Only retry on 401 (auth not ready) or network errors
            const isRetryable =
                error?.status === 401 ||
                error?.message?.includes('401') ||
                error?.message?.includes('Failed to fetch');

            if (!isRetryable || attempt >= maxRetries - 1) {
                throw error;
            }

            // Exponential backoff: 100ms, 200ms, 400ms
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`[Dashboard] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Load all user dashboard data in a single request
 * Uses smart retry - no fixed delay needed!
 */
export async function getUserDashboard(userId: string): Promise<DashboardData> {
    const emptyResult = { bots: [], knowledgeBases: [], groups: [] };

    try {
        return await fetchWithRetry(async () => {
            const token = await getAuthToken();
            if (!token) {
                return emptyResult;
            }

            const response = await fetch(`${BACKEND_URL}/api/user/${userId}/dashboard`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                // Throw error to trigger retry for 401
                if (response.status === 401) {
                    const error = new Error(`Auth failed: ${response.status}`);
                    (error as any).status = 401;
                    throw error;
                }
                console.error("Dashboard API failed:", response.status);
                return emptyResult;
            }

            const data = await response.json();

            // Map bots: snake_case -> camelCase
            const bots: BotData[] = (data.bots || []).map((bot: any) => ({
                id: bot.id,
                name: bot.name,
                customInstructions: bot.custom_instructions,
                knowledgeBaseIds: bot.knowledge_base_ids || [],
                uploadedFiles: (bot.uploaded_files || []).map((f: any) => ({
                    id: f.id || Math.random().toString(),
                    name: f.name || f.filename,
                    size: f.size || f.file_size,
                    type: f.type || f.file_type,
                    content: f.content,
                    uploadedAt: f.uploaded_at ? new Date(f.uploaded_at) : new Date(),
                })),
                aiProvider: bot.ai_provider || DEFAULT_AI_PROVIDER,
                isPublic: bot.is_public || false,
                ownerId: bot.owner_id,
                sharedWith: bot.shared_with || [],
                sharedWithGroups: bot.shared_with_groups || [],
                createdAt: bot.created_at ? new Date(bot.created_at) : new Date(),
            }));

            // Map knowledge bases
            const knowledgeBases: KnowledgeBaseData[] = (data.knowledge_bases || []).map((kb: any) => ({
                id: kb.id,
                name: kb.name,
                type: "Documentation",
                fileCount: kb.file_count,
                size: `${kb.chunk_count} chunks`,
                createdAt: kb.created_at ? new Date(kb.created_at) : new Date(),
            }));

            // Map groups
            const groups: GroupData[] = (data.groups || []).map((g: any) => ({
                id: g.id,
                name: g.name,
                description: g.description,
                members: g.members || [],
                ownerId: g.owner_id,
                botCount: g.bot_count,
                memberCount: g.member_count,
                createdAt: g.created_at ? new Date(g.created_at) : new Date(),
            }));

            return { bots, knowledgeBases, groups };
        });
    } catch (error) {
        console.error("Error fetching dashboard after retries:", error);
        return emptyResult;
    }
}
