/**
* Chat Service - AI chat and session management
*/
import { DEFAULT_RAG_INSTRUCTIONS } from "../constants";
import { BACKEND_URL, getAuthToken, detectLanguage } from "./apiHelpers";

// AI Provider type
export type AIProvider = "gemini" | "openrouter";

/**
 * Chat session data structure
 */
export interface ChatSessionData {
    id?: string;
    title: string;
    messages: Array<{
        id: string;
        role: string;
        content: string;
        timestamp: string;
    }>;
    owner_id: string;
    bot_id?: string;
    created_at?: Date;
    updated_at?: Date;
}

/**
 * Expand keywords using AI
 */
async function expandKeywords(userQuery: string): Promise<string[]> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/gemini/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: userQuery,
                system_instructions: `You are a keyword extraction expert. Extract and expand important keywords from the user's question for semantic search.

Rules:
1. Extract main concepts, technical terms, and important nouns
2. Add related terms, synonyms, and variations
3. Include both general and specific terms
4. Return ONLY a comma-separated list of keywords
5. No explanations, no markdown, just keywords

Now extract and expand keywords:`,
                context: "",
                knowledge_base_ids: [],
            }),
        });

        if (!response.ok) {
            return [userQuery];
        }

        const data = await response.json();
        if (data.success && data.response) {
            const keywords = data.response
                .split(",")
                .map((k: string) => k.trim())
                .filter((k: string) => k.length > 0);
            return keywords;
        }

        return [userQuery];
    } catch (error) {
        console.error("Error expanding keywords:", error);
        return [userQuery];
    }
}

/**
 * Retrieve context from backend (RAG retrieval)
 */
export async function retrieveContextFromBackend(
    query: string,
    knowledgeBaseIds?: string[],
    botId?: string,
): Promise<{ context: string; keywords: string[]; chunk_count: number }> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/retrieve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                knowledge_base_ids: knowledgeBaseIds || [],
                bot_id: botId,
                expand_keywords: true,
            }),
        });

        if (!response.ok) {
            return { context: "", keywords: [query], chunk_count: 0 };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Backend not available:", error);
        return { context: "", keywords: [query], chunk_count: 0 };
    }
}

/**
 * Get available AI providers from backend
 */
export async function getAIProviders(): Promise<{
    providers: AIProvider[];
    default: AIProvider;
    openrouter_models: Record<string, string>;
}> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/ai/providers`);
        if (!response.ok) {
            return {
                providers: ["gemini"],
                default: "gemini",
                openrouter_models: {},
            };
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching AI providers:", error);
        return { providers: ["gemini"], default: "gemini", openrouter_models: {} };
    }
}

/**
 * Get AI response using combined endpoint (faster)
 * Uses single backend call that handles RAG + keyword expansion + AI generation
 */
export async function getGeminiResponse(
    prompt: string,
    systemInstructions?: string,
    context?: string,
    knowledgeBaseIds?: string[],
    enableKeywordExpansion: boolean = true,
    autoDetectLanguage: boolean = true,
    botId?: string,
    provider?: AIProvider,
): Promise<string> {
    // Detect user's language
    let userLanguage = "English";
    if (autoDetectLanguage) {
        userLanguage = detectLanguage(prompt);
    }

    // Add language instruction
    let languageInstruction = "";
    if (autoDetectLanguage) {
        languageInstruction = `\n\nIMPORTANT: The user is asking in ${userLanguage}. You MUST respond in ${userLanguage} language only.`;
    }
    const finalInstructions =
        (systemInstructions?.trim() || DEFAULT_RAG_INSTRUCTIONS) +
        languageInstruction;

    // Check if we should use the combined endpoint (when KB/Bot involved)
    const useCombinedEndpoint = (knowledgeBaseIds && knowledgeBaseIds.length > 0) || botId;

    // Delay helper for retry
    const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

    // Retry up to 3 times (reduced from 5 for faster failure)
    for (let i = 0; i < 3; i++) {
        try {
            let responseText: string;

            if (useCombinedEndpoint) {
                // Use combined endpoint (RAG + AI in one call)
                const response = await fetch(`${BACKEND_URL}/api/chat/combined`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        system_instructions: finalInstructions,
                        knowledge_base_ids: knowledgeBaseIds || [],
                        bot_id: botId,
                        provider: provider,
                        expand_keywords: enableKeywordExpansion,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 429) {
                        await delay(Math.pow(2, i + 2) * 1000);
                        throw new Error(`Rate limit exceeded. Retry ${i + 1}/3`);
                    }
                    throw new Error(
                        `HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`,
                    );
                }

                const data = await response.json();
                if (data.success && data.response) {
                    responseText = data.response;
                } else {
                    responseText = "I couldn't generate a response. Please try again.";
                }
            } else {
                // Fallback: Direct Gemini call without RAG
                const response = await fetch(`${BACKEND_URL}/api/gemini/generate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        system_instructions: finalInstructions,
                        context: context || "",
                        knowledge_base_ids: [],
                        provider: provider,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 429) {
                        await delay(Math.pow(2, i + 2) * 1000);
                        throw new Error(`Rate limit exceeded. Retry ${i + 1}/3`);
                    }
                    throw new Error(
                        `HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`,
                    );
                }

                const data = await response.json();
                if (data.success && data.response) {
                    responseText = data.response;
                } else {
                    responseText = "I couldn't generate a response. Please try again.";
                }
            }

            return responseText;
        } catch (error: any) {
            console.error(`Attempt ${i + 1} failed:`, error.message || error);
            if (i === 2) {
                return "Sorry, the AI service is currently unavailable. Please check your connection.";
            }
            await delay(Math.pow(2, i) * 1000);
        }
    }

    return "Something went wrong.";
}

/**
 * Get messages for a specific session
 */
export async function getSessionMessages(sessionId: string): Promise<any[]> {
    try {
        const token = await getAuthToken();
        if (!token) return [];

        const response = await fetch(
            `${BACKEND_URL}/api/chat-sessions/${sessionId}/messages`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Error fetching session messages:", error);
        return [];
    }
}

/**
 * Get user's chat sessions, optionally filtered by bot
 */
export async function getUserChatSessions(
    userId: string,
    botId?: string,
): Promise<ChatSessionData[]> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return [];
        }

        let url = `${BACKEND_URL}/api/chat-sessions/${userId}`;
        if (botId) {
            url += `?bot_id=${botId}`;
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching chat sessions:", error);
        return [];
    }
}

/**
 * Save chat session to backend
 */
export async function saveChatSession(
    sessionData: ChatSessionData,
): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(`${BACKEND_URL}/api/chat-sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(sessionData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to save session");
        }

        return { success: true, id: data.id };
    } catch (error) {
        console.error("Error saving chat session:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Update chat session
 */
export async function updateChatSession(
    sessionId: string,
    sessionData: Partial<ChatSessionData>,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(
            `${BACKEND_URL}/api/chat-sessions/${sessionId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(sessionData),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to update session");
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating chat session:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Delete chat session
 */
export async function deleteChatSession(
    sessionId: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(
            `${BACKEND_URL}/api/chat-sessions/${sessionId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to delete session");
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting chat session:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Add a single message to an existing session (Append-only, optimized)
 */
export async function addMessageToSession(
    sessionId: string,
    role: string,
    content: string,
): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(
            `${BACKEND_URL}/api/chat-sessions/${sessionId}/messages`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ role, content }),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to add message");
        }

        return { success: true, id: data.id };
    } catch (error) {
        console.error("Error adding message to session:", error);
        return { success: false, message: String(error) };
    }
}
