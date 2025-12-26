"""
FastAPI Backend Server for RAG System
"""

import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from database import db
from routers import auth, bots, groups, chat, knowledge, ai, notifications

# Rate limiter - 100 requests/minute per IP
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[STARTUP] RLBot RAG API started")

    # Validate all required settings
    if not settings.validate():
        print("[ERROR] CRITICAL: Configuration validation failed. Check your .env file.")
    else:
        print("[OK] Configuration validated successfully")
        print(f"[OK] Available AI providers: {settings.get_available_providers()}")

    from auth_utils import close_http_client
    
    db.connect()
    yield
    # Shutdown
    await close_http_client()
    db.close()
    print("[SHUTDOWN] RLBot RAG API stopped")


# Initialize FastAPI
app = FastAPI(
    title="RLBot RAG API",
    description="Backend API for PDF processing and RAG retrieval",
    version="1.0.0",
    lifespan=lifespan,
    # Production optimizations
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# Add rate limiter to app state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for React frontend
# Origins configured via CORS_ORIGINS env var (comma-separated)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,  # Cache CORS preflight 10 minutes
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        error_msg = "".join(traceback.format_exception(None, exc, exc.__traceback__))
        print(f"[CRITICAL] UNHANDLED EXCEPTION: {error_msg}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "trace": str(exc)},
        )
    else:
        print(f"[ERROR] Error: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"},
        )


# Health check endpoint for Docker
@app.get("/api/health")
async def health_check():
    """Health check endpoint for container orchestration"""
    return {"status": "healthy", "service": "rlbot-backend"}


# Include Routers
app.include_router(auth.router)
app.include_router(bots.router)
app.include_router(groups.router)
app.include_router(notifications.router)
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(ai.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
