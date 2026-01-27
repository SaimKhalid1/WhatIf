export type SimulateRequest = {
  title: string;
  decision_text: string;
  horizon: "1m" | "3m" | "6m" | "12m" | "24m";
  risk_tolerance: "low" | "medium" | "high";
  priorities: { growth: number; stability: number; income: number; learning: number; stress: number };
  constraints: { monthly_expenses: number; savings_months: number; time_per_week_hours: number };
  assumptions: {
    offer_probability: number;
    market_volatility: number;
    baseline_income_monthly: number;
    target_income_monthly: number;
    switching_cost: number;
  };
  use_llm: boolean;
};

export type Scenario = {
  name: string;
  summary: string;
  assumptions: string[];
  signals: Record<string, any>;
};

export type SimulateResponse = {
  run_id: number;
  facts: any[];
  scenarios: any[];
  comparison: string[];
  llm_summary?: any;

  ranking?: Array<{
    name: string;
    fit_score?: number;
    notes?: string;
  }>;
};


const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";


async function jsonOrThrow(r: Response) {
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `Request failed: ${r.status}`);
  }
  return r.json();
}

export async function demoSeed(): Promise<any> {
  const r = await fetch(`${API_BASE}/demo/seed`, { method: "POST" });
  return jsonOrThrow(r);
}

export async function simulate(payload: SimulateRequest): Promise<SimulateResponse> {
  const r = await fetch(`${API_BASE}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return jsonOrThrow(r);
}
