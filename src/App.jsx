import { useState, useEffect, useCallback } from "react";

const REC_CONFIG = {
  BUY:  { bg: "#0d2b1a", border: "#22c55e", text: "#4ade80", badge: "#16a34a" },
  HOLD: { bg: "#2b2000", border: "#f59e0b", text: "#fbbf24", badge: "#d97706" },
  WAIT: { bg: "#1e1e2e", border: "#6366f1", text: "#a5b4fc", badge: "#4f46e5" },
  SELL: { bg: "#2b0a0a", border: "#ef4444", text: "#f87171", badge: "#dc2626" },
};

const SCORE_COLORS = { tf: "#818cf8", mom: "#f472b6", ha: "#34d399", ichi: "#fbbf24" };

function ScoreBar({ value, max = 25, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono", fontWeight: 700, color, minWidth: 20, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function TotalScoreRing({ score }) {
  const r = 28, c = 2 * Math.PI * r;
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : score >= 40 ? "#6366f1" : "#ef4444";
  return (
    <svg width={70} height={70} viewBox="0 0 70 70">
      <circle cx={35} cy={35} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
      <circle cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
        strokeLinecap="round" transform="rotate(-90 35 35)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x={35} y={38} textAnchor="middle" fill={color} fontSize={14} fontWeight={700} fontFamily="IBM Plex Mono">{score}</text>
    </svg>
  );
}

function RecBadge({ rec }) {
  const cfg = REC_CONFIG[rec] || REC_CONFIG.WAIT;
  return (
    <span style={{ background: cfg.badge, color: "#fff", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: "IBM Plex Mono", letterSpacing: 1 }}>{rec}</span>
  );
}

function StockCard({ stock, rank }) {
  const [open, setOpen] = useState(false);
  const cfg = REC_CONFIG[stock.recommendation] || REC_CONFIG.WAIT;
  const isBuy = stock.recommendation === "BUY";
  const pctFromH = (((stock.w52h - stock.cmp) / stock.w52h) * 100).toFixed(1);
  const pctFromL = (((stock.cmp - stock.w52l) / stock.w52l) * 100).toFixed(1);

  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden", transition: "box-shadow 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 1px ${cfg.border}`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>

      {/* Header row */}
      <div style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} onClick={() => setOpen(!open)}>
        {isBuy && <TotalScoreRing score={stock.total_score} />}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {rank && <span style={{ fontSize: 10, color: "#64748b", fontFamily: "IBM Plex Mono" }}>#{rank}</span>}
            <span style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", fontFamily: "IBM Plex Sans" }}>{stock.name}</span>
            <span style={{ fontSize: 10, color: "#64748b", fontFamily: "IBM Plex Mono" }}>{stock.nse}</span>
            <RecBadge rec={stock.recommendation} />
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, fontFamily: "IBM Plex Mono" }}>{stock.group} · {stock.industry}</div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#f1f5f9", fontFamily: "IBM Plex Mono" }}>₹{stock.cmp.toLocaleString("en-IN")}</div>
          {isBuy && <div style={{ fontSize: 10, color: "#64748b", fontFamily: "IBM Plex Mono" }}>Alloc: {stock.alloc_pct?.toFixed(1)}%</div>}
        </div>

        <span style={{ color: "#475569", fontSize: 14, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop: `1px solid ${cfg.border}20`, padding: "14px 16px" }}>
          {/* Score breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", marginBottom: 14 }}>
            {[["Technofunda", "tf_score", "tf"], ["Momentum", "mom_score", "mom"], ["Heikin Ashi", "ha_score", "ha"], ["Ichimoku", "ichi_score", "ichi"]].map(([label, key, k]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3, fontFamily: "IBM Plex Mono", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                <ScoreBar value={stock[key]} color={SCORE_COLORS[k]} />
              </div>
            ))}
          </div>

          {/* Metrics row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {[
              ["ROE 5Y", `${stock.roe5y}%`],
              ["ROCE 5Y", `${stock.roce5y}%`],
              ["D/E", stock.de],
              ["OPM", `${stock.opm}%`],
              ["PE", stock.pe],
              ["PEG", stock.peg],
              ["RSI", stock.rsi],
              ["52W H", `₹${stock.w52h?.toLocaleString("en-IN")}`],
              ["52W L", `₹${stock.w52l?.toLocaleString("en-IN")}`],
              ["From High", `-${pctFromH}%`],
              ["From Low", `+${pctFromL}%`],
            ].map(([l, v]) => (
              <div key={l} style={{ background: "#0f172a", padding: "4px 8px", borderRadius: 5, fontSize: 11, fontFamily: "IBM Plex Mono" }}>
                <span style={{ color: "#475569" }}>{l}: </span>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Entry / Target / SL */}
          {isBuy && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {[["ENTRY", stock.entry, "#22c55e"], ["TARGET +8%", stock.target, "#38bdf8"], ["STOP LOSS", stock.stop_loss, "#ef4444"], ["ETA", stock.eta, "#f59e0b"]].map(([l, v, c]) => (
                <div key={l} style={{ background: `${c}15`, border: `1px solid ${c}40`, borderRadius: 6, padding: "6px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#64748b", fontFamily: "IBM Plex Mono", letterSpacing: 1, marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c, fontFamily: "IBM Plex Mono" }}>{typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Catalyst & Risk */}
          <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "IBM Plex Sans", lineHeight: 1.6 }}>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>📌 Catalyst: </span>{stock.catalyst}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "IBM Plex Sans", lineHeight: 1.6, marginTop: 4 }}>
            <span style={{ color: "#f87171", fontWeight: 600 }}>⚠️ Risks: </span>{stock.risk_factors}
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "10px 16px", textAlign: "center", minWidth: 70 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "IBM Plex Mono" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("buy");
  const [lastChecked, setLastChecked] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/data.json?t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load data.json");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    loadData();

    // Auto-refresh: every 5 min between 8:00–9:30 AM IST, else every 30 min
    const interval = setInterval(() => {
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const h = ist.getHours(), m = ist.getMinutes();
      const inMorningWindow = h === 8 || (h === 9 && m <= 30);
      loadData(true);
    }, inMorningWindow() ? 5 * 60 * 1000 : 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadData]);

  function inMorningWindow() {
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const h = ist.getHours(), m = ist.getMinutes();
    return h === 8 || (h === 9 && m <= 30);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b", fontFamily: "IBM Plex Mono" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>⟳</div>
      <div>Loading market analysis…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#ef4444", fontFamily: "IBM Plex Mono", padding: 24 }}>
      <div style={{ fontSize: 24, marginBottom: 12 }}>⚠</div>
      <div style={{ marginBottom: 8 }}>{error}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20, textAlign: "center" }}>Make sure Cowork has generated data.json in the /public folder</div>
      <button onClick={() => loadData()} style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontFamily: "IBM Plex Mono" }}>Retry</button>
    </div>
  );

  const stocks = data?.stocks || [];
  const buys   = stocks.filter(s => s.recommendation === "BUY").sort((a, b) => b.total_score - a.total_score);
  const holds  = stocks.filter(s => s.recommendation === "HOLD").sort((a, b) => b.total_score - a.total_score);
  const waits  = stocks.filter(s => s.recommendation === "WAIT").sort((a, b) => b.total_score - a.total_score);
  const sells  = stocks.filter(s => s.recommendation === "SELL").sort((a, b) => a.total_score - b.total_score);
  const genTime = data?.generated_at ? new Date(data.generated_at) : null;
  const sentimentColor = data?.sentiment === "Bullish" ? "#22c55e" : data?.sentiment === "Bearish" ? "#ef4444" : "#f59e0b";
  const TABS = [
    { id: "buy",  label: `Buy`,  count: buys.length,  color: "#22c55e" },
    { id: "sell", label: `Sell`, count: sells.length, color: "#ef4444" },
    { id: "hold", label: `Hold`, count: holds.length, color: "#f59e0b" },
    { id: "wait", label: `Wait`, count: waits.length, color: "#6366f1" },
    { id: "all",  label: `All`,  count: stocks.length, color: "#94a3b8" },
  ];
  const tabStocks = { buy: buys, sell: sells, hold: holds, wait: waits, all: stocks }[tab] || [];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "IBM Plex Sans" }}>

      {/* Top bar */}
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "IBM Plex Mono", fontWeight: 700, fontSize: 16, color: "#38bdf8", letterSpacing: 2 }}>STOCK SCREENER</div>
          <div style={{ fontSize: 10, color: "#475569", fontFamily: "IBM Plex Mono", marginTop: 1 }}>
            {genTime ? `Updated ${genTime.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })} at ${genTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST` : "No data loaded"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {data?.nifty50 && (
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "6px 12px", fontFamily: "IBM Plex Mono", fontSize: 12 }}>
              <span style={{ color: "#475569" }}>Nifty </span>
              <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{data.nifty50.toLocaleString("en-IN")}</span>
            </div>
          )}
          {data?.sentiment && (
            <div style={{ background: "#1e293b", border: `1px solid ${sentimentColor}40`, borderRadius: 6, padding: "6px 12px", fontFamily: "IBM Plex Mono", fontSize: 12 }}>
              <span style={{ color: sentimentColor, fontWeight: 700 }}>{data.sentiment}</span>
            </div>
          )}
          <button onClick={() => loadData()} title="Refresh data" style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "6px 10px", cursor: "pointer", color: "#64748b", fontSize: 16, lineHeight: 1, fontFamily: "IBM Plex Mono" }}>⟳</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 40px" }}>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <StatPill label="Screened" value={data?.total_screened ?? stocks.length} color="#94a3b8" />
          <StatPill label="Buy" value={buys.length} color="#22c55e" />
          <StatPill label="Hold" value={holds.length} color="#f59e0b" />
          <StatPill label="Wait" value={waits.length} color="#6366f1" />
          <StatPill label="Sell" value={sells.length} color="#ef4444" />
        </div>

        {/* Allocation bar — BUY only */}
        {buys.length > 0 && tab === "buy" && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontFamily: "IBM Plex Mono", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>₹100 Portfolio Allocation</div>
            <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden", gap: 1 }}>
              {buys.map((s, i) => {
                const hues = ["#22c55e","#16a34a","#15803d","#166534","#14532d","#38bdf8","#0ea5e9","#0284c7","#0369a1","#6366f1","#4f46e5","#4338ca"];
                return (
                  <div key={s.nse} style={{ flex: s.alloc_pct, background: hues[i % hues.length], position: "relative" }} title={`${s.name}: ${s.alloc_pct?.toFixed(1)}%`} />
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {buys.map((s, i) => {
                const hues = ["#22c55e","#16a34a","#15803d","#166534","#14532d","#38bdf8","#0ea5e9","#0284c7","#0369a1","#6366f1","#4f46e5","#4338ca"];
                return (
                  <div key={s.nse} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "IBM Plex Mono" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: hues[i % hues.length] }} />
                    <span style={{ color: "#94a3b8" }}>{s.name}</span>
                    <span style={{ color: hues[i % hues.length], fontWeight: 700 }}>{s.alloc_pct?.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #1e293b", paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? "#1e293b" : "transparent",
              border: "none", borderBottom: tab === t.id ? `2px solid ${t.color}` : "2px solid transparent",
              color: tab === t.id ? t.color : "#475569",
              padding: "8px 14px", cursor: "pointer", fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 700,
              transition: "all 0.15s", marginBottom: -1
            }}>
              {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
            </button>
          ))}
        </div>

        {/* Stock list */}
        {tabStocks.length === 0
          ? <div style={{ textAlign: "center", color: "#475569", padding: "40px 0", fontFamily: "IBM Plex Mono" }}>No stocks in this category today</div>
          : tabStocks.map((s, i) => (
              <StockCard key={s.nse} stock={s} rank={tab === "buy" ? i + 1 : null} />
            ))
        }

        {/* Last checked */}
        {lastChecked && (
          <div style={{ textAlign: "center", fontSize: 11, color: "#334155", fontFamily: "IBM Plex Mono", marginTop: 20 }}>
            Last checked {lastChecked.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST · Auto-refreshes every {inMorningWindow() ? "5 min" : "30 min"}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginTop: 24, padding: "12px 16px", background: "#1e293b", borderRadius: 8, fontSize: 10, color: "#475569", lineHeight: 1.6, fontFamily: "IBM Plex Sans" }}>
          <strong style={{ color: "#64748b" }}>⚠️ SEBI DISCLAIMER:</strong> This dashboard is for educational and informational purposes only. It does not constitute investment advice or a recommendation to buy/sell/hold any security. Not a SEBI-registered investment advisor. Past performance is not indicative of future results. Consult a qualified financial advisor before trading.
        </div>
      </div>
    </div>
  );
}
