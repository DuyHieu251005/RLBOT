"""
Search Service Module (PostgreSQL/pgvector)
1. Generate embedding for query
2. Search PostgreSQL using vector similarity
3. Return aggregated context
"""

from functools import lru_cache
from typing import Dict, List, Optional

import google.generativeai as genai
from cachetools import TTLCache
from config import settings
from models import Chunk, File
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

# Caching với TTL (Time-To-Live)
KEYWORD_CACHE = TTLCache(maxsize=1000, ttl=3600)  # Cache 1 giờ
EMBEDDING_CACHE = TTLCache(maxsize=500, ttl=1800)  # Cache 30 phút

async def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using Gemini with caching"""
    # Check cache first
    cache_key = hash(text[:500])  # Hash first 500 chars for cache key
    if cache_key in EMBEDDING_CACHE:
        return EMBEDDING_CACHE[cache_key]

    try:
        # Optimization: Do NOT re-configure on every call if already configured at module level
        # genai.configure(api_key=settings.GEMINI_API_KEY)

        result = genai.embed_content(
            model="models/text-embedding-004", content=text, task_type="retrieval_query"
        )
        embedding = result["embedding"]

        # Save to cache
        EMBEDDING_CACHE[cache_key] = embedding

        return embedding
    except Exception as e:
        print(f"❌ Error generating embedding: {e}")
        return []


async def expand_keywords_with_ai(query: str) -> List[str]:
    """
    Step 1 (Tạo sinh): Đưa câu hỏi cho AI để tạo và mở rộng keywords

    Takes a user query and generates expanded search keywords
    """
    # Check cache first
    if query in KEYWORD_CACHE:
        print(f"⚡ Cache hit for query: '{query}'")
        return KEYWORD_CACHE[query]

    try:
        # Use model from settings
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        prompt = f"""You are a search expert. Generate 5-10 search keywords for the following user question.
The keywords will be used to search a database.

User Question: "{query}"

Rules:
1. If the question is in Vietnamese, generate keywords in BOTH Vietnamese and English.
2. If the question is in English, generate keywords in English.
3. Include synonyms, related terms, and important nouns.
4. Remove question words (what, how, why, là gì, như thế nào).
5. Return ONLY the keywords separated by commas.

Example:
Question: \"Cách cài đặt server RLCraft\"
Keywords: cài đặt server, RLCraft setup, install server, cấu hình server, server configuration, minecraft server

Keywords:"""

        response = model.generate_content(prompt)

        # Parse keywords from response
        keywords_text = response.text.strip()
        # Handle comma-separated or newline-separated
        if "," in keywords_text:
            keywords = [kw.strip() for kw in keywords_text.split(",") if kw.strip()]
        else:
            keywords = [kw.strip() for kw in keywords_text.split("\n") if kw.strip()]

        # Always include the original query
        if query not in keywords:
            keywords.insert(0, query)

        print(f"[INFO] Expanded keywords: {keywords}")

        # Save to cache (TTLCache tự động xử lý eviction)
        KEYWORD_CACHE[query] = keywords

        return keywords

    except Exception as e:
        print(f"❌ Error expanding keywords: {e}")
        # Fallback: just use the original query
        return [query]

async def retrieve_context(
    query: str,
    knowledge_base_ids: Optional[List[str]] = None,
    bot_id: Optional[str] = None,
    expand_keywords: bool = True,
    max_chunks: int = 10,
    db_session: Session = None,
) -> str:
    """
    Full retrieval pipeline:
    1. Generate embedding for query
    2. Vector search in PostgreSQL
    3. Aggregate and return context
    4. Fallback to raw file content if no chunks found for bot
    """
    if not db_session:
        print("⚠️ No DB session provided for retrieval")
        return ""

    # Step 1: Generate embedding
    embedding = await generate_embedding(query)
    if not embedding:
        return ""

    # Step 2: Vector Search
    # Using pgvector's l2_distance (Euclidean distance)
    # Lower distance = more similar

    # Join with File to access knowledge_base_id and filename
    stmt = (
        select(Chunk, File.filename)
        .join(File, Chunk.file_id == File.id)
        .order_by(Chunk.embedding.l2_distance(embedding))
        .limit(max_chunks)
    )

    # Build filter conditions
    conditions = []
    if knowledge_base_ids:
        conditions.append(File.knowledge_base_id.in_(knowledge_base_ids))

    if bot_id:
        conditions.append(File.bot_id == bot_id)

    if conditions:
        stmt = stmt.filter(or_(*conditions))
    else:
        # If no KB and no Bot ID provided, don't search anything
        # (Security: Prevent searching entire DB)
        print("⚠️ No context filters provided (KB or Bot ID), skipping search")
        return ""

    results = db_session.execute(stmt).all()

    if not results:
        print("⚠️ No relevant chunks found")
        
        # Fallback: If bot_id provided, try to get raw file content
        if bot_id:
            print(f"📄 Fallback: Retrieving raw file content for bot {bot_id}")
            files = db_session.query(File).filter(File.bot_id == bot_id).all()
            if files:
                context_parts = []
                for f in files:
                    if f.content:
                        context_parts.append(f"[Source: {f.filename}]\n{f.content}")
                if context_parts:
                    full_context = "\n\n---\n\n".join(context_parts)
                    print(f"✅ Fallback: Retrieved {len(files)} files, total context length: {len(full_context)} chars")
                    return full_context
        
        return ""

    # Step 3: Aggregate context
    context_parts = []
    for chunk, filename in results:
        source = filename or "Unknown source"
        content = chunk.content or ""
        context_parts.append(f"[Source: {source}]\n{content}")

    full_context = "\n\n---\n\n".join(context_parts)

    print(
        f"✅ Retrieved {len(results)} chunks, total context length: {len(full_context)} chars"
    )

    return full_context

