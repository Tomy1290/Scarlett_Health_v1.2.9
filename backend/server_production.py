from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any
import uuid
from datetime import datetime

# LLM Integrations (Emergent)
try:
    from emergentintegrations import llm_client
except Exception:  # pragma: no cover – fallback if lib not present
    llm_client = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI(title="Scarletts Gesundheitstracking API", version="1.2.6")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# In-memory storage for production (replace with actual DB later)
status_checks = []

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Scarletts Gesundheitstracking API v1.2.6 - Chat & LLM Integration"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.dict())
    status_checks.append(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    return [StatusCheck(**status_check) for status_check in status_checks[-10:]]  # Last 10 only

# ====== Gugi AI (LLM-Light via Emergent) ======
class ChatMessage(BaseModel):
    role: Literal['system','user','assistant']
    content: str

class ChatRequest(BaseModel):
    mode: Literal['greeting','chat'] = 'chat'
    language: Literal['de','en','pl'] = 'de'
    model: Optional[str] = None  # e.g., 'gpt-4o-mini'
    summary: Optional[Dict[str, Any]] = None
    messages: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    text: str
    status: str = "success"
    model_used: str = "gpt-4o-mini"

SYSTEM_PROMPT_DE = (
    "Du bist Gugi – ein freundlicher, pragmatischer Gesundheitscoach für die App 'Scarletts Gesundheitstracking'. "
    "Nutze ausschließlich die bereitgestellte Zusammenfassung (summary), keine Websuche. "
    "Gib konkrete, kurze Tipps (1–3 Sätze), keine Diagnosen, kein medizinischer Rat. "
    "Sprich locker, positiv, aber präzise. Beziehe dich auf die Gesundheitsdaten der Nutzerin."
)
SYSTEM_PROMPT_EN = (
    "You are Gugi – a friendly, pragmatic health coach for the 'Scarletts Gesundheitstracking' app. "
    "Use only the provided summary; no web browsing. "
    "Provide concrete, short tips (1–3 sentences), no diagnoses or medical advice. "
    "Be casual, positive, and precise. Reference the user's health data."
)
SYSTEM_PROMPT_PL = (
    "Jesteś Gugi – przyjaznym, pragmatycznym trenerem zdrowia dla aplikacji 'Scarletts Gesundheitstracking'. "
    "Używaj wyłącznie podanego podsumowania; bez przeglądania sieci. "
    "Dawaj konkretne, krótkie wskazówki (1–3 zdania), bez diagnoz i porad medycznych. "
    "Mów swobodnie, pozytywnie i precyzyjnie. Odnoś się do danych zdrowotnych użytkowniczki."
)

async def _call_llm(messages: List[Dict[str,str]], model: str) -> str:
    if llm_client is None:
        # Fallback: simple contextual response if integration not available
        user_msg = messages[-1].get('content', '').strip().lower()
        
        # Simple German responses based on context
        if any(word in user_msg for word in ['tabletten', 'pill', 'medikament']):
            return "Vergiss nicht deine Tabletten regelmäßig zu nehmen! ⏰"
        elif any(word in user_msg for word in ['wasser', 'water', 'trinken']):
            return "Trink genug Wasser! Mindestens 2-3 Liter am Tag sind optimal. 💧"
        elif any(word in user_msg for word in ['gewicht', 'weight', 'abnehmen']):
            return "Gewicht schwankt täglich - wichtig ist der langfristige Trend! 📊"
        elif any(word in user_msg for word in ['sport', 'training', 'bewegung']):
            return "Regelmäßige Bewegung ist super! Auch 15-20 Minuten täglich helfen. 🏃‍♀️"
        elif any(word in user_msg for word in ['zyklus', 'periode', 'cycle']):
            return "Tracke deinen Zyklus für bessere Gesundheitsübersicht! 📅"
        else:
            return "Ich helfe dir gerne bei deinen Gesundheitszielen! Was möchtest du wissen? 😊"
    
    try:
        resp = await llm_client.chat_completion(
            model=model,
            messages=messages,
            temperature=0.4,
            max_tokens=280,
        )
        # Unify result extraction across providers
        content = None
        if hasattr(resp, 'choices') and resp.choices:
            msg = getattr(resp.choices[0], 'message', None)
            if msg and hasattr(msg, 'content'):
                content = msg.content
        if not content:
            # try dict fallback
            content = (getattr(resp, 'content', None) or '').strip()
        return (content or '').strip() or ""
    except Exception as e:
        logging.exception("LLM call failed: %s", e)
        # Return helpful fallback instead of error
        return "Entschuldigung, ich kann gerade nicht antworten. Versuche es später nochmal! 🤖"

@api_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        lang = req.language or 'de'
        model = req.model or 'gpt-4o-mini'
        system = SYSTEM_PROMPT_DE if lang=='de' else (SYSTEM_PROMPT_PL if lang=='pl' else SYSTEM_PROMPT_EN)

        # Build base messages
        msgs: List[Dict[str,str]] = [
            {"role":"system","content": system}
        ]
        
        # Inject compact summary as assistant context
        if req.summary:
            summary_text = f"Aktuelle Gesundheitsdaten: {req.summary}"
            msgs.append({"role":"system","content": summary_text})

        if req.mode == 'greeting':
            user_prompt = {
                'de': "Gib einen kurzen, persönlichen Gesundheitstipp basierend auf den aktuellen Daten.",
                'en': "Give a short, personal health tip based on current data.",
                'pl': "Podaj krótką, osobistą wskazówkę zdrowotną na podstawie aktualnych danych.",
            }[lang]
            msgs.append({"role":"user","content": user_prompt})
        else:
            # normal chat
            for m in (req.messages or [])[-12:]:
                msgs.append({"role": m.role, "content": m.content})

        text = await _call_llm(msgs, model)
        
        return ChatResponse(
            text=text,
            status="success",
            model_used=model
        )
    except Exception as e:
        logging.exception("Chat endpoint error: %s", e)
        return ChatResponse(
            text="Entschuldigung, ein Fehler ist aufgetreten. Bitte versuche es später nochmal.",
            status="error",
            model_used="fallback"
        )

# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.2.6",
        "service": "Scarletts Gesundheitstracking API",
        "llm_available": llm_client is not None,
        "timestamp": datetime.utcnow()
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Root endpoint for health check
@app.get("/")
async def root_health():
    return {
        "service": "Scarletts Gesundheitstracking API",
        "version": "1.2.6",
        "status": "online",
        "endpoints": ["/api/", "/api/chat", "/api/status", "/api/health"]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)