from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json

from .config import settings
from .db import Base, engine, get_db
from .models import SimulationRun
from .schemas import SimulateRequest, SimulateResponse, RunOut
from .engine import build_scenarios
from .llm import governed_summary

Base.metadata.create_all(bind=engine)

app = FastAPI(title="WhatIf API — Decision Intelligence Simulator", version="1.0.0")

# ---- CORS (Deploy-friendly) -------------------------------------------------
# We keep your settings.cors_origins, but also add safe defaults for local dev + Netlify.
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Pull from settings if present (your config can define cors_origins as list[str])
cfg_origins = []
try:
    if isinstance(settings.cors_origins, list):
        cfg_origins = settings.cors_origins
except Exception:
    cfg_origins = []

allow_origins = list(dict.fromkeys(default_origins + cfg_origins))  # de-dupe, keep order

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Some hosting setups + browsers do a preflight OPTIONS call; ensure it never 404s.
@app.options("/{path:path}")
def preflight(path: str, request: Request):
    return {"ok": True}

# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/simulate", response_model=SimulateResponse)
async def simulate(payload: SimulateRequest, db: Session = Depends(get_db)):
    inp = payload.model_dump()
    model_out = build_scenarios(inp)

    run = SimulationRun(
        title=payload.title.strip()[:200],
        decision_text=payload.decision_text,
        inputs_json=json.dumps(inp),
        output_json=json.dumps(model_out),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    summary = None
    if payload.use_llm:
        try:
            summary = await governed_summary(model_out)
        except Exception:
            # don't fail the whole request if LLM is unavailable
            summary = None

    return {
        "run_id": run.id,
        "facts": model_out["facts"],
        "scenarios": model_out["scenarios"],
        "comparison": model_out["comparison"],
        "llm_summary": summary,
    }

@app.get("/runs", response_model=list[RunOut])
def list_runs(db: Session = Depends(get_db)):
    rows = (
        db.query(SimulationRun)
        .order_by(SimulationRun.created_at.desc())
        .limit(50)
        .all()
    )
    return rows

@app.get("/runs/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db)):
    row = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Run not found.")
    return {
        "id": row.id,
        "created_at": row.created_at.isoformat(),
        "title": row.title,
        "decision_text": row.decision_text,
        "inputs": json.loads(row.inputs_json),
        "output": json.loads(row.output_json),
    }

@app.post("/demo/seed")
async def demo_seed(db: Session = Depends(get_db)):
    demo = SimulateRequest(
        title="Job Offer vs Wait",
        decision_text="Should I accept Job A now (stable but lower growth) or wait 6 months for a potentially better role while improving my skills?",
        horizon="6m",
        risk_tolerance="medium",
        priorities={"growth": 8, "stability": 5, "income": 6, "learning": 7, "stress": 4},
        constraints={"monthly_expenses": 2600, "savings_months": 3.5, "time_per_week_hours": 12},
        assumptions={
            "offer_probability": 0.58,
            "market_volatility": 0.45,
            "baseline_income_monthly": 4800,
            "target_income_monthly": 6500,
            "switching_cost": 1400,
        },
        use_llm=False,
    ).model_dump()

    out = build_scenarios(demo)

    run = SimulationRun(
        title=demo["title"],
        decision_text=demo["decision_text"],
        inputs_json=json.dumps(demo),
        output_json=json.dumps(out),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return {"run_id": run.id, "inputs": demo, "output": out}

