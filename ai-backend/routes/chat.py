"""
Educom AI Backend — Conversational Chat Route
Handles free-form teacher queries with full conversation history.
Uses RAG to ground answers in Zambian curriculum context.

AI Provider: Google Gemini (primary) → Ollama (fallback)
"""

import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from services.ai_provider import get_ai_service
from services.gemini_service import GeminiService
from rag.retriever import get_retriever

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["Chat"])

_rag_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="chat_rag")


# ── System prompt ─────────────────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """You are Educom AI, a friendly and knowledgeable teaching assistant for Zambian teachers.

Your expertise covers:
- The Zambia Competency-Based Curriculum (CBC) Framework for all grades (ECE to Form 4)
- The Examinations Council of Zambia (ECZ) examination standards and formats
- The Teachers' Council of Zambia (TCZ) professional standards
- All subjects taught in Zambian schools
- Learner-centered, activity-based teaching methodologies
- Zambian classroom contexts — both rural and urban schools
- Lesson planning, scheme of work development, and assessment design
- CBC competencies: Critical Thinking, Communication, Cooperation, Creativity, Self-Management

How you respond:
- Be warm, supportive, and professional — like a knowledgeable colleague
- Give practical, actionable advice that works in real Zambian classrooms
- Use Zambian examples, contexts, and terminology where relevant
- Keep responses clear and well-structured (use bullet points or numbered lists when helpful)
- When a teacher asks for lesson plan IDEAS or SUGGESTIONS, provide them directly
- When a teacher asks you to GENERATE a complete formatted lesson plan, guide them to the Lesson Planner tool
- When a teacher asks about assessments, provide specific question types, marking schemes, and ECZ alignment tips
- Never respond with JSON — always respond in natural, conversational language
- Keep responses concise but complete — aim for 150-300 words unless more detail is needed
- When curriculum context is available, cite the source document to build trust"""


# ── Request / Response models ─────────────────────────────────────────────────

class ChatHistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatHistoryMessage] = Field(default_factory=list)
    user_name: Optional[str] = Field(default="Teacher")
    user_id: Optional[str] = Field(default=None)


class ChatResponse(BaseModel):
    reply: str
    rag_used: bool = False


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Conversational AI assistant (Gemini-powered)",
    description=(
        "Free-form conversational endpoint for Zambian teachers. "
        "Powered by Google Gemini with RAG from Zambian curriculum documents. "
        "Falls back to Ollama if Gemini is unavailable."
    ),
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    AI assistant for Zambian teachers — powered by Google Gemini.
    Uses multi-turn conversation history and curriculum RAG context.
    """
    # ── Resolve AI service (Gemini preferred) ────────────────────────────────
    ai = await get_ai_service()
    available = await ai.is_available()

    if not available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI model unavailable. Please check your GEMINI_API_KEY.",
        )

    # ── RAG: retrieve relevant curriculum context ─────────────────────────────
    rag_context = ""
    rag_used = False

    try:
        retriever = get_retriever()
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            _rag_executor,
            lambda: retriever.retrieve_for_search(query=request.message, top_k=5),
        )
        if results:
            context_parts = []
            for r in results:
                source = r.get("metadata", {}).get("source", "Curriculum")
                content = r.get("content", "").strip()
                score = r.get("relevance_score", 0)
                if content and score > 0.15:
                    context_parts.append(f"[{source}]\n{content}")
            if context_parts:
                rag_context = "\n\n".join(context_parts)
                rag_used = True
    except Exception as e:
        logger.warning(f"RAG retrieval failed for chat: {e}")

    # ── Build system prompt with RAG context injected ─────────────────────────
    system_with_context = CHAT_SYSTEM_PROMPT
    if rag_context:
        system_with_context = (
            f"{CHAT_SYSTEM_PROMPT}\n\n"
            f"RELEVANT ZAMBIAN CURRICULUM CONTEXT (use this to inform your answer):\n"
            f"{rag_context}"
        )

    # ── Generate response ─────────────────────────────────────────────────────
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in request.history]

        # Gemini: use native multi-turn chat for best quality
        if isinstance(ai, GeminiService):
            reply = await ai.generate_chat(
                message=request.message,
                history=history_dicts,
                system_prompt=system_with_context,
                user_name=request.user_name or "Teacher",
            )
        else:
            # Ollama fallback: build a conversation string
            conversation_parts = []
            if rag_context:
                conversation_parts.append(
                    f"RELEVANT CURRICULUM CONTEXT:\n{rag_context}\n\n---"
                )
            for msg in history_dicts[-20:]:
                role_label = request.user_name if msg["role"] == "user" else "Educom AI"
                conversation_parts.append(f"{role_label}: {msg['content']}")
            conversation_parts.append(f"{request.user_name}: {request.message}")
            conversation_parts.append("Educom AI:")
            full_prompt = "\n\n".join(conversation_parts)
            reply = await ai.generate_text(
                prompt=full_prompt,
                system_prompt=system_with_context,
            )

        # Clean up any model-added prefixes
        reply = reply.strip()
        for prefix in ["Educom AI:", "Assistant:", "AI:"]:
            if reply.startswith(prefix):
                reply = reply[len(prefix):].strip()

        return ChatResponse(reply=reply, rag_used=rag_used)

    except Exception as e:
        logger.error(f"Chat generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}",
        )
