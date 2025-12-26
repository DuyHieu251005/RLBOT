from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class KnowledgeBaseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Knowledge base name")
    description: Optional[str] = Field(default="", max_length=500)

class KnowledgeBaseResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    file_count: int
    chunk_count: int
    created_at: datetime

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=10000, description="User query")
    knowledge_base_ids: Optional[List[str]] = None
    bot_id: Optional[str] = None
    expand_keywords: bool = True

class ChatContextResponse(BaseModel):
    context: str
    keywords: List[str]
    chunk_count: int

class BotCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Bot name")
    custom_instructions: Optional[str] = Field(default=None, max_length=5000)
    knowledge_base_ids: Optional[List[str]] = []
    uploaded_files: Optional[List[dict]] = []
    ai_provider: Optional[str] = "gemini"
    is_public: Optional[bool] = False
    owner_id: str

class BotShare(BaseModel):
    bot_id: str
    email: Optional[str] = Field(default=None, max_length=255)
    group_id: Optional[str] = None

class MessageData(BaseModel):
    id: Optional[str] = None
    role: str
    content: str
    timestamp: str

class ChatSessionCreate(BaseModel):
    title: str
    messages: List[MessageData]
    owner_id: str

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    messages: Optional[List[MessageData]] = None

class MessageAdd(BaseModel):
    role: str
    content: str

class GeminiRequest(BaseModel):
    prompt: str
    system_instructions: Optional[str] = None
    context: Optional[str] = None
    knowledge_base_ids: Optional[List[str]] = []
    provider: Optional[str] = None  # "gemini" or "openrouter"

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    members: Optional[List[str]] = []
    owner_id: str

class GroupInvite(BaseModel):
    email: str

class NotificationCreate(BaseModel):
    user_id: str
    type: str  # 'group_invite', 'system'
    content: str
    data: Optional[dict] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    content: str
    status: str  # 'pending', 'accepted', 'rejected', 'read'
    data: Optional[dict] = None
    created_at: datetime
