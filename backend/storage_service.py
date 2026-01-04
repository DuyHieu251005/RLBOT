class StorageService:
    def upload_file(self, file_content, filename, user_id, knowledge_base_id, content_type):
        return {
            "success": True,
            "path": f"kb_{knowledge_base_id}/{filename}",
            "url": f"/storage/kb_{knowledge_base_id}/{filename}"
        }
    
    def delete_file(self, file_path):
        return {"success": True}
    
    def get_file_url(self, file_path):
        return f"/storage/{file_path}"

def get_storage_service():
    return StorageService()
