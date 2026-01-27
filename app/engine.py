from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any, List, Tuple
import math

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))

def horizon_months(h: str) -> int:
    return {"1m":1,"3m":3,"6m":6,"12m":12,"24m":24}[h]

def score_risk(risk_tolerance: str, volatility: float, cash_buffer_months: float) -> float:
    tol = {"low":0.35,"medium":0.55,"high":0.75}[risk_tolerance]
    # higher volatility increases risk; higher cash buffer reduces risk
    raw = (volatility - 0.35) * 1.1 - (cash_buffer_months - 2.5) * 0.22 - (tol - 0.55) * 0.35
    return clamp(sigmoid(raw), 0, 1)

def score_optionality(time_per_week: int, horizon_m: int, offer_prob: float) -> float:
    # more time + longer horizon + better offer probability increases optionality
    raw = (time_per_week - 8) * 0.08 + (horizon_m - 6) * 0.03 + (offer_prob - 0.5) * 0.8
    return clamp(sigmoid(raw), 0, 1)

def score_stress(volatility: float, time_per_week: int, income_gap: float) -> float:
    raw = (volatility - 0.4) * 1.2 + (time_per_week - 10) * 0.06 + (income_gap / 5000) * 0.9
    return clamp(sigmoid(raw), 0, 1)

def weighted_fit(priorities: Dict[str, int], signals: Dict[str, float]) -> float:
    # signals are 0..1 where higher is better for growth/stability/income/learning/optionality, and lower is better for stress/risk
    w = {k: max(0, min(10, int(v))) for k, v in priorities.items()}
    total = sum(w.values()) or 1
    # Convert stress priority: user wants low stress, so we treat "stress_score" as (1 - stress)
    components = {
        "growth": signals["growth_score"],
        "stability": signals["stability_score"],
        "income": signals["income_score"],
        "learning": signals["learning_score"],
        "stress": 1 - signals["stress_score"],
    }
    return sum(components[k] * w[k] for k in components) / total

def ranges(center: float, spread: float) -> Tuple[float, float]:
    return (center * (1 - spread), center * (1 + spread))

