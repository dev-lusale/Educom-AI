# EduCom AI — Production Deployment Guide

> **Actual stack:** Next.js 15 (TypeScript) + Python FastAPI + ChromaDB + Prisma  
> **Frontend host:** Vercel  
> **Backend host:** Railway  
> **Database:** Neon (PostgreSQL, serverless)  
> **Domain:** Squarespace custom domain → Vercel

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (client)                     │
│              https://educom.yourdomain.com              │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│              VERCEL  (Next.js frontend)                  │
│  /api/chat              → Gemini API  (server-side)      │
│  /api/generate-lesson-plan   ──┐                         │
│  /api/generate-assessment    ──┤→ AI_BACKEND_URL (HTTPS) │
│  /api/export-pdf             ──┘                         │
│  /api/auth/*            → NextAuth + Neon DB             │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS (internal API call)
┌───────────────────────▼─────────────────────────────────┐
│           RAILWAY  (Python FastAPI backend)              │
│  POST /api/ai/generate-lesson-plan                       │
│  POST /api/ai/generate-quiz                              │
│  POST /api/ai/generate-exam                              │
│  POST /api/ai/generate-marking-scheme                    │
│  POST /api/pdf/export-*                                  │
│  POST /api/ai/chat  (RAG-enhanced)                       │
│                                                          │
│  ┌──────────────────┐   ┌────────────────────────┐       │
│  │  Google Gemini   │   │  ChromaDB (persistent  │       │
│  │  API (external)  │   │  Railway volume)        │       │
│  └──────────────────┘   └────────────────────────┘       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           NEON  (PostgreSQL serverless)                  │
│  Users, Sessions, LessonPlans, Assessments, etc.         │
└─────────────────────────────────────────────────────────┘
```

**Security model:** No API key ever reaches the browser. Gemini key lives only in backend env vars. The Next.js `/api/*` routes are server-side only — they proxy to the FastAPI backend or call Gemini directly without leaking secrets.

---

## Pre-Deployment Checklist

- [ ] GitHub repo created and code pushed (no `.env` files committed)
- [ ] Google Gemini API key from https://aistudio.google.com/app/apikey
- [ ] Google OAuth credentials (for teacher login)
- [ ] Gmail App Password for email (2FA enabled on Gmail account)
- [ ] Neon account at https://neon.tech (free tier is sufficient for beta)
- [ ] Railway account at https://railway.com
- [ ] Vercel account at https://vercel.com

---

## Step 1 — Secure the repository

Before pushing **anything** to GitHub, verify `.gitignore` is working:

```bash
# From the project root — these should all show as ignored:
git check-ignore -v .env
git check-ignore -v .env.local
git check-ignore -v ai-backend/.env

# This should NOT be ignored (it's a template, safe to commit):
git check-ignore -v ai-backend/.env.example
git check-ignore -v .env.production.example
```

If any real `.env` file is already tracked, remove it:

```bash
git rm --cached .env .env.local ai-backend/.env
git commit -m "remove secrets from tracking"
```

Rotate any secrets that were ever committed (new NEXTAUTH_SECRET, new GEMINI_API_KEY, new OAuth credentials).

---

## Step 2 — Neon PostgreSQL (production database)

1. Go to https://neon.tech → **New Project** → name it `educom-prod`
2. Select region closest to your users (e.g. `AWS / eu-central-1` for Africa)
3. Copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this — you'll need it for both Vercel and running migrations

**Run migrations from your local machine once:**

```bash
# Set the production DATABASE_URL temporarily in your shell (Windows PowerShell):
$env:DATABASE_PROVIDER = "postgresql"
$env:DATABASE_URL = "postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# Push the schema to production Neon
npx prisma migrate deploy
# or, if you haven't created migrations yet:
npx prisma db push

# Verify the tables were created
npx prisma studio
```

> After this, your local `.env.local` goes back to SQLite for development. Only Vercel and any `prisma migrate deploy` commands use the Neon URL.

---

## Step 3 — Railway (Python FastAPI backend)

### 3a. Deploy the backend

1. Go to https://railway.com → **New Project** → **Deploy from GitHub repo**
2. Select your repository
3. When Railway asks which folder, set the **Root Directory** to `ai-backend`
4. Railway will auto-detect the `Dockerfile` and build it

### 3b. Add a persistent volume for ChromaDB

ChromaDB stores embeddings on disk. Without a volume, data is lost on every redeploy.

1. In Railway → your backend service → **Volumes** tab
2. Click **Add Volume**
3. Mount path: `/app/vector_db/chroma_store`
4. Size: **5 GB** (sufficient for all ECZ curriculum docs)

### 3c. Set backend environment variables

In Railway → your service → **Variables** tab, add each of these:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,https://yourdomain.com` |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `CHROMA_PERSIST_DIR` | `/app/vector_db/chroma_store` |
| `UPLOAD_DIR` | `/app/uploads` |
| `CURRICULUM_DOCS_DIR` | `/app/curriculum_docs` |
| `AI_MAX_TOKENS` | `8192` |
| `AI_TEMPERATURE` | `0.7` |
| `AI_TIMEOUT` | `60` |
| `RAG_TOP_K` | `5` |
| `RAG_CHUNK_SIZE` | `1000` |
| `RAG_CHUNK_OVERLAP` | `150` |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` |

Railway automatically injects `PORT` — your FastAPI app reads it via `${PORT:-8000}` in the Dockerfile CMD.

### 3d. Get the backend public URL

After the first successful deploy, Railway shows your service URL:
```
https://educom-ai-backend-production.up.railway.app
```
Copy this — you need it for Vercel as `AI_BACKEND_URL`.

### 3e. Upload curriculum documents

After the backend is live, upload your ECZ PDFs via the API (or copy them into the volume):

```bash
# Upload a single file (replace URL and path as needed)
curl -X POST https://your-backend.up.railway.app/api/curriculum/upload \
  -F "file=@path/to/CHEMISTRY-SYLLABUS.pdf"

# Or trigger a full directory ingest (if you've placed files in the volume):
curl -X POST https://your-backend.up.railway.app/api/curriculum/ingest-directory

# Monitor ingestion progress:
curl https://your-backend.up.railway.app/api/curriculum/ingest-status
```

---

## Step 4 — Vercel (Next.js frontend)

### 4a. Deploy

1. Go to https://vercel.com → **Add New Project** → Import from GitHub
2. Select your repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave as `/` (the repo root)
5. Build command: `prisma generate && next build` (Vercel reads from `vercel.json`)
6. Click **Deploy** — it will fail the first time because env vars aren't set yet. That's fine.

### 4b. Set Vercel environment variables

Go to **Project Settings → Environment Variables**. Set these for **Production** (and optionally Preview):

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_PROVIDER` | `postgresql` | |
| `DATABASE_URL` | `postgresql://...neon.tech/...?sslmode=require` | From Neon Step 2 |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Update after adding custom domain |
| `NEXTAUTH_SECRET` | 64-char random hex | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | |
| `AI_BACKEND_URL` | `https://your-backend.up.railway.app` | From Railway Step 3d |
| `GEMINI_API_KEY` | Your Gemini API key | Server-side only, safe on Vercel |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |
| `GMAIL_USER` | `noreply.educom@gmail.com` | |
| `GMAIL_APP_PASSWORD` | Your Gmail App Password | |
| `ADMIN_JWT_SECRET` | 64-char random hex | |
| `ADMIN_SETUP_KEY` | Strong random string | |
| `ADMIN_SETUP_DONE` | `false` | Set to `true` after first admin setup |

> Generate secrets with PowerShell: `[System.Web.Security.Membership]::GeneratePassword(64, 10)`  
> Or online: https://generate-secret.vercel.app/64

### 4c. Redeploy

After setting all env vars, trigger a new deployment:
- Vercel dashboard → **Deployments** → **Redeploy** on the latest deployment

### 4d. Update Google OAuth redirect URIs

In Google Cloud Console → APIs & Services → OAuth 2.0 Client:
- Add: `https://your-app.vercel.app/api/auth/callback/google`
- Add: `https://yourdomain.com/api/auth/callback/google` (after adding custom domain)

---

## Step 5 — Custom domain (Squarespace)

### On Vercel:

1. Project Settings → **Domains** → **Add Domain**
2. Enter your domain: `educom.yourdomain.com` or `yourdomain.com`
3. Vercel shows you the DNS records needed

### On Squarespace:

1. Account → **Domains** → click your domain → **DNS Settings**
2. Add the records Vercel gave you:

| Type | Host | Value |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

3. DNS propagation takes 5–30 minutes

### Update NEXTAUTH_URL:

After the domain is live, update in Vercel env vars:
```
NEXTAUTH_URL=https://yourdomain.com
```
Then redeploy.

---

## Step 6 — Verify the full deployment

Run through this checklist in order:

```bash
# 1. Backend health check
curl https://your-backend.up.railway.app/health
# Expected: {"status":"healthy","ai_provider":"Google Gemini","ai_connected":true,...}

# 2. CORS preflight (replace with your actual Vercel URL)
curl -I -X OPTIONS https://your-backend.up.railway.app/api/ai/generate-lesson-plan \
  -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# Expected headers: Access-Control-Allow-Origin: https://your-app.vercel.app

# 3. Frontend loads
open https://your-app.vercel.app

# 4. Teacher login works (Google OAuth)
# 5. Lesson plan generation works
# 6. Assessment generation works (Premium user)
# 7. PDF export works
# 8. Chat assistant works
```

---

## Folder Structure Reference

```
educom/                          ← Git repo root
├── .env.production.example      ← COMMIT: template for Vercel vars
├── .gitignore                   ← blocks all real .env files
├── vercel.json                  ← Vercel build config
├── next.config.ts
├── package.json                 ← postinstall: prisma generate
├── prisma/
│   └── schema.prisma            ← DATABASE_PROVIDER env var switches sqlite↔postgres
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/            ← calls Gemini directly (server-side)
│   │   │   ├── generate-lesson-plan/  ← proxies to AI_BACKEND_URL
│   │   │   ├── generate-assessment/   ← proxies to AI_BACKEND_URL
│   │   │   └── export-pdf/            ← proxies to AI_BACKEND_URL
│   │   └── ...pages
│   └── ...
└── ai-backend/                  ← Railway service root
    ├── .env.example             ← COMMIT: template for Railway vars
    ├── .gitignore
    ├── Dockerfile               ← Railway builds from this
    ├── railway.toml             ← Railway deploy config
    ├── requirements.txt
    ├── main.py
    ├── config/
    ├── models/
    ├── routes/
    ├── services/
    │   ├── gemini_service.py    ← Gemini API client
    │   ├── pdf_service.py       ← ReportLab PDF generation
    │   └── prompts.py           ← All AI prompts
    ├── rag/
    ├── vector_db/
    │   └── chroma_store/        ← EXCLUDED from git, mounted as Railway volume
    ├── curriculum_docs/         ← ECZ PDFs (upload after deploy)
    └── uploads/                 ← Teacher-uploaded files
```

---

## Scaling for 600 Active Users

### Railway (backend)

| Metric | Recommendation |
|---|---|
| Instance size | **Hobby** plan (512 MB RAM) works for beta |
| Scale up to | **Pro** plan (2 GB RAM) if p95 latency > 3s |
| Workers | `--workers 2` in Dockerfile CMD (2 uvicorn workers) |
| ChromaDB | Single instance is fine — reads are fast, writes are rare |
| Gemini API | Free tier: 15 req/min. Paid tier: 1000 req/min. Upgrade for 600 users |

### Vercel (frontend)

Vercel scales automatically. The Next.js `/api` routes are serverless functions — no config needed.

### Database (Neon)

Neon free tier supports 0.5 GB storage and up to ~100 concurrent connections. For 600 users in beta, this is sufficient. Upgrade to **Launch** plan ($19/mo) for 10 GB + 1000 connections if needed.

### Gemini API rate limits

The free tier is 15 requests/minute and 1 million tokens/day. For 600 active beta users generating assessments, you will likely need to upgrade:
- Go to https://aistudio.google.com → **Get API key** → upgrade to **Pay as you go**
- Cost: ~$0.001 per lesson plan, ~$0.005 per full exam paper

---

## Common Deployment Errors and Fixes

### Vercel: `PrismaClientInitializationError: Can't reach database server`

**Cause:** `DATABASE_URL` not set in Vercel env vars, or `DATABASE_PROVIDER` missing.

**Fix:**
1. Verify both `DATABASE_PROVIDER=postgresql` and `DATABASE_URL=postgresql://...` are set in Vercel dashboard
2. Redeploy after adding them

---

### Vercel: `Module not found: Can't resolve 'prisma/client'`

**Cause:** `prisma generate` didn't run during build.

**Fix:** Confirm `package.json` has `"postinstall": "prisma generate"`. This runs automatically on `npm install` which Vercel calls before building.

---

### Railway: `Address already in use` / port conflict

**Cause:** Hardcoded `port=8000` instead of reading `$PORT`.

**Fix:** The `Dockerfile` CMD uses `${PORT:-8000}` — Railway injects `PORT` automatically. Confirm the CMD line is:
```
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
```

---

### Railway: `chromadb.errors.NotEnoughElementsException` on first boot

**Cause:** ChromaDB store is empty — no curriculum documents ingested yet.

**Fix:** This is expected and handled gracefully. The app returns empty RAG context and falls back to unaugmented generation. Upload curriculum docs after the service is live (Step 3e).

---

### Railway: `GEMINI_API_KEY not configured` in logs

**Cause:** Env var not set, or spelled incorrectly.

**Fix:**
1. Railway → service → Variables → confirm `GEMINI_API_KEY` is present (no quotes, no spaces)
2. Trigger a redeploy after adding it — env vars only take effect on the next deploy

---

### CORS error in browser: `blocked by CORS policy`

**Cause:** `ALLOWED_ORIGINS` in Railway doesn't include the Vercel URL.

**Fix:** Update the Railway env var:
```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://yourdomain.com
```
Railway auto-redeploys when you change env vars. If not, trigger a manual redeploy.

---

### NextAuth: `NEXTAUTH_URL` mismatch / redirect loop

**Cause:** `NEXTAUTH_URL` set to `localhost:3000` in production, or doesn't match the actual domain.

**Fix:** Set in Vercel env vars:
```
NEXTAUTH_URL=https://your-app.vercel.app   (or your custom domain)
```
Also update Google OAuth redirect URIs to match.

---

### Vercel: `Build failed — prisma generate exited with code 1`

**Cause:** `DATABASE_URL` env var is set to a SQLite path (`file:./dev.db`) in Vercel, but `DATABASE_PROVIDER=postgresql` expects a PostgreSQL URL.

**Fix:** In Vercel env vars, set:
```
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://...neon.tech/...?sslmode=require
```

---

### Railway: Container OOM (Out of Memory) kill

**Cause:** The ONNX embedding model loads ~100 MB into RAM on first request. Combined with multiple uvicorn workers, this can exceed the 512 MB hobby plan.

**Fix:** Either upgrade to the Railway Pro instance (2 GB RAM), or reduce workers to 1:
```
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
```

---

## Secret Generation Reference

Generate strong secrets with these commands:

**PowerShell (Windows):**
```powershell
# 64-char hex secret (for NEXTAUTH_SECRET, ADMIN_JWT_SECRET)
-join ((1..32) | ForEach { '{0:x2}' -f (Get-Random -Max 256) })

# Or using .NET
[System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32) | ForEach-Object { '{0:x2}' -f $_ } | Join-String
```

**Or use online tools:**
- https://generate-secret.vercel.app/64 (NEXTAUTH_SECRET)
- https://generate-secret.vercel.app/32 (ADMIN_SETUP_KEY)

---

## Post-Deployment: Set up the admin account

Once Vercel is live:

```bash
curl -X POST https://yourdomain.com/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "setupKey": "YOUR_ADMIN_SETUP_KEY",
    "name": "Admin",
    "email": "admin@yourdomain.com",
    "password": "StrongPassword123!"
  }'
```

Then set `ADMIN_SETUP_DONE=true` in Vercel env vars to prevent re-setup.
