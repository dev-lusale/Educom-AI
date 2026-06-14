# ─────────────────────────────────────────────────────────────────
# Educom AI Backend — Production Dockerfile
# Python 3.11 slim (stable, full wheel support for all packages)
# ─────────────────────────────────────────────────────────────────

FROM python:3.11-slim

# Prevent .pyc files and force stdout/stderr to be unbuffered
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps needed by chromadb / onnxruntime / reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer-cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Create runtime directories (volumes will be mounted over these in prod)
RUN mkdir -p vector_db/chroma_store uploads curriculum_docs

# Expose the port Railway injects via $PORT
EXPOSE 8000

# Health check — Railway uses this to decide when the service is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start command — Railway overrides CMD via Procfile or start command setting
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --log-level info"]
