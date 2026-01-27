from pydantic import BaseModel, Field
from typing import Literal, Optional, Any

RiskTolerance = Literal["low", "medium", "high"]
Horizon = Literal["1m", "3m", "6m", "12m", "24m"]

class Priorities(BaseModel):
    growth: int = Field(ge=0, le=10, default=7)
    stability: int = Field(ge=0, le=10, default=6)
    income: int = Field(ge=0, le=10, default=6)
    learning: int = Field(ge=0, le=10, default=7)
    stress: int = Field(ge=0, le=10, default=5)  # lower preferred stress

class Constraints(BaseModel):
    monthly_expenses: float = Field(ge=0, default=2500)
    savings_months: float = Field(ge=0, default=3)  # how many months can you cover
    time_per_week_hours: int = Field(ge=0, le=80, default=10)

class Assumptions(BaseModel):
    offer_probability: float = Field(ge=0, le=1, default=0.55)
    market_volatility: float = Field(ge=0, le=1, default=0.45)
    baseline_income_monthly: float = Field(ge=0, default=4500)
    target_income_monthly: float = Field(ge=0, default=6000)
    switching_cost: float = Field(ge=0, default=1200)

class SimulateRequest(BaseModel):
    title: str = Field(default="My decision")
    decision_text: str = Field(min_length=10)
    horizon: Horizon = "6m"
    risk_tolerance: RiskTolerance = "medium"
    priorities: Priorities = Priorities()
    constraints: Constraints = Constraints()
    assumptions: Assumptions = Assumptions()
    use_llm: bool = False

class ScenarioOut(BaseModel):
    name: str
    summary: str
    assumptions: list[str]
    signals: dict[str, Any]  # includes ranges + scores

class SimulateResponse(BaseModel):
    run_id: int
    facts: dict[str, Any]
    scenarios: list[ScenarioOut]
    comparison: dict[str, Any]
    llm_summary: Optional[str] = None

class RunOut(BaseModel):
    id: int
    created_at: str
    title: str
    class Config:
        from_attributes = True
