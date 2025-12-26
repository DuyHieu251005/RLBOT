import asyncio
import io
import os
from typing import Any, Dict, List, Tuple

import chardet
import fitz  # PyMuPDF

try:
    import docx
except ImportError:
    docx = None
    print("⚠️ 'python-docx' library not found. DOCX support disabled.")

from config import settings
import google.generativeai as genai
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

# Initialize text splitter (Semantic chunking)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for multiple texts in one API call (Optimized)"""
    if not settings.GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY missing")
        return []
    
    if not texts:
        return []
    
    try:
        # Re-configure to ensure key is set
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Call Gemini Batch Embedding
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=texts,
            task_type="retrieval_document"
        )
        # Return list of embeddings
        return result['embedding']
    except Exception as e:
        print(f"❌ Error generating batch embeddings: {e}")
        # Fallback to empty list or raise
        return []

async def process_file_to_chunks(
    file_path: str,
    file_id: str,
    filename: str,
    file_type: str,
    knowledge_base_id: str = None,
    bot_id: str = None,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Process any supported file type (PDF, TXT, DOCX) to chunks using Batch Embeddings.
    Returns: (list of chunks, file_size)
    """
    file_size = os.path.getsize(file_path)
    text_content = ""

    # 1. Extract Text
    if file_type == "pdf":
        text_content = _extract_text_from_pdf(file_path)
    elif file_type == "docx":
        text_content = _extract_text_from_docx(file_path)
    elif file_type == "txt" or file_type == "md":
        text_content = _extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    if not text_content.strip():
        print(f"⚠️ Empty text content for file: {filename}")
        return [], file_size

    # 2. Split Text into Chunks
    text_chunks = text_splitter.split_text(text_content)
    if not text_chunks:
        return [], file_size
        
    print(f"ℹ️ Split {filename} into {len(text_chunks)} chunks. Generating embeddings...")

    # 3. Generate Embeddings (Batch Optimization)
    processed_chunks = []
    
    # Process in batches (Gemini has a limit per request, e.g. 100 texts)
    # We use 50 to be safe and consistent with previous logic
    api_batch_size = 50
    
    for i in range(0, len(text_chunks), api_batch_size):
        batch_texts = text_chunks[i : i + api_batch_size]
        
        # Generate embeddings for the whole batch at once
        try:
            batch_embeddings = generate_embeddings_batch(batch_texts)
            
            if not batch_embeddings or len(batch_embeddings) != len(batch_texts):
                print(f"⚠️ Mismatch or empty embeddings for batch {i//api_batch_size}")
                continue
                
            # Pair text with embedding
            for j, (text, embedding) in enumerate(zip(batch_texts, batch_embeddings)):
                global_index = i + j
                
                chunk_data = {
                    "file_id": file_id,
                    "chunk_index": global_index,
                    "total_chunks": len(text_chunks),
                    "content": text,
                    "embedding": embedding,
                }
                processed_chunks.append(chunk_data)
                
        except Exception as e:
            print(f"❌ Error processing batch {i}: {e}")
            continue

    print(f"✅ Successfully processed {len(processed_chunks)} chunks for {filename}")
    return processed_chunks, file_size


def _extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text


def _extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file"""
    if not docx:
        raise ImportError("python-docx not installed")

    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text)


def _extract_text_from_txt(file_path: str) -> str:
    """Extract text from TXT file with encoding detection"""
    # Detect encoding
    with open(file_path, "rb") as f:
        raw_data = f.read()

    result = chardet.detect(raw_data)
    encoding = result["encoding"] or "utf-8"

    try:
        return raw_data.decode(encoding)
    except UnicodeDecodeError:
        # Fallback
        return raw_data.decode("utf-8", errors="ignore")
