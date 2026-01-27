# WhatIf — Decision Intelligence Simulator (Assumption‑Driven)

**WhatIf** helps you make better decisions under uncertainty by **surfacing assumptions** and comparing **plausible scenarios**.
It **does not** predict the future and it **does not** tell you what to do.

✅ Public-facing, shareable (Netlify/Vercel frontend)  
✅ Responsible Applied AI pattern (deterministic model → optional LLM explanation constrained to facts)  
✅ Data engineering pattern (schemas, validation, reproducible JSON outputs, SQL persistence)

---

## 1‑minute demo
1) Start backend + frontend  
2) Click **Load Demo**  
3) See 3 scenarios + tradeoffs + governed explanation

---

## Prereqs
- Python 3.10+
- Node.js 18+

---

## Run locally (Windows PowerShell)

### 1) Backend (FastAPI)
```powershell
cd whatif-decision-intelligence

python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Windows-friendly reload (watch only app/)
uvicorn app.main:app --reload --reload-dir app
```
Backend docs: http://127.0.0.1:8000/docs

### 2) Frontend (Next.js)
Open a second terminal:
```powershell
cd whatif-decision-intelligence\web
npm install
npm run dev
```
Frontend: http://localhost:3000

---

## Optional: LLM explanation (facts-only)
Not required. If set, backend returns `llm_summary`.

```powershell
$env:OPENAI_API_KEY="YOUR_KEY"
```

---

## Deploy (simple)
- Frontend: Netlify or Vercel (Next.js)
- Backend: Render / Railway / Azure App Service (Python)

Set frontend env:
- `NEXT_PUBLIC_API_BASE=https://YOUR_BACKEND_URL`

---

## Resume bullets (copy/paste)
**WhatIf — Decision Intelligence Simulator** (Next.js, FastAPI, SQL, Responsible AI)  
- Built a public-facing decision support app that compares scenarios using explicit assumptions, uncertainty ranges, and reproducible scoring.  
- Implemented a deterministic scenario engine (risk, optionality, cost, time) and stored simulation runs in SQL for traceability.  
- Added an optional governed LLM layer that generates concise executive explanations strictly from model outputs (no invented facts).
