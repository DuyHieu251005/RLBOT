"""
Knowledge Base Router - All endpoints secured with authentication and ownership verification
"""
import logging
import shutil
import tempfile
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FormFile, Form
from sqlalchemy.orm import Session as DbSession
from typing import List

from dependencies import get_db, get_current_user
from schemas import KnowledgeBaseCreate, KnowledgeBaseResponse
from models import KnowledgeBase, File, Chunk, Bot
from file_processors import process_file_to_chunks, text_splitter
from search_service import generate_embedding
from constants import SUPPORTED_FILE_TYPES, FILE_STATUS_PROCESSING, FILE_STATUS_COMPLETED, FILE_STATUS_FAILED

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


def verify_kb_ownership(session: DbSession, kb_id: str, user_id: str) -> KnowledgeBase:
    """Verify user owns the knowledge base. Returns KB if owned, raises HTTPException otherwise."""
    kb = session.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    if kb.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this knowledge base")
    return kb


def verify_bot_ownership(session: DbSession, bot_id: str, user_id: str) -> Bot:
    """Verify user owns the bot. Returns Bot if owned, raises HTTPException otherwise."""
    bot = session.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    if bot.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this bot")
    return bot


@router.post("/knowledge-bases/{user_id}", response_model=KnowledgeBaseResponse)
async def create_knowledge_base(
    user_id: str,
    kb: KnowledgeBaseCreate,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Create a new knowledge base for a user - authenticated"""
    # Verify user is creating KB for themselves
    if user_id != user_session["id"]:
        raise HTTPException(status_code=403, detail="Cannot create knowledge base for another user")
    
    logger.debug(f"CREATE KB REQUEST - User ID: {user_id}, KB Name: {kb.name}")

    new_kb = KnowledgeBase(
        name=kb.name,
        description=kb.description,
        file_count=0,
        chunk_count=0,
        owner_id=user_id,
    )
    session.add(new_kb)
    session.commit()
    session.refresh(new_kb)

    return KnowledgeBaseResponse(
        id=new_kb.id,
        name=new_kb.name,
        description=new_kb.description,
        file_count=0,
        chunk_count=0,
        created_at=new_kb.created_at,
    )


@router.get("/knowledge-bases/{user_id}")
async def list_knowledge_bases(
    user_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """List knowledge bases owned by a user - authenticated"""
    # Verify user is accessing their own KBs
    if user_id != user_session["id"]:
        raise HTTPException(status_code=403, detail="Cannot access another user's knowledge bases")
    
    kbs = session.query(KnowledgeBase).filter(KnowledgeBase.owner_id == user_id).all()

    return [
        {
            "id": kb.id,
            "name": kb.name,
            "description": kb.description,
            "file_count": kb.file_count,
            "chunk_count": kb.chunk_count,
            "created_at": kb.created_at,
        }
        for kb in kbs
    ]


@router.put("/knowledge-bases/{user_id}/{kb_id}")
async def update_knowledge_base(
    user_id: str,
    kb_id: str,
    kb_update: dict,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Update a knowledge base - authenticated, owner only"""
    # Verify user is updating their own KB
    if user_id != user_session["id"]:
        raise HTTPException(status_code=403, detail="Cannot update another user's knowledge base")
    
    kb = verify_kb_ownership(session, kb_id, user_id)

    if "name" in kb_update:
        kb.name = kb_update["name"]
    if "description" in kb_update:
        kb.description = kb_update["description"]

    session.commit()
    return {"message": "Knowledge base updated successfully"}


@router.delete("/knowledge-bases/{user_id}/{kb_id}")
async def delete_knowledge_base(
    user_id: str,
    kb_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Delete a knowledge base and all its chunks - authenticated, owner only"""
    # Verify user is deleting their own KB
    if user_id != user_session["id"]:
        raise HTTPException(status_code=403, detail="Cannot delete another user's knowledge base")
    
    kb = verify_kb_ownership(session, kb_id, user_id)

    session.delete(kb)
    session.commit()
    logger.info(f"Knowledge base {kb_id} deleted by owner {user_id}")

    return {"message": "Knowledge base deleted successfully"}


@router.post("/knowledge-bases/{kb_id}/upload")
async def upload_file_to_kb(
    kb_id: str,
    file: UploadFile = FormFile(...),
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Upload a file to a knowledge base - authenticated, owner only"""
    # Verify KB ownership
    kb = verify_kb_ownership(session, kb_id, user_session["id"])
    
    filename = file.filename.lower()
    file_ext = filename.split(".")[-1]

    if file_ext not in SUPPORTED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(SUPPORTED_FILE_TYPES)}",
        )

    # Create File record first
    file_record = File(
        knowledge_base_id=kb_id,
        filename=file.filename,
        file_type=file_ext,
        status=FILE_STATUS_PROCESSING,
    )
    session.add(file_record)
    session.commit()
    session.refresh(file_record)
    logger.info(f"Created File record: {file_record.id}")

    # Save to temp file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        logger.info(f"Processing {file_ext.upper()}: {file.filename} for KB: {kb_id}")

        # Use generic processor
        chunk_docs, file_size = await process_file_to_chunks(
            file_path=tmp_path,
            file_id=file_record.id,
            filename=file.filename,
            file_type=file_ext,
            knowledge_base_id=kb_id,
        )

        logger.info(f"Generated {len(chunk_docs)} chunks, file size: {file_size} bytes")
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error processing file: {error_str}")

        file_record.status = FILE_STATUS_FAILED
        file_record.error_message = error_str
        session.commit()

        if "tmp_path" in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)

        raise HTTPException(
            status_code=500, detail=f"Error processing file: {error_str}"
        )

    # Cleanup temp file
    if "tmp_path" in locals() and os.path.exists(tmp_path):
        os.unlink(tmp_path)

    if not chunk_docs:
        logger.warning("No chunks generated from file")
        file_record.status = FILE_STATUS_FAILED
        file_record.error_message = "No text could be extracted"
        session.commit()
        raise HTTPException(
            status_code=400, detail="No text could be extracted from file"
        )

    # Insert chunks into PostgreSQL
    chunks = []
    for doc in chunk_docs:
        if not doc["embedding"] or len(doc["embedding"]) == 0:
            continue

        chunks.append(
            Chunk(
                file_id=doc["file_id"],
                chunk_index=doc["chunk_index"],
                total_chunks=doc["total_chunks"],
                content=doc["content"],
                embedding=doc["embedding"],
            )
        )

    try:
        logger.info(f"Saving {len(chunks)} chunks to database...")
        session.add_all(chunks)

        file_record.status = FILE_STATUS_COMPLETED
        file_record.file_size = file_size
        file_record.total_chunks = len(chunks)

        kb.file_count += 1
        kb.chunk_count += len(chunks)

        session.commit()
        logger.info("Database commit successful")
    except Exception as e:
        logger.error(f"Database commit failed: {e}")
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {
        "message": f"Successfully processed {file.filename}",
        "file_id": file_record.id,
        "chunks_created": len(chunks),
        "filename": file.filename,
        "file_size": file_size,
    }


