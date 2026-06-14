# Educom AI Backend

AI-powered backend for the Educom Zambian education platform.

## Stack

| Component | Technology |
|-----------|-----------|
| Web Framework | FastAPI |
| AI Model Engine | Ollama (local, offline) |
| AI Models | Phi-3 or Mistral |
| Prompt Management | LangChain |
| Vector Database | ChromaDB |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| RAG Pipeline | Custom retriever + ChromaDB |
| Document Processing | PyPDF + python-docx |

---

## Quick Start

### 1. Install Python dependencies

```bash
cd ai-backend
pip install -r requirements.txt
```

### 2. Install and start Ollama

Download from https://ollama.com then:

```bash
# Pull the AI model (choose one)
ollama pull phi3
# or
ollama pull mistral

# Start Ollama server
ollama serve
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Start the backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Connect the frontend

Add to your Educom `.env.local`:

```env
AI_BACKEND_URL=http://localhost:8000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |
| POST | `/api/ai/generate-lesson-plan` | Generate a lesson plan |
| POST | `/api/ai/generate-scheme-of-work` | Generate a scheme of work |
| POST | `/api/ai/generate-assessment` | Generate an assessment |
| POST | `/api/ai/generate-homework` | Generate homework |
| POST | `/api/ai/generate-learning-outcomes` | Generate learning outcomes |
| POST | `/api/curriculum/upload` | Upload a curriculum document |
| POST | `/api/curriculum/search` | Search curriculum content |
| POST | `/api/curriculum/ingest-directory` | Batch ingest curriculum_docs/ |
| GET | `/api/curriculum/stats` | Vector DB statistics |

Interactive docs: http://localhost:8000/docs

---

## Example Request

### Generate Lesson Plan

```bash
curl -X POST http://localhost:8000/api/ai/generate-lesson-plan \
  -H "Content-Type: application/json" \
  -d '{
    "grade": "Grade 9",
    "subject": "Mathematics",
    "topic": "Quadratic Equations",
    "duration": "40",
    "teacherName": "Mr. Banda",
    "school": "Lusaka Secondary School",
    "enrollment": "45"
  }'
```

### Upload Curriculum Document

```bash
curl -X POST http://localhost:8000/api/curriculum/upload \
  -F "file=@zambia_math_syllabus.pdf" \
  -F "collection=curriculum" \
  -F "grade=Grade 9" \
  -F "subject=Mathematics"
```

### Search Curriculum

```bash
curl -X POST http://localhost:8000/api/curriculum/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "quadratic equations Grade 9 Zambia",
    "grade": "Grade 9",
    "subject": "Mathematics",
    "top_k": 5
  }'
```

---

## Project Structure

```
ai-backend/
├── main.py                    # FastAPI app entry point
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variable template
│
├── config/
│   ├── __init__.py
│   └── settings.py            # Pydantic settings (env vars)
│
├── models/
│   ├── __init__.py
│   └── lesson_plan.py         # Pydantic request/response models
│
├── routes/
│   ├── __init__.py
│   ├── health.py              # Health check endpoint
│   ├── lesson_plans.py        # Lesson plan generation routes
│   ├── assessments.py         # Assessment & homework routes
│   └── curriculum.py          # Document upload & search routes
│
├── services/
│   ├── __init__.py
│   ├── ollama_service.py      # Ollama HTTP client
│   ├── lesson_plan_service.py # Main generation orchestrator
│   ├── fallback_builder.py    # Template fallback (no AI needed)
│   └── prompts.py             # All AI prompt templates
│
├── rag/
│   ├── __init__.py
│   ├── embeddings.py          # Sentence transformer wrapper
│   ├── document_processor.py  # PDF/DOCX ingestion & chunking
│   └── retriever.py           # ChromaDB semantic retrieval
│
├── vector_db/
│   ├── __init__.py
│   └── chroma_client.py       # ChromaDB client wrapper
│
├── uploads/                   # Uploaded documents (auto-created)
├── curriculum_docs/           # Pre-loaded curriculum PDFs (auto-created)
└── vector_db/
    └── chroma_store/          # ChromaDB persistence (auto-created)
```

---

## Loading Curriculum Documents

Place your Zambian curriculum PDFs in the `curriculum_docs/` folder:

```
curriculum_docs/
├── zambia_mathematics_grade9_syllabus.pdf
├── zambia_science_grade7_guide.pdf
├── zambia_english_grade12_syllabus.pdf
└── ...
```

They will be automatically ingested on startup. You can also trigger ingestion manually:

```bash
curl -X POST http://localhost:8000/api/curriculum/ingest-directory
```

---

## Fallback Behavior

The system is designed to always return a valid response:

1. **Ollama available + curriculum loaded** → Full AI generation with RAG context
2. **Ollama available + no curriculum** → AI generation without RAG context
3. **Ollama unavailable** → Template-based generation (same quality as original frontend builder)

This means the frontend never breaks, even if the AI backend is down.

---

## Future Scalability

The architecture supports adding:
- AI tutoring chatbot (`/api/ai/tutor`)
- AI exam generation (`/api/ai/generate-exam`)
- AI marking (`/api/ai/mark-submission`)
- WhatsApp AI assistant (webhook endpoint)
- Multi-language support (Bemba, Nyanja, Tonga)
- Teacher analytics dashboard
- Offline-first deployment (all models run locally)
