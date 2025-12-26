"""
Backend Constants - Centralized constants to eliminate magic strings
"""

# ==================== AI PROVIDERS ====================
AI_PROVIDER_GEMINI = "gemini"
AI_PROVIDER_OPENROUTER = "openrouter"
AI_PROVIDERS = [AI_PROVIDER_GEMINI, AI_PROVIDER_OPENROUTER]
DEFAULT_AI_PROVIDER = AI_PROVIDER_GEMINI

# ==================== NOTIFICATION TYPES ====================
NOTIFICATION_BOT_SHARE = "bot_share"
NOTIFICATION_GROUP_INVITE = "group_invite"
NOTIFICATION_BOT_GROUP_SHARE = "bot_group_share"

# ==================== NOTIFICATION STATUS ====================
STATUS_PENDING = "pending"
STATUS_ACCEPTED = "accepted"
STATUS_REJECTED = "rejected"
STATUS_READ = "read"

# ==================== USER ROLES ====================
ROLE_ADMIN = "admin"
ROLE_MEMBER = "member"

# ==================== FILE STATUS ====================
FILE_STATUS_PROCESSING = "processing"
FILE_STATUS_COMPLETED = "completed"
FILE_STATUS_FAILED = "failed"

# ==================== SUPPORTED FILE TYPES ====================
SUPPORTED_FILE_TYPES = ["pdf", "txt", "md", "docx"]
