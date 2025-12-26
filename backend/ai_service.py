"""
AI Service Module - Supports multiple AI providers
- Gemini (Google)
- OpenRouter (Multiple models)
"""

import httpx
from typing import Optional, List, Literal
import google.generativeai as genai
from config import settings

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

AIProvider = Literal["gemini", "openrouter"]


class AIService:
    """Unified AI service supporting multiple providers"""
    
    def __init__(self):
        self.default_provider = settings.DEFAULT_AI_PROVIDER
        
    def get_available_providers(self) -> List[str]:
        """Get list of available AI providers"""
        return settings.get_available_providers()
    
    async def generate_response(
        self,
        prompt: str,
        system_instructions: Optional[str] = None,
        context: Optional[str] = None,
        provider: Optional[AIProvider] = None
    ) -> str:
        """
        Generate AI response using specified provider
        
        Args:
            prompt: User's question/prompt
            system_instructions: System prompt for the AI
            context: RAG context to include
            provider: AI provider to use (gemini/openrouter), defaults to DEFAULT_AI_PROVIDER
        """
        provider = provider or self.default_provider
        
        # Build full prompt with context
        full_prompt = prompt
        if context:
            full_prompt = f"""Context Information:
{context}

User Question: {prompt}

Please answer based on the context above."""

        if provider == "gemini":
            return await self._generate_gemini(full_prompt, system_instructions)
        elif provider == "openrouter":
            return await self._generate_openrouter(full_prompt, system_instructions)
        else:
            raise ValueError(f"Unknown AI provider: {provider}")
    
    async def _generate_gemini(
        self,
        prompt: str,
        system_instructions: Optional[str] = None
    ) -> str:
        """Generate response using Gemini"""
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        
        # Validate prompt
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty")
        
        try:
            # Only pass system_instruction if it has a non-empty value
            model_kwargs = {"model_name": settings.GEMINI_MODEL}
            if system_instructions and system_instructions.strip():
                model_kwargs["system_instruction"] = system_instructions.strip()
            
            model = genai.GenerativeModel(**model_kwargs)
            
            response = model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"❌ Gemini error: {e}")
            raise
    
    async def _generate_openrouter(
        self,
        prompt: str,
        system_instructions: Optional[str] = None
    ) -> str:
        """Generate response using OpenRouter API"""
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not configured")
        
        messages = []
        
        # Add system message if provided
        if system_instructions:
            messages.append({
                "role": "system",
                "content": system_instructions
            })
        
        # Add user message
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",  # Required by OpenRouter
                        "X-Title": "RLBot RAG"
                    },
                    json={
                        "model": settings.OPENROUTER_MODEL,
                        "messages": messages,
                        "max_tokens": 4096,
                        "temperature": 0.7,
                    },
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    error_detail = response.text
                    print(f"❌ OpenRouter error: {response.status_code} - {error_detail}")
                    raise Exception(f"OpenRouter API error: {response.status_code}")
                
                data = response.json()
                return data["choices"][0]["message"]["content"]
                
        except httpx.TimeoutException:
            raise Exception("OpenRouter request timed out")
        except Exception as e:
            print(f"❌ OpenRouter error: {e}")
            raise

    async def generate_response_stream(
        self,
        prompt: str,
        system_instructions: Optional[str] = None,
        context: Optional[str] = None,
        provider: Optional[AIProvider] = None
    ):
        """
        Generate AI response with streaming
        Yields text chunks as they are generated
        """
        provider = provider or self.default_provider
        
        # Build full prompt with context
        full_prompt = prompt
        if context:
            full_prompt = f"""Context Information:
{context}

User Question: {prompt}

Please answer based on the context above. Format your response with clear structure using markdown when helpful."""

        if provider == "gemini":
            async for chunk in self._stream_gemini(full_prompt, system_instructions):
                yield chunk
        elif provider == "openrouter":
            async for chunk in self._stream_openrouter(full_prompt, system_instructions):
                yield chunk
        else:
            raise ValueError(f"Unknown AI provider: {provider}")

    async def _stream_gemini(
        self,
        prompt: str,
        system_instructions: Optional[str] = None
    ):
        """Stream response from Gemini"""
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        
        # Validate prompt
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty")
        
        try:
            # Only pass system_instruction if it has a non-empty value
            model_kwargs = {"model_name": settings.GEMINI_MODEL}
            if system_instructions and system_instructions.strip():
                model_kwargs["system_instruction"] = system_instructions.strip()
            
            model = genai.GenerativeModel(**model_kwargs)
            
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            print(f"❌ Gemini streaming error: {e}")
            raise

    async def _stream_openrouter(
        self,
        prompt: str,
        system_instructions: Optional[str] = None
    ):
        """Stream response from OpenRouter"""
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not configured")
        
        messages = []
        if system_instructions:
            messages.append({"role": "system", "content": system_instructions})
        messages.append({"role": "user", "content": prompt})
        
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "RLBot RAG"
                    },
                    json={
                        "model": settings.OPENROUTER_MODEL,
                        "messages": messages,
                        "max_tokens": 4096,
                        "temperature": 0.7,
                        "stream": True,
                    },
                    timeout=60.0
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            try:
                                import json
                                chunk_data = json.loads(data)
                                if chunk_data.get("choices"):
                                    delta = chunk_data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        yield delta["content"]
                            except:
                                pass
                                
        except Exception as e:
            print(f"❌ OpenRouter streaming error: {e}")
            raise


# Singleton instance
ai_service = AIService()


# Available OpenRouter models (free tier)
OPENROUTER_MODELS = {
    "google/gemini-2.0-flash-exp:free": "Gemini 2.0 Flash (Free)",
    "meta-llama/llama-3.2-3b-instruct:free": "Llama 3.2 3B (Free)",
    "microsoft/phi-3-mini-128k-instruct:free": "Phi-3 Mini (Free)",
    "qwen/qwen-2-7b-instruct:free": "Qwen 2 7B (Free)",
    "mistralai/mistral-7b-instruct:free": "Mistral 7B (Free)",
}
