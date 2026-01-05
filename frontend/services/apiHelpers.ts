import { logger } from '../utils/logger';
import { supabase } from "../supabaseClient";

// Backend URL from environment or default
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export async function getAuthToken(retries: number = 3): Promise<string | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (session?.access_token) {
                logger.log(`[Auth] Got token (attempt ${attempt + 1}): ${session.access_token.substring(0, 20)}...`);
                return session.access_token;
            }

            logger.log(`[Auth] No session found on attempt ${attempt + 1}`);

            // If no session and we have retries left, wait and try again
            if (attempt < retries - 1) {
                const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
                await new Promise(resolve => setTimeout(resolve, delay));
                logger.log(`[Auth] Retry ${attempt + 1}/${retries - 1} after ${delay}ms`);
            }
        } catch (error) {
            logger.error("Error getting Supabase token:", error);
            if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    }
    logger.warn("[Auth] Failed to get token after all retries");
    return null;
}


export async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getAuthToken();
    if (!token) {
        return {};
    }
    return { Authorization: `Bearer ${token}` };
}

export async function isUserAuthenticated(): Promise<boolean> {
    const token = await getAuthToken();
    return !!token;
}

export function detectLanguage(text: string): string {
    // Detect Vietnamese
    if (
        /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
            text,
        )
    ) {
        return "Vietnamese";
    }
    // Detect Chinese
    if (/[\u4e00-\u9fff]/.test(text)) {
        return "Chinese";
    }
    // Detect Japanese
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
        return "Japanese";
    }
    // Detect Korean
    if (/[\uac00-\ud7af]/.test(text)) {
        return "Korean";
    }
    // Detect Thai
    if (/[\u0e00-\u0e7f]/.test(text)) {
        return "Thai";
    }
    // Detect Arabic
    if (/[\u0600-\u06ff]/.test(text)) {
        return "Arabic";
    }
    // Default to English
    return "English";
}