def build_scenarios(inp: Dict[str, Any]) -> Dict[str, Any]:
    horizon_m = horizon_months(inp["horizon"])
    pr = inp["priorities"]
    c = inp["constraints"]
    a = inp["assumptions"]
    rt = inp["risk_tolerance"]

    volatility = float(a["market_volatility"])
    offer_prob = float(a["offer_probability"])
    baseline_income = float(a["baseline_income_monthly"])
    target_income = float(a["target_income_monthly"])
    switching_cost = float(a["switching_cost"])

    expenses = float(c["monthly_expenses"])
    savings_m = float(c["savings_months"])
    time_pw = int(c["time_per_week_hours"])

    income_gap = max(0.0, expenses - baseline_income)

    base_risk = score_risk(rt, volatility, savings_m)
    base_opt = score_optionality(time_pw, horizon_m, offer_prob)

    # Scenario A: Act Now (commit)
    # Assumption: higher short-term disruption; higher potential upside
    a_risk = clamp(base_risk + 0.12, 0, 1)
    a_opt = clamp(base_opt + 0.08, 0, 1)
    a_stress = clamp(score_stress(volatility + 0.05, time_pw + 4, income_gap + 300), 0, 1)

    # Income model: some chance you hit target earlier, but with uncertainty
    a_income_center = baseline_income + (target_income - baseline_income) * (0.45 + 0.45 * offer_prob)
    a_income_lo, a_income_hi = ranges(a_income_center, 0.18 + 0.25 * volatility)

    # Scenario B: Delay (stability)
    b_risk = clamp(base_risk - 0.10, 0, 1)
    b_opt = clamp(base_opt - 0.05 + 0.03 * (horizon_m/12), 0, 1)
    b_stress = clamp(score_stress(volatility - 0.03, time_pw - 1, income_gap), 0, 1)

    b_income_center = baseline_income + (target_income - baseline_income) * (0.25 + 0.35 * offer_prob)
    b_income_lo, b_income_hi = ranges(b_income_center, 0.12 + 0.18 * volatility)

    # Scenario C: Hedge (hybrid)
    c_risk = clamp(base_risk - 0.02, 0, 1)
    c_opt = clamp(base_opt + 0.06, 0, 1)
    c_stress = clamp(score_stress(volatility, time_pw + 2, income_gap + 120), 0, 1)

    c_income_center = baseline_income + (target_income - baseline_income) * (0.35 + 0.40 * offer_prob)
    c_income_lo, c_income_hi = ranges(c_income_center, 0.14 + 0.20 * volatility)

    # Normalize helpful signals 0..1
    def income_score(lo, hi):
        # score relative to expenses and target; scale between 0 and 1
        center = (lo + hi) / 2
        return clamp((center - expenses) / max(1.0, (target_income - expenses)), 0, 1)

    def stability_score(risk):
        return 1 - risk

    def growth_score(opt):
        return opt

    def learning_score(time_pw):
        return clamp((time_pw - 2) / 18, 0, 1)

    sA = {
        "growth_score": growth_score(a_opt),
        "stability_score": stability_score(a_risk),
        "income_score": income_score(a_income_lo, a_income_hi),
        "learning_score": learning_score(time_pw + 4),
        "stress_score": a_stress,
        "risk_score": a_risk,
        "optionality_score": a_opt,
        "income_monthly_range": [round(a_income_lo, 0), round(a_income_hi, 0)],
        "time_cost_hours_per_week_range": [max(0, time_pw + 2), min(80, time_pw + 10)],
        "one_time_cost_range": [round(switching_cost * 0.8, 0), round(switching_cost * 1.3, 0)],
    }
    sB = {
        "growth_score": growth_score(b_opt),
        "stability_score": stability_score(b_risk),
        "income_score": income_score(b_income_lo, b_income_hi),
        "learning_score": learning_score(time_pw),
        "stress_score": b_stress,
        "risk_score": b_risk,
        "optionality_score": b_opt,
        "income_monthly_range": [round(b_income_lo, 0), round(b_income_hi, 0)],
        "time_cost_hours_per_week_range": [max(0, time_pw - 2), min(80, time_pw + 3)],
        "one_time_cost_range": [round(switching_cost * 0.3, 0), round(switching_cost * 0.7, 0)],
    }
    sC = {
        "growth_score": growth_score(c_opt),
        "stability_score": stability_score(c_risk),
        "income_score": income_score(c_income_lo, c_income_hi),
        "learning_score": learning_score(time_pw + 2),
        "stress_score": c_stress,
        "risk_score": c_risk,
        "optionality_score": c_opt,
        "income_monthly_range": [round(c_income_lo, 0), round(c_income_hi, 0)],
        "time_cost_hours_per_week_range": [max(0, time_pw), min(80, time_pw + 6)],
        "one_time_cost_range": [round(switching_cost * 0.5, 0), round(switching_cost * 1.0, 0)],
    }

    fitA = weighted_fit(pr, sA)
    fitB = weighted_fit(pr, sB)
    fitC = weighted_fit(pr, sC)

    scenarios = [
        ("Act Now", "Commit early. Higher upside potential, higher short‑term disruption.", [
            f"Offer probability ≈ {int(offer_prob*100)}%",
            f"Market volatility ≈ {int(volatility*100)}%",
            "You accept short‑term instability to increase optionality.",
        ], sA, fitA),
        ("Delay", "Stabilize first. Lower downside, slower optionality gains.", [
            f"Cash buffer ≈ {savings_m:.1f} months",
            "You prioritize stability and controlled effort.",
            "Upside depends on sustained effort over time.",
        ], sB, fitB),
        ("Hedge", "Split the difference. Keep stability while building optionality.", [
            "You invest steady effort while limiting downside.",
            "You accept moderate stress for better optionality.",
            "You keep more exit routes open.",
        ], sC, fitC),
    ]

    # Rank by fit (higher is better)
    scenarios_sorted = sorted(scenarios, key=lambda x: x[4], reverse=True)

    # Build comparison facts
    comparison = {
        "ranking": [
            {"name": name, "fit_score": round(fit, 4)} for (name, _, _, _, fit) in scenarios_sorted
        ],
        "note": "Ranking is based on your priorities only. It is NOT a prediction."
    }

    facts = {
        "horizon_months": horizon_m,
        "risk_tolerance": rt,
        "priorities": pr,
        "constraints": c,
        "assumptions": a,
        "governance": {
            "not_prediction": True,
            "rule": "Any explanation must only use the facts + scenario outputs below."
        }
    }

    out = {
        "facts": facts,
        "scenarios": [
            {
                "name": name,
                "summary": summary,
                "assumptions": assumptions,
                "signals": signals | {"fit_score": round(fit, 4)}
            }
            for (name, summary, assumptions, signals, fit) in scenarios
        ],
        "comparison": comparison
    }
    return out
