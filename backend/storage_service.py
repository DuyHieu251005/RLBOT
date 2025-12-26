"""
Storage Service - Stub for Supabase Storage
Can be implemented later for file storage
"""

class StorageService:
    """Stub storage service"""
    
    def upload_file(self, file_content, filename, user_id, knowledge_base_id, content_type):
        """Upload file - stub implementation"""
        # For now, just return success
        # Can be implemented with Supabase Storage API later
        return {
            "success": True,
            "path": f"kb_{knowledge_base_id}/{filename}",
            "url": f"/storage/kb_{knowledge_base_id}/{filename}"
        }
    
    def delete_file(self, file_path):
        """Delete file - stub implementation"""
        return {"success": True}
    
    def get_file_url(self, file_path):
        """Get file URL - stub implementation"""
        return f"/storage/{file_path}"

def get_storage_service():
    """Get storage service instance"""
    return StorageService()
