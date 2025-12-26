/**
 * Knowledge Base Service - All KB-related API calls
 */
import { BACKEND_URL, getAuthToken } from "./apiHelpers";

/**
 * File metadata in a Knowledge Base
 */
export interface KBFile {
    id: string;
    filename: string;
    file_type: string;
    file_size: number;
    total_chunks: number;
    status: string;
    error_message?: string;
    uploaded_at: string;
}

/**
 * Get knowledge bases from backend (filtered by user)
 */
export async function getKnowledgeBasesFromBackend(
    userId: string,
): Promise<any[]> {
    try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
            `${BACKEND_URL}/api/knowledge-bases/${userId}`,
            { headers },
        );
        if (!response.ok) {
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Backend not available:", error);
        return [];
    }
}

/**
 * Create Knowledge Base on backend
 */
export async function createKnowledgeBaseOnBackend(
    userId: string,
    name: string,
    description: string = "",
): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(
            `${BACKEND_URL}/api/knowledge-bases/${userId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name, description }),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to create knowledge base");
        }

        return { success: true, id: data.id };
    } catch (error) {
        console.error("Error creating KB:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Update Knowledge Base on backend
 */
export async function updateKnowledgeBaseOnBackend(
    userId: string,
    kbId: string,
    updates: { name?: string; description?: string },
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(
            `${BACKEND_URL}/api/knowledge-bases/${userId}/${kbId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to update knowledge base");
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating KB:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Delete Knowledge Base from backend
 */
export async function deleteKnowledgeBaseFromBackend(
    userId: string,
    kbId: string,
): Promise<boolean> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return false;
        }

        const response = await fetch(
            `${BACKEND_URL}/api/knowledge-bases/${userId}/${kbId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        return response.ok;
    } catch (error) {
        console.error("Error deleting KB:", error);
        return false;
    }
}

/**
 * Upload file to Knowledge Base (chunking + indexing)
 */
export async function uploadPDFToBackend(
    file: File,
    knowledgeBaseId: string,
): Promise<{ success: boolean; message: string; chunks_created?: number }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
            `${BACKEND_URL}/api/knowledge-bases/${knowledgeBaseId}/upload`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            },
        );

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error("Gemini API Quota Exceeded. Please try again later.");
            }
            throw new Error(
                data.detail || `Upload failed with status ${response.status}`,
            );
        }

        return {
            success: true,
            message: data.message,
            chunks_created: data.chunks_created,
        };
    } catch (error) {
        console.error("Error uploading PDF:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Upload text directly to backend
 */
export async function uploadTextToBackend(
    kbId: string,
    text: string,
    filename: string = "direct_input.txt",
): Promise<{ success: boolean; message: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const formData = new FormData();
        formData.append("kb_id", kbId);
        formData.append("text", text);
        formData.append("filename", filename);

        const response = await fetch(`${BACKEND_URL}/api/upload-text`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Upload failed");
        }

        return { success: true, message: data.message };
    } catch (error) {
        console.error("Error uploading text:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Delete a file from Knowledge Base
 */
export async function deleteFileFromKnowledgeBase(
    kbId: string,
    filename: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, message: "Not authenticated" };
        }

        const response = await fetch(
            `${BACKEND_URL}/api/knowledge-bases/${kbId}/files/${encodeURIComponent(filename)}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to delete file");
        }

        return { success: true, message: data.message };
    } catch (error) {
        console.error("Error deleting file:", error);
        return { success: false, message: String(error) };
    }
}

/**
 * Get files in a Knowledge Base
 */
export async function getKnowledgeBaseFiles(kbId: string): Promise<KBFile[]> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return [];
        }

        const response = await fetch(
            `${BACKEND_URL}/api/knowledge-bases/${kbId}/files`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        if (!response.ok) return [];

        const data = await response.json();
        if (data.files && Array.isArray(data.files)) {
            return data.files;
        }

        return [];
    } catch (error) {
        console.error("Error fetching KB files:", error);
        return [];
    }
}