@router.post("/bots/{bot_id}/upload")
async def upload_file_to_bot(
    bot_id: str,
    file: UploadFile = FormFile(...),
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Upload a file directly to a Bot - authenticated, owner only"""
    # Verify Bot ownership
    bot = verify_bot_ownership(session, bot_id, user_session["id"])

    filename = file.filename.lower()
    file_ext = filename.split(".")[-1]

    if file_ext not in SUPPORTED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(SUPPORTED_FILE_TYPES)}",
        )

    # Create File record with bot_id
    file_record = File(
        bot_id=bot_id,
        filename=file.filename,
        file_type=file_ext,
        status=FILE_STATUS_PROCESSING,
    )
    session.add(file_record)
    session.commit()
    session.refresh(file_record)

    # Save to temp file
    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        chunk_docs, file_size = await process_file_to_chunks(
            file_path=tmp_path,
            file_id=file_record.id,
            filename=file.filename,
            file_type=file_ext,
            bot_id=bot_id,
        )
    except Exception as e:
        error_str = str(e)
        file_record.status = FILE_STATUS_FAILED
        file_record.error_message = error_str
        session.commit()
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(
            status_code=500, detail=f"Error processing file: {error_str}"
        )

    # Cleanup temp
    if tmp_path and os.path.exists(tmp_path):
        os.unlink(tmp_path)

    if not chunk_docs:
        file_record.status = FILE_STATUS_FAILED
        file_record.error_message = "No text extracted"
        session.commit()
        raise HTTPException(status_code=400, detail="No text extracted")

    # Insert chunks
    chunks = []
    for doc in chunk_docs:
        if not doc["embedding"]:
            continue
        chunks.append(
            Chunk(
                file_id=doc["file_id"],
                chunk_index=doc["chunk_index"],
                total_chunks=doc["total_chunks"],
                content=doc["content"],
                embedding=doc["embedding"],
            )
        )

    try:
        session.add_all(chunks)
        file_record.status = FILE_STATUS_COMPLETED
        file_record.file_size = file_size
        file_record.total_chunks = len(chunks)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {
        "message": f"Successfully processed {file.filename} for Bot",
        "file_id": file_record.id,
        "chunks_created": len(chunks),
    }


@router.get("/bots/{bot_id}/files")
async def get_bot_files(
    bot_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Get all files uploaded directly to a Bot - authenticated, owner only"""
    # Verify Bot ownership
    bot = verify_bot_ownership(session, bot_id, user_session["id"])
    
    files = session.query(File).filter(File.bot_id == bot_id).all()
    return [
        {
            "id": f.id,
            "filename": f.filename,
            "file_type": f.file_type,
            "file_size": f.file_size,
            "status": f.status,
            "uploaded_at": f.uploaded_at,
        }
        for f in files
    ]


@router.get("/knowledge-bases/{kb_id}/files")
async def get_kb_files(
    kb_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Get all files in a knowledge base - authenticated, owner only"""
    # Verify KB ownership
    kb = verify_kb_ownership(session, kb_id, user_session["id"])

    files = (
        session.query(File)
        .filter(File.knowledge_base_id == kb_id)
        .order_by(File.uploaded_at.desc())
        .all()
    )

    return {
        "files": [
            {
                "id": f.id,
                "filename": f.filename,
                "file_type": f.file_type,
                "file_size": f.file_size,
                "total_chunks": f.total_chunks,
                "status": f.status,
                "error_message": f.error_message,
                "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
            }
            for f in files
        ],
        "total": len(files),
    }


@router.get("/knowledge-bases/{kb_id}/sample-chunks")
async def get_kb_sample_chunks(
    kb_id: str,
    limit: int = 5,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Get sample chunks from KB for prompt generation - authenticated, owner only"""
    # Verify KB ownership
    kb = verify_kb_ownership(session, kb_id, user_session["id"])

    # Get sample chunks
    chunks = (
        session.query(Chunk)
        .join(File, Chunk.file_id == File.id)
        .filter(File.knowledge_base_id == kb_id)
        .order_by(File.id, Chunk.chunk_index)
        .limit(limit)
        .all()
    )

    return {
        "chunks": [
            {
                "id": c.id,
                "content": c.content,
                "chunk_index": c.chunk_index,
                "file_id": c.file_id,
            }
            for c in chunks
        ],
        "total": len(chunks),
    }


@router.delete("/files/{file_id}")
async def delete_file_by_id(
    file_id: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Delete a file and its chunks by file ID - authenticated, owner only"""
    file_record = session.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # Verify ownership (check via KB or Bot)
    if file_record.knowledge_base_id:
        verify_kb_ownership(session, file_record.knowledge_base_id, user_session["id"])
    elif file_record.bot_id:
        verify_bot_ownership(session, file_record.bot_id, user_session["id"])
    else:
        raise HTTPException(status_code=403, detail="Cannot determine file ownership")

    kb_id = file_record.knowledge_base_id
    chunks_count = file_record.total_chunks or 0

    session.delete(file_record)

    # Update KB stats if applicable
    if kb_id:
        kb = session.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
        if kb:
            kb.file_count = max(0, kb.file_count - 1)
            kb.chunk_count = max(0, kb.chunk_count - chunks_count)

    session.commit()
    logger.info(f"File {file_id} deleted by user {user_session['id']}")

    return {
        "message": f"File '{file_record.filename}' deleted successfully",
        "chunks_deleted": chunks_count,
    }


@router.delete("/knowledge-bases/{kb_id}/files/{filename}")
async def delete_file_from_kb(
    kb_id: str,
    filename: str,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Delete a specific file from a knowledge base - authenticated, owner only"""
    # Verify KB ownership
    kb = verify_kb_ownership(session, kb_id, user_session["id"])

    file_record = (
        session.query(File)
        .filter(File.knowledge_base_id == kb_id, File.filename == filename)
        .first()
    )

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found in knowledge base")

    chunk_count = file_record.total_chunks or 0

    session.delete(file_record)

    # Update KB stats
    kb.file_count = max(0, kb.file_count - 1)
    kb.chunk_count = max(0, kb.chunk_count - chunk_count)

    session.commit()

    return {
        "message": f"File '{filename}' deleted successfully",
        "chunks_deleted": chunk_count,
    }


@router.post("/upload-text")
async def upload_text_directly(
    kb_id: str = Form(...),
    text: str = Form(...),
    filename: str = Form("direct_input.txt"),
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Upload raw text directly - authenticated, owner only"""
    # Verify KB ownership
    kb = verify_kb_ownership(session, kb_id, user_session["id"])
    
    # Split text into chunks
    text_chunks = text_splitter.split_text(text)

    if not text_chunks:
        raise HTTPException(status_code=400, detail="No content to process")

    # Create a File record first
    file_record = File(
        knowledge_base_id=kb_id,
        filename=filename,
        file_type="txt",
        status=FILE_STATUS_PROCESSING,
        file_size=len(text.encode("utf-8")),
    )
    session.add(file_record)
    session.commit()
    session.refresh(file_record)

    chunks = []
    for i, chunk_text in enumerate(text_chunks):
        embedding = await generate_embedding(chunk_text)
        chunks.append(
            Chunk(
                file_id=file_record.id,
                chunk_index=i,
                total_chunks=len(text_chunks),
                content=chunk_text,
                embedding=embedding,
            )
        )

    session.add_all(chunks)

    file_record.status = FILE_STATUS_COMPLETED
    file_record.total_chunks = len(chunks)

    # Update KB stats
    kb.file_count += 1
    kb.chunk_count += len(chunks)

    session.commit()

    return {"message": "Text uploaded successfully", "chunks_created": len(chunks)}


@router.get("/chunks/{kb_id}")
async def get_chunks_for_kb(
    kb_id: str,
    limit: int = 50,
    session: DbSession = Depends(get_db),
    user_session: dict = Depends(get_current_user),
):
    """Get all chunks for a knowledge base - authenticated, owner only"""
    # Verify KB ownership
    kb = verify_kb_ownership(session, kb_id, user_session["id"])
    
    results = (
        session.query(Chunk, File.filename)
        .join(File, Chunk.file_id == File.id)
        .filter(File.knowledge_base_id == kb_id)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": c.id,
            "content": c.content,
            "filename": filename,
            "chunk_index": c.chunk_index,
        }
        for c, filename in results
    ]
