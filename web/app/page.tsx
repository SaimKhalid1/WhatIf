"use client";

import { useEffect, useMemo, useState } from "react";
import { SimulateRequest, SimulateResponse, demoSeed, simulate } from "../lib/api";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("whatif_theme");
    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;

    const initial =
      saved === "light" || saved === "dark"
        ? (saved as any)
        : prefersLight
        ? "light"
        : "dark";

    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("whatif_theme", next);
  }

  return { theme, toggle };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function pct(n: number) {
  return Math.round(clamp01(n) * 100) + "%";
}
function num(n: number, d = 2) {
  const v = isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
}
function money(n: number) {
  const v = isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

const DEFAULT: SimulateRequest = {
  title: "My decision",
  decision_text:
    "Should I accept Job A now or wait 6 months for a potentially better role while improving my skills?",
  horizon: "6m",
  risk_tolerance: "medium",
  priorities: { growth: 8, stability: 5, income: 6, learning: 7, stress: 4 },
  constraints: { monthly_expenses: 2600, savings_months: 3.5, time_per_week_hours: 12 },
  assumptions: {
    offer_probability: 0.58,
    market_volatility: 0.45,
    baseline_income_monthly: 4800,
    target_income_monthly: 6500,
    switching_cost: 1400,
  },
  use_llm: false,
};

function dotClass(v: number) {
  if (v < 0.35) return "dot good";
  if (v < 0.65) return "dot warn";
  return "dot bad";
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  right,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  right?: string;
}) {
  const pctWidth = ((value - min) / (max - min)) * 100;
  return (
    <div className="field">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <label>{label}</label>
        <span className="pill mono">{right ?? String(value)}</span>
      </div>
      <div className="bar">
        <div style={{ width: `${Math.round(pctWidth)}%` }} />
      </div>
      <input
        style={{ marginTop: 8 }}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function Page() {
  const { theme, toggle } = useTheme();
  const [req, setReq] = useState<SimulateRequest>(DEFAULT);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<SimulateResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ranking = useMemo(() => {
    const r = (res?.ranking || []) as any[];
    return r.map((x) => ({ name: String(x.name), fit_score: Number(x.fit_score ?? 0) }));
  }, [res]);

  const best = ranking[0]?.name;

  const fitBars = useMemo(() => {
    const sc = (res?.scenarios || []) as any[];
    const maxFit = Math.max(...sc.map((s) => Number(s.signals?.fit_score ?? 0)), 1e-9);
    return sc.map((s) => ({
      name: String(s.name),
      fit: Number(s.signals?.fit_score ?? 0),
      w: clamp01(Number(s.signals?.fit_score ?? 0) / maxFit),
    }));
  }, [res]);

  async function onDemo() {
    setBusy(true);
    setErr(null);
    try {
      await demoSeed();
      const out = await simulate(req);
      setRes(out);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onSimulate() {
    setBusy(true);
    setErr(null);
    try {
      const out = await simulate(req);
      setRes(out);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const riskLabel =
    req.risk_tolerance === "low" ? "Low (safety-first)" :
    req.risk_tolerance === "high" ? "High (upside-first)" :
    "Medium (balanced)";

  return (
    <div className="container">
      <div className="topbar fadeIn">
        <div className="brand">
          <img src="/logo.svg" alt="WhatIf logo" width={38} height={38} style={{ borderRadius: 14 }} />
          <div>
            <div className="h1">WhatIf</div>
            <div className="sub">
              Assumption-driven decision simulation — a flashlight, not a crystal ball.
            </div>
          </div>
        </div>

        <div className="row">
          <a className="pill mono" href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
            API docs
          </a>

          <button className="iconBtn" aria-label="Toggle theme" onClick={toggle}>
            {theme === "dark" ? (
              <svg className="icon" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 19v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4.22 4.22l1.42 1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M18.36 18.36l1.42 1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M19 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4.22 19.78l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 7a5 5 0 100 10 5 5 0 000-10z" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <svg className="icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12.8A8.5 8.5 0 1111.2 3a6.8 6.8 0 009.8 9.8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="hero fadeIn">
        <div className="heroInner">
          <div>
            <div className="heroTitle">Make the uncertainty explicit.</div>
            <div className="heroCopy">
              You set priorities + constraints. The system simulates scenarios using transparent assumptions
              and stores an audit trail. It doesn’t claim to predict the future.
            </div>
          </div>

          <div className="heroBadges">
            <span className="chip"><span className="dot good" /><b>Not prediction</b></span>
            <span className="chip"><span className="dot warn" /><b>Assumptions first</b></span>
            <span className="chip"><span className="dot" /><b>Reproducible</b></span>
          </div>
        </div>
      </div>

      <div className="grid fadeIn">
        {/* LEFT: INPUTS */}
        <div className="card">
          <h2>Inputs</h2>

          <div className="field">
            <label>Decision title</label>
            <input
              value={req.title}
              onChange={(e) => setReq({ ...req, title: e.target.value })}
              placeholder="Short name"
            />
          </div>

          <div className="field">
            <label>Decision prompt</label>
            <textarea
              value={req.decision_text}
              onChange={(e) => setReq({ ...req, decision_text: e.target.value })}
              placeholder="Describe the decision and options…"
            />
          </div>

          <div className="split">
            <div className="field">
              <label>Horizon</label>
              <select
                value={req.horizon as any}
                onChange={(e) => setReq({ ...req, horizon: e.target.value as any })}
              >
                <option value="1m">1 month</option>
                <option value="3m">3 months</option>
                <option value="6m">6 months</option>
                <option value="12m">12 months</option>
              </select>
            </div>

            <div className="field">
              <label>Risk tolerance</label>
              <select
                value={req.risk_tolerance as any}
                onChange={(e) => setReq({ ...req, risk_tolerance: e.target.value as any })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <div className="small" style={{ marginTop: 6 }}>{riskLabel}</div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn primary" onClick={onSimulate} disabled={busy}>
              {busy ? "Simulating…" : "Simulate"}
            </button>
            <button className="btn ghost" onClick={onDemo} disabled={busy}>
              Load Demo
            </button>

            <label className="chip" style={{ marginLeft: "auto" }}>
              <input
                type="checkbox"
                checked={!!req.use_llm}
                onChange={(e) => setReq({ ...req, use_llm: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <b>LLM rationale</b>
            </label>
          </div>

          <div className="small" style={{ marginTop: 10 }}>
            “LLM rationale” is optional. The simulator still works without it.
          </div>

          <hr />

          <h2>Priorities (0–10)</h2>
          <div className="split">
            <Slider
              label="Growth"
              value={req.priorities.growth}
              min={0}
              max={10}
              step={1}
              right={String(req.priorities.growth)}
              onChange={(v) => setReq({ ...req, priorities: { ...req.priorities, growth: v } })}
            />
            <Slider
              label="Stability"
              value={req.priorities.stability}
              min={0}
              max={10}
              step={1}
              right={String(req.priorities.stability)}
              onChange={(v) => setReq({ ...req, priorities: { ...req.priorities, stability: v } })}
            />
            <Slider
              label="Income"
              value={req.priorities.income}
              min={0}
              max={10}
              step={1}
              right={String(req.priorities.income)}
              onChange={(v) => setReq({ ...req, priorities: { ...req.priorities, income: v } })}
            />
            <Slider
              label="Learning"
              value={req.priorities.learning}
              min={0}
              max={10}
              step={1}
              right={String(req.priorities.learning)}
              onChange={(v) => setReq({ ...req, priorities: { ...req.priorities, learning: v } })}
            />
            <Slider
              label="Stress sensitivity"
              value={req.priorities.stress}
              min={0}
              max={10}
              step={1}
              right={String(req.priorities.stress)}
              onChange={(v) => setReq({ ...req, priorities: { ...req.priorities, stress: v } })}
            />
          </div>

          <hr />

          <h2>Constraints</h2>
          <div className="split">
            <div className="field">
              <label>Monthly expenses</label>
              <input
                type="number"
                value={req.constraints.monthly_expenses}
                onChange={(e) =>
                  setReq({
                    ...req,
                    constraints: { ...req.constraints, monthly_expenses: Number(e.target.value) },
                  })
                }
              />
              <div className="small">Used to stress-test runway vs. downside scenarios.</div>
            </div>

            <div className="field">
              <label>Savings runway (months)</label>
              <input
                type="number"
                step="0.5"
                value={req.constraints.savings_months}
                onChange={(e) =>
                  setReq({
                    ...req,
                    constraints: { ...req.constraints, savings_months: Number(e.target.value) },
                  })
                }
              />
              <div className="small">How long you can absorb uncertainty.</div>
            </div>

            <div className="field">
              <label>Time available (hrs/week)</label>
              <input
                type="number"
                value={req.constraints.time_per_week_hours}
                onChange={(e) =>
                  setReq({
                    ...req,
                    constraints: { ...req.constraints, time_per_week_hours: Number(e.target.value) },
                  })
                }
              />
              <div className="small">Affects learning/upside assumptions in scenarios.</div>
            </div>
          </div>

          <hr />

          <h2>Assumptions</h2>
          <div className="split">
            <Slider
              label="Offer probability"
              value={req.assumptions.offer_probability}
              min={0}
              max={1}
              step={0.01}
              right={pct(req.assumptions.offer_probability)}
              onChange={(v) =>
                setReq({ ...req, assumptions: { ...req.assumptions, offer_probability: v } })
              }
            />
            <Slider
              label="Market volatility"
              value={req.assumptions.market_volatility}
              min={0}
              max={1}
              step={0.01}
              right={pct(req.assumptions.market_volatility)}
              onChange={(v) =>
                setReq({ ...req, assumptions: { ...req.assumptions, market_volatility: v } })
              }
            />

            <div className="field">
              <label>Baseline income (monthly)</label>
              <input
                type="number"
                value={req.assumptions.baseline_income_monthly}
                onChange={(e) =>
                  setReq({
                    ...req,
                    assumptions: { ...req.assumptions, baseline_income_monthly: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="field">
              <label>Target income (monthly)</label>
              <input
                type="number"
                value={req.assumptions.target_income_monthly}
                onChange={(e) =>
                  setReq({
                    ...req,
                    assumptions: { ...req.assumptions, target_income_monthly: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="field">
              <label>Switching cost (one-time)</label>
              <input
                type="number"
                value={req.assumptions.switching_cost}
                onChange={(e) =>
                  setReq({
                    ...req,
                    assumptions: { ...req.assumptions, switching_cost: Number(e.target.value) },
                  })
                }
              />
              <div className="small">Moving cost, relocation, ramp-up, etc.</div>
            </div>
          </div>

          <div className="footerNote">
            Integrity: the app “earns trust” by exposing assumptions + sensitivity, not pretending it knows the future.
          </div>
        </div>

        {/* RIGHT: RESULTS */}
        <div className="card">
          <h2>Results</h2>

          {err ? (
            <div className="badge" style={{ borderColor: "var(--bad)" }}>
              {err}
            </div>
          ) : null}

          {!res ? (
            <div className="small">
              Click <b>Load Demo</b> for an instant example, or tune inputs and hit <b>Simulate</b>.
            </div>
          ) : (
            <>
              <div className="kpis">
                <div className="kpi">
                  <div className="name">Recommended (fit)</div>
                  <div className="val">{best || "—"}</div>
                  <div className="small">Highest fit score given your priorities.</div>
                </div>
                <div className="kpi">
                  <div className="name">Audit log</div>
                  <div className="val mono">SQL</div>
                  <div className="small">Runs stored + reproducible.</div>
                </div>
                <div className="kpi">
                  <div className="name">Decision scope</div>
                  <div className="val">{String(req.horizon).toUpperCase()}</div>
                  <div className="small">{riskLabel}</div>
                </div>
              </div>

              <hr />

              {(res.scenarios || []).map((s: any, idx: number) => {
                const fit = Number(s.signals?.fit_score ?? 0);
                const w = fitBars.find((b) => b.name === String(s.name))?.w ?? 0;
                const ev = Number(s.metrics?.expected_value ?? 0);
                const stress = Number(s.metrics?.stress ?? 0);
                const risk = Number(s.metrics?.risk ?? 0);

                return (
                  <div className="sc" key={idx} style={{ marginBottom: 10 }}>
                    <div className="scTitle">
                      <div className="scName">{String(s.name)}</div>
                      <div className="scFit">
                        Fit: <span className="mono">{num(fit, 3)}</span>
                      </div>
                    </div>

                    <div className="bar" style={{ marginTop: 10 }}>
                      <div style={{ width: `${Math.round(w * 100)}%` }} />
                    </div>

                    <div className="small" style={{ marginTop: 10 }}>
                      EV: <span className="mono">{money(ev)}</span> · Risk:{" "}
                      <span className="mono">{num(risk, 2)}</span> · Stress:{" "}
                      <span className="mono">{num(stress, 2)}</span>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      {(s.assumption_trace || []).slice(0, 8).map((a: any, i: number) => (
                        <span className="tag" key={i}>
                          <span className={dotClass(Number(a?.sensitivity ?? 0))} />
                          <span>
                            <span className="mono">{String(a.key)}</span> →{" "}
                            <span className="mono">{String(a.value)}</span>
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="footerNote">
                This is the “MNP story”: transparent assumptions, scenario ranges, and traceability — not vibes.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
