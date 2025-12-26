from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, BigInteger, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

# NOTE: User class removed - Supabase Auth handles user management
# owner_id and user_id columns are now plain strings (Supabase user UUIDs)

class Bot(Base):
    __tablename__ = "bots"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    # system_instructions removed (now handled by constant)
    custom_instructions = Column(Text)  # User-editable additional instructions
    # instructions removed (deprecated)
    # knowledge_base_ids removed (use BotKnowledgeBase)
    ai_provider = Column(String, default="gemini") # AI provider: gemini or openrouter
    is_public = Column(Boolean, default=False)  # True = Widget Bot (public, no history), False = Chat Bot
    owner_id = Column(String)  # Supabase user UUID (no FK)
    # shared_with removed (use BotSharedAccess)
    # shared_with_groups removed (use BotSharedAccess)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text)
    # members removed (use GroupMember)
    owner_id = Column(String)  # Supabase user UUID (no FK)
    bot_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String)  # Supabase user UUID (no FK)
    type = Column(String) # 'group_invite', 'bot_share'
    content = Column(String)
    data = Column(JSONB) # Extra data like group_id, inviter_email
    is_read = Column(Boolean, default=False)
    status = Column(String, default="pending") # pending, accepted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String)
    # messages removed (use SessionMessage)
    owner_id = Column(String)  # Supabase user UUID (no FK)
    bot_id = Column(String, ForeignKey("bots.id")) # NEW: Link to Bot
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    messages_rel = relationship("SessionMessage", back_populates="session", cascade="all, delete-orphan")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text)
    file_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    owner_id = Column(String)  # Supabase user UUID (no FK)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Chunk(Base):
    __tablename__ = "chunks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    # knowledge_base_id removed (join via File)
    # filename removed (join via File)
    file_id = Column(String, ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer)
    total_chunks = Column(Integer)
    content = Column(Text)
    # char_count removed (redundant)
    embedding = Column(Vector(768)) # Gemini embedding dimension
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_chunks_file_id', 'file_id'),
    )
    
    file = relationship("File", back_populates="chunks")

# ============== NEW TABLES ==============

class File(Base):
    """Store file metadata separately to avoid duplication"""
    __tablename__ = "files"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    knowledge_base_id = Column(String, ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=True)
    bot_id = Column(String, ForeignKey("bots.id", ondelete="CASCADE"), nullable=True)  # File can belong to a Bot
    filename = Column(String, nullable=False)
    file_size = Column(BigInteger)
    file_type = Column(String)
    content = Column(Text)  # Store extracted text content directly
    total_chunks = Column(Integer, default=0)
    status = Column(String, default='completed')  # 'processing', 'completed', 'failed'
    error_message = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    chunks = relationship("Chunk", back_populates="file", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_files_kb_id', 'knowledge_base_id'),
        Index('idx_files_bot_id', 'bot_id'),
        Index('idx_files_status', 'status'),
    )

# NOTE: Removed unused models (BotSettings, UsageStats, AuditLog)
# These were never implemented in business logic

# ============== JUNCTION TABLES (Supabase-compatible) ==============

class GroupMember(Base):
    """Junction table: Groups ↔ Users"""
    __tablename__ = "group_members"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=False)  # Supabase user UUID (no FK)
    role = Column(String, default='viewer')  # 'viewer', 'editor', 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_group_members_group_id', 'group_id'),
        Index('idx_group_members_user_id', 'user_id'),
    )

class BotKnowledgeBase(Base):
    """Junction table: Bots ↔ Knowledge Bases"""
    __tablename__ = "bot_knowledge_bases"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    bot_id = Column(String, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    knowledge_base_id = Column(String, ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_bot_kb_bot_id', 'bot_id'),
        Index('idx_bot_kb_kb_id', 'knowledge_base_id'),
    )

class BotSharedAccess(Base):
    """Junction table: Bot sharing (User OR Group)"""
    __tablename__ = "bot_shared_access"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    bot_id = Column(String, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=True)  # Supabase user UUID (no FK)
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_bot_access_bot_id', 'bot_id'),
        Index('idx_bot_access_user_id', 'user_id'),
        Index('idx_bot_access_group_id', 'group_id'),
    )

class SessionMessage(Base):
    """Individual chat messages"""
    __tablename__ = "session_messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # 'user', 'assistant', 'model', 'system'
    content = Column(Text, nullable=False)
    session = relationship("ChatSession", back_populates="messages_rel")
    
    # tokens_used removed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_session_messages_session_id', 'session_id'),
        Index('idx_session_messages_created_at', 'created_at'),
    )
