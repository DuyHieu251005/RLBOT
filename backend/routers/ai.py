from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DbSession
from typing import List, Optional
from pydantic import BaseModel

from dependencies import get_db
from schemas import ChatContextResponse, ChatRequest, GeminiRequest
from config import settings
from search_service import expand_keywords_with_ai, retrieve_context
from ai_service import ai_service, OPENROUTER_MODELS

router = APIRouter(prefix="/api")


class CombinedChatRequest(BaseModel):
    """Combined request for RAG + AI generation in one call"""
    prompt: str
    system_instructions: Optional[str] = None
    knowledge_base_ids: Optional[List[str]] = []
    bot_id: Optional[str] = None
    provider: Optional[str] = None
    expand_keywords: bool = True
    stream: bool = False


@router.post("/retrieve", response_model=ChatContextResponse)
async def retrieve_for_chat(request: ChatRequest, session: DbSession = Depends(get_db)):
    """
    Main RAG retrieval endpoint
    """
    # Get expanded keywords
    if request.expand_keywords:
        keywords = await expand_keywords_with_ai(request.query)
    else:
        keywords = [request.query]

    # Retrieve context
    context = await retrieve_context(
        query=request.query,
        knowledge_base_ids=request.knowledge_base_ids,
        bot_id=request.bot_id,
        expand_keywords=request.expand_keywords,
        db_session=session,
    )

    # Count chunks used
    chunk_count = context.count("[Source:") if context else 0

    return ChatContextResponse(
        context=context, keywords=keywords, chunk_count=chunk_count
    )

@router.get("/ai/providers")
async def get_ai_providers():
    """Get available AI providers"""
    providers = ai_service.get_available_providers()
    return {
        "providers": providers,
        "default": settings.DEFAULT_AI_PROVIDER,
        "openrouter_models": OPENROUTER_MODELS if "openrouter" in providers else {},
    }

@router.post("/gemini/generate")
async def generate_with_gemini(request: GeminiRequest):
    """Generate response using AI (Gemini or OpenRouter)"""
    try:
        # Use specified provider or default
        provider = request.provider or settings.DEFAULT_AI_PROVIDER

        # Build context prompt
        full_prompt = ""
        if request.context:
            full_prompt += f"Context Information:\n{request.context}\n\n"
            full_prompt += "IMPORTANT: Answer the question using the Context Information above. Do NOT repeat or quote the Context Information in your response unless explicitly asked.\n\n"

        full_prompt += f"User Question: {request.prompt}"

        # Generate using AI service
        response_text = await ai_service.generate_response(
            prompt=full_prompt,
            system_instructions=request.system_instructions,
            provider=provider,
        )

        return {"success": True, "response": response_text, "provider": provider}
    except Exception as e:
        print(f"[ERROR] AI API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI API error: {str(e)}")


@router.post("/chat/stream")
async def chat_with_stream(request: CombinedChatRequest, session: DbSession = Depends(get_db)):
    """
    Combined RAG + AI streaming endpoint
    1. Retrieves context from knowledge bases (with keyword expansion)
    2. Streams AI response in real-time
    """
    # Validate prompt
    if not request.prompt or not request.prompt.strip():
        async def error_gen():
            yield "data: [ERROR] Prompt cannot be empty\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")
    
    async def generate():
        try:
            # Step 1: Retrieve context (this happens before streaming starts)
            context = ""
            if request.knowledge_base_ids or request.bot_id:
                context = await retrieve_context(
                    query=request.prompt,
                    knowledge_base_ids=request.knowledge_base_ids or [],
                    bot_id=request.bot_id,
                    expand_keywords=request.expand_keywords,
                    db_session=session,
                )
            
            # Step 2: Build full prompt (same as combined endpoint)
            provider = request.provider or settings.DEFAULT_AI_PROVIDER
            full_prompt = request.prompt
            if context:
                full_prompt = f"""Context Information:
{context}

User Question: {request.prompt}

Please answer based on the context above. Format your response with clear structure using markdown when helpful."""
            
            # Step 3: Stream AI response using full prompt directly
            # Note: We pass full_prompt as the prompt and empty context since context is already included
            async for chunk in ai_service.generate_response_stream(
                prompt=full_prompt,
                system_instructions=request.system_instructions,
                context=None,  # Context already included in full_prompt
                provider=provider,
            ):
                # Send chunk as SSE data
                yield f"data: {chunk}\n\n"
            
            # Send done signal
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            print(f"[ERROR] Streaming error: {str(e)}")
            yield f"data: [ERROR] {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/chat/combined")
async def chat_combined(request: CombinedChatRequest, session: DbSession = Depends(get_db)):
    """
    Combined RAG + AI generation in one call (non-streaming)
    Reduces round-trips by handling retrieval and generation server-side
    """
    # Validate prompt
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    try:
        # Step 1: Retrieve context
        context = ""
        if request.knowledge_base_ids or request.bot_id:
            context = await retrieve_context(
                query=request.prompt,
                knowledge_base_ids=request.knowledge_base_ids or [],
                bot_id=request.bot_id,
                expand_keywords=request.expand_keywords,
                db_session=session,
            )
        
        # Step 2: Generate response
        provider = request.provider or settings.DEFAULT_AI_PROVIDER
        
        # Build full prompt
        full_prompt = request.prompt
        if context:
            full_prompt = f"""Context Information:
{context}

User Question: {request.prompt}

Please answer based on the context above. Format your response with clear structure."""

        response_text = await ai_service.generate_response(
            prompt=full_prompt,
            system_instructions=request.system_instructions,
            provider=provider,
        )
        
        return {
            "success": True,
            "response": response_text,
            "provider": provider,
            "context_used": bool(context),
        }
        
    except Exception as e:
        print(f"[ERROR] Combined chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "postgresql"}
