import { useState, useEffect, useCallback } from "react";

const SC = { tf: "#7c3aed", mom: "#db2777", ha: "#059669", ichi: "#b45309" };

const ALLOC_COLORS = [
  "#166534","#15803d","#16a34a","#22c55e",
  "#1d4ed8","#2563eb","#9333ea","#7c3aed",
  "#b45309","#d97706","#0369a1","#0284c7",
];

function computeScore(s) {
  let tf = 0;
  if (s.roe5y >= 25) tf += 5; else if (s.roe5y >= 18) tf += 3; else tf += 1;
  if (s.roce5y >= 30) tf += 5; else if (s.roce5y >= 20) tf += 3; else tf += 1;
  if (s.de <= 0.1) tf += 5; else if (s.de <= 0.5) tf += 3; else tf += 1;
  if (s.opm >= 40) tf += 5; else if (s.opm >= 20) tf += 3; else tf += 1;
  if (s.peg <= 1) tf += 5; else if (s.peg <= 2) tf += 3; else tf += 1;

  let mom = 0;
  if (s.cmp && s.w52h && s.w52l) {
    const pH = ((s.w52h - s.cmp) / s.w52h) * 100;
    const pL = ((s.cmp - s.w52l) / s.w52l) * 100;
    if (pH <= 10) mom += 5; else if (pH <= 25) mom += 3; else mom += 1;
    if (pL >= 50) mom += 5; else if (pL >= 20) mom += 3; else mom += 1;
  }
  if (s.rsi >= 55 && s.rsi <= 75) mom += 5; else if (s.rsi >= 45) mom += 3; else mom += 1;
  if (s.cmp > s.dma50 && s.cmp > s.dma200) mom += 5; else if (s.cmp > s.dma200) mom += 3; else mom += 1;
  if (s.volume === "high" || s.volume === "above") mom += 5; else if (s.volume === "normal") mom += 3; else mom += 1;

  let ha = 0;
  if (s.ha_trend === "bull") ha = 20; else if (s.ha_trend === "neutral") ha = 12; else ha = 4;
  if (s.rsi > 60) ha += 5; else if (s.rsi > 45) ha += 3; else ha += 1;

  let ichi = 0;
  if (s.ichi_signal === "bull") ichi = 20; else if (s.ichi_signal === "neutral") ichi = 12; else ichi = 4;
  if (s.cmp > s.dma200) ichi += 5; else if (s.cmp > s.dma50) ichi += 3; else ichi += 1;

  let adj = 0;
  if (s.pledged > 5) adj -= 5;
  if (s.mcap < 2000) adj -= 3;
  if (s.pe > 70) adj -= 3;
  if (s.fcf < 0) adj -= 2;

  const useTf   = s.tf_score   ?? tf;
  const useMom  = s.mom_score  ?? mom;
  const useHa   = s.ha_score   ?? ha;
  const useIchi = s.ichi_score ?? ichi;
  const useAdj  = s.risk_adj   ?? adj;
  const total   = s.total_score ?? Math.max(0, Math.min(100, useTf + useMom + useHa + useIchi + useAdj));

  let rec = s.recommendation;
  if (!rec) {
    if (total >= 60) rec = "BUY";
    else if (total >= 50) rec = "HOLD";
    else if (total >= 40) rec = "WAIT";
    else rec = "SELL";
  }

  const entry     = s.entry     ?? Math.round((s.dma20 ?? s.cmp * 0.98) * 0.98);
  const target    = s.target    ?? Math.round(s.cmp * 1.08);
  const stop_loss = s.stop_loss ?? Math.round((s.dma50 ?? s.cmp * 0.96) * 0.96);
  const eta       = s.eta       ?? (total >= 75 ? "1–2W" : total >= 65 ? "2–3W" : total >= 55 ? "3–4W" : "4W+");

  return { tf: useTf, mom: useMom, ha: useHa, ichi: useIchi, total, rec, entry, target, stop_loss, eta };
}

const fmt = n => typeof n === "number" ? n.toLocaleString("en-IN") : (n ?? "—");

function ScorePill({ score }) {
  const color  = score >= 70 ? "#15803d" : score >= 50 ? "#b45309" : score >= 40 ? "#4338ca" : "#b91c1c";
  const bg     = score >= 70 ? "#f0fdf4" : score >= 50 ? "#fffbeb" : score >= 40 ? "#eef2ff" : "#fff1f2";
  const border = score >= 70 ? "#bbf7d0" : score >= 50 ? "#fde68a" : score >= 40 ? "#c7d2fe" : "#fecaca";
  return (
    <div style={{ background: bg, color, border: `0.5px solid ${border}`, borderRadius: 8, padding: "6px 10px", textAlign: "center", flexShrink: 0, minWidth: 48 }}>
      <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>/100</div>
    </div>
  );
}

function RecBadge({ rec }) {
  const map = { BUY: ["#dcfce7","#15803d"], SELL: ["#fee2e2","#b91c1c"], HOLD: ["#fef3c7","#b45309"], WAIT: ["#e0e7ff","#4338ca"] };
  const [bg, color] = map[rec] || map.WAIT;
  return <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 500, letterSpacing: "0.5px" }}>{rec}</span>;
}

function MiniBar({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${(value / 25) * 100}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color, minWidth: 18, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function EntryBox({ label, value, scheme }) {
  const schemes = {
    buy:   ["#f0fdf4","#15803d","#bbf7d0"],
    tgt:   ["#eff6ff","#1d4ed8","#bfdbfe"],
    sl:    ["#fff1f2","#be123c","#fecdd3"],
    eta:   ["#f5f3ff","#5b21b6","#ddd6fe"],
    alloc: ["#f9fafb","#374151","#e5e7eb"],
  };
  const [bg, color, border] = schemes[scheme] || schemes.alloc;
  return (
    <div style={{ background: bg, color, border: `0.5px solid ${border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center", flex: 1, minWidth: 70 }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500 }}>{typeof value === "number" ? `₹${fmt(value)}` : value}</div>
    </div>
  );
}

function StockCard({ stock, sc, rank, allocPct, expanded, onToggle }) {
  const isBuy = sc.rec === "BUY";
  const leftColor = { BUY: "#16a34a", SELL: "#dc2626", HOLD: "#d97706", WAIT: "#6366f1" }[sc.rec] || "#e5e7eb";
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderLeft: `3px solid ${leftColor}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} onClick={onToggle}>
        <ScorePill score={sc.total} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {rank && <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>#{rank}</span>}
            <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{stock.name}</span>
            <RecBadge rec={sc.rec} />
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{stock.nse} · {stock.group} · {stock.industry}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
            {[["TF", sc.tf, SC.tf], ["MOM", sc.mom, SC.mom], ["HA", sc.ha, SC.ha], ["ICHI", sc.ichi, SC.ichi]].map(([l, v, c]) => (
              <span key={l} style={{ fontSize: 10, color: c, fontWeight: 500 }}>{l} {v}</span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>₹{fmt(stock.cmp)}</div>
          {isBuy && <div style={{ fontSize: 10, color: "#9ca3af" }}>T: ₹{fmt(sc.target)} · {allocPct}%</div>}
          {stock.ret1y != null && (
            <div style={{ fontSize: 10, color: stock.ret1y >= 0 ? "#15803d" : "#b91c1c" }}>
              {stock.ret1y >= 0 ? "+" : ""}{stock.ret1y}% 1Y
            </div>
          )}
        </div>
        <span style={{ fontSize: 10, color: "#d1d5db", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: "0.5px solid #f3f4f6", padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Score breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[["Technofunda", sc.tf, SC.tf], ["Momentum", sc.mom, SC.mom], ["Heikin Ashi", sc.ha, SC.ha], ["Ichimoku", sc.ichi, SC.ichi]].map(([l, v, c]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: c, fontWeight: 500, width: 84, flexShrink: 0 }}>{l}</span>
                    <MiniBar value={v} color={c} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Fundamentals</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#6b7280" }}>
                <div>ROE 5Y: <b style={{ color: "#111827" }}>{stock.roe5y}%</b> &nbsp; ROCE: <b style={{ color: "#111827" }}>{stock.roce5y}%</b></div>
                <div>D/E: <b style={{ color: "#111827" }}>{stock.de}</b> &nbsp; OPM: <b style={{ color: "#111827" }}>{stock.opm}%</b></div>
                <div>PE: <b style={{ color: "#111827" }}>{stock.pe}</b> &nbsp; PEG: <b style={{ color: "#111827" }}>{stock.peg}</b></div>
                <div>FCF 3Y: <b style={{ color: "#111827" }}>₹{fmt(stock.fcf)} Cr</b></div>
                <div>MCap: <b style={{ color: "#111827" }}>₹{fmt(Math.round(stock.mcap))} Cr</b></div>
              </div>
            </div>
          </div>

          {isBuy && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <EntryBox label="Entry"      value={sc.entry}     scheme="buy" />
              <EntryBox label="Target +8%" value={sc.target}    scheme="tgt" />
              <EntryBox label="Stop loss"  value={sc.stop_loss} scheme="sl" />
              <EntryBox label="ETA"        value={sc.eta}       scheme="eta" />
              {allocPct && <EntryBox label="Allocation" value={`${allocPct}%`} scheme="alloc" />}
            </div>
          )}

          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, marginBottom: 6 }}>
            <span style={{ fontWeight: 500, color: "#374151" }}>Catalyst: </span>{stock.catalyst}
          </div>
          {stock.risk_factors && (
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, marginBottom: 6 }}>
              <span style={{ fontWeight: 500, color: "#b91c1c" }}>Risks: </span>{stock.risk_factors}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
            52W H ₹{fmt(stock.w52h)} · 52W L ₹{fmt(stock.w52l)} · RSI {stock.rsi} · Vol {stock.volume} · HA {stock.ha_trend} · Ichi {stock.ichi_signal}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTable({ buys, totalBuyScore }) {
  const thStyle = (color) => ({
    textAlign: "left", padding: "9px 8px", fontSize: 11, fontWeight: 500,
    color: color || "#9ca3af", whiteSpace: "nowrap",
    background: "#fafafa", borderBottom: "0.5px solid #e5e7eb",
  });
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "14px 16px 10px", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1px", color: "#9ca3af", borderBottom: "0.5px solid #f3f4f6" }}>
        Top buy recommendations
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thStyle()}>#</th>
              <th style={thStyle()}>Stock</th>
              <th style={thStyle()}>CMP</th>
              <th style={thStyle(SC.tf)}>TF</th>
              <th style={thStyle(SC.mom)}>MOM</th>
              <th style={thStyle(SC.ha)}>HA</th>
              <th style={thStyle(SC.ichi)}>ICHI</th>
              <th style={thStyle()}>Total</th>
              <th style={thStyle()}>Entry</th>
              <th style={thStyle()}>Target</th>
              <th style={thStyle()}>SL</th>
              <th style={thStyle()}>ETA</th>
              <th style={thStyle()}>Alloc %</th>
            </tr>
          </thead>
          <tbody>
            {buys.map((s, i) => {
              const alloc = totalBuyScore > 0 ? ((s.sc.total / totalBuyScore) * 100).toFixed(1) : 0;
              const scoreColor = s.sc.total >= 75 ? "#15803d" : "#b45309";
              const scoreBg    = s.sc.total >= 75 ? "#f0fdf4" : "#fffbeb";
              return (
                <tr key={s.nse} style={{ borderBottom: "0.5px solid #f3f4f6" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "9px 8px", fontWeight: 500, color: "#9ca3af" }}>{i + 1}</td>
                  <td style={{ padding: "9px 8px" }}>
                    <div style={{ fontWeight: 500, color: "#111827" }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{s.group}</div>
                  </td>
                  <td style={{ padding: "9px 8px", fontWeight: 500, whiteSpace: "nowrap" }}>₹{fmt(s.cmp)}</td>
                  <td style={{ padding: "9px 8px", color: SC.tf,   fontWeight: 500 }}>{s.sc.tf}</td>
                  <td style={{ padding: "9px 8px", color: SC.mom,  fontWeight: 500 }}>{s.sc.mom}</td>
                  <td style={{ padding: "9px 8px", color: SC.ha,   fontWeight: 500 }}>{s.sc.ha}</td>
                  <td style={{ padding: "9px 8px", color: SC.ichi, fontWeight: 500 }}>{s.sc.ichi}</td>
                  <td style={{ padding: "9px 8px" }}>
                    <span style={{ background: scoreBg, color: scoreColor, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{s.sc.total}</span>
                  </td>
                  <td style={{ padding: "9px 8px", fontSize: 11, color: "#15803d", whiteSpace: "nowrap" }}>₹{fmt(s.sc.entry)}</td>
                  <td style={{ padding: "9px 8px", fontSize: 11, color: "#1d4ed8", whiteSpace: "nowrap" }}>₹{fmt(s.sc.target)}</td>
                  <td style={{ padding: "9px 8px", fontSize: 11, color: "#b91c1c", whiteSpace: "nowrap" }}>₹{fmt(s.sc.stop_loss)}</td>
                  <td style={{ padding: "9px 8px", fontSize: 11, color: "#6b7280" }}>{s.sc.eta}</td>
                  <td style={{ padding: "9px 8px", fontWeight: 500, color: "#1d4ed8" }}>{alloc}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllTable({ rows, totalBuyScore }) {
  const thStyle = (color) => ({
    textAlign: "left", padding: "9px 8px", fontSize: 11, fontWeight: 500,
    color: color || "#9ca3af", whiteSpace: "nowrap",
    background: "#fafafa", borderBottom: "0.5px solid #e5e7eb", position: "sticky", top: 0,
  });
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thStyle()}>Stock</th>
              <th style={thStyle()}>CMP</th>
              <th style={thStyle(SC.tf)}>TF</th>
              <th style={thStyle(SC.mom)}>MOM</th>
              <th style={thStyle(SC.ha)}>HA</th>
              <th style={thStyle(SC.ichi)}>ICHI</th>
              <th style={thStyle()}>Total</th>
              <th style={thStyle()}>Signal</th>
              <th style={thStyle()}>Entry</th>
              <th style={thStyle()}>Target</th>
              <th style={thStyle()}>SL</th>
              <th style={thStyle()}>ETA</th>
              <th style={thStyle()}>Alloc %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => {
              const isBuy = s.sc.rec === "BUY";
              const alloc = isBuy && totalBuyScore > 0 ? ((s.sc.total / totalBuyScore) * 100).toFixed(1) + "%" : "—";
              const barColor = s.sc.total >= 60 ? "#16a34a" : s.sc.total >= 40 ? "#d97706" : "#dc2626";
              return (
                <tr key={s.nse} style={{ borderBottom: "0.5px solid #f3f4f6" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "9px 8px" }}>
                    <div style={{ fontWeight: 500, color: "#111827" }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{s.nse} · {s.industry}</div>
                  </td>
                  <td style={{ padding: "9px 8px", fontWeight: 500, whiteSpace: "nowrap" }}>₹{fmt(s.cmp)}</td>
                  <td style={{ padding: "9px 8px", color: SC.tf,   fontWeight: 500 }}>{s.sc.tf}</td>
                  <td style={{ padding: "9px 8px", color: SC.mom,  fontWeight: 500 }}>{s.sc.mom}</td>
                  <td style={{ padding: "9px 8px", color: SC.ha,   fontWeight: 500 }}>{s.sc.ha}</td>
                  <td style={{ padding: "9px 8px", color: SC.ichi, fontWeight: 500 }}>{s.sc.ichi}</td>
                  <td style={{ padding: "9px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 40, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${s.sc.total}%`, height: "100%", background: barColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{s.sc.total}</span>
                    </div>
                  </td>
                  <td style={{ padding: "9px 8px" }}><RecBadge rec={s.sc.rec} /></td>
                  <td style={{ padding: "9px 8px", fontSize: 11, color: "#15803d", whiteSpace: "nowrap" }}>{isBuy ? `₹${fmt(s.sc.entry)}` : "—"}</td>
                  <td style={{ padding: "9px 8px", fontSize: 11, color: "#1d4ed8", whiteSpace: "nowrap" }}>{isBuy ? `₹${fmt(s.sc.target)}` : "—"}</td>
                  <td style={{ padding: "9px 8px", fontSize: 11, color: "#b91c1c", whiteSpace: "nowrap" }}>{isBuy ? `₹${fmt(s.sc.stop_loss)}` : "—"}</td>
                  <td style={{ padding: "9px 8px", fontSize: 11 }}>{isBuy ? s.sc.eta : "—"}</td>
                  <td style={{ padding: "9px 8px", fontSize: 11, fontWeight: 500, color: "#1d4ed8" }}>{alloc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [rawData, setRawData]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [tab, setTab]           = useState("summary");
  const [expanded, setExpanded] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/data.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRawData(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }, []);

  useEffect(() => {
    loadData();
    const getInterval = () => {
      const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const h = ist.getHours(), m = ist.getMinutes();
      return (h === 8 || (h === 9 && m <= 30)) ? 5 * 60 * 1000 : 30 * 60 * 1000;
    };
    const id = setInterval(() => loadData(true), getInterval());
    return () => clearInterval(id);
  }, [loadData]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#9ca3af", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 22 }}>⟳</div>
      <div style={{ fontSize: 13 }}>Loading analysis…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 22, color: "#dc2626" }}>⚠</div>
      <div style={{ fontSize: 14, color: "#374151" }}>Could not load data.json</div>
      <div style={{ fontSize: 12, color: "#9ca3af", maxWidth: 340 }}>Make sure Cowork has pushed data.json to /public in your GitHub repo.</div>
      <button onClick={() => loadData()} style={{ marginTop: 8, padding: "8px 20px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Retry</button>
    </div>
  );

  const stocks = (rawData?.stocks || []).map(s => ({ ...s, sc: computeScore(s) })).sort((a, b) => b.sc.total - a.sc.total);
  const buys   = stocks.filter(s => s.sc.rec === "BUY");
  const holds  = stocks.filter(s => s.sc.rec === "HOLD");
  const waits  = stocks.filter(s => s.sc.rec === "WAIT");
  const sells  = stocks.filter(s => s.sc.rec === "SELL");
  const totalBuyScore = buys.reduce((a, b) => a + b.sc.total, 0);

  const genTime  = rawData?.generated_at ? new Date(rawData.generated_at) : null;
  const genStr   = genTime ? genTime.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" }) + " at " + genTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) + " IST" : null;
  const sentMap  = { Bullish: ["#f0fdf4","#15803d"], Bearish: ["#fff1f2","#b91c1c"], Neutral: ["#fffbeb","#b45309"] };
  const [sentBg, sentColor] = sentMap[rawData?.sentiment] || sentMap.Neutral;

  const TABS = [
    { id: "summary", label: "Summary" },
    { id: "buy",     label: `Buy (${buys.length})` },
    { id: "sell",    label: `Sell (${sells.length})` },
    { id: "all",     label: `All (${stocks.length})` },
  ];

  const toggleExpand = (nse) => setExpanded(prev => prev === nse ? null : nse);
  const changeTab    = (t)   => { setTab(t); setExpanded(null); };

  const sectionHead = (label) => (
    <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1px", color: "#9ca3af", margin: "20px 0 10px", paddingBottom: 8, borderBottom: "0.5px solid #e5e7eb" }}>{label}</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Topbar */}
      <div style={{ background: "#fff", borderBottom: "0.5px solid #e5e7eb", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>Stock Screener</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            {genStr ? `Updated ${genStr}` : "Awaiting daily run"} · 4-week horizon · 6–12% target
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {rawData?.nifty50 && <span style={{ fontSize: 12, padding: "4px 12px", background: "#f3f4f6", borderRadius: 20, color: "#374151" }}>Nifty {rawData.nifty50.toLocaleString("en-IN")}</span>}
          {rawData?.sentiment && <span style={{ fontSize: 12, padding: "4px 12px", background: sentBg, borderRadius: 20, color: sentColor, fontWeight: 500 }}>{rawData.sentiment}</span>}
          <button onClick={() => loadData()} style={{ fontSize: 16, padding: "4px 10px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", color: "#6b7280", lineHeight: 1 }} title="Refresh">⟳</button>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "16px 12px 48px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[["Buy", buys.length, "#15803d"], ["Hold", holds.length, "#b45309"], ["Wait", waits.length, "#4338ca"], ["Sell", sells.length, "#b91c1c"]].map(([l, v, c]) => (
            <div key={l} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 500, color: c }}>{v}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, borderBottom: "0.5px solid #e5e7eb", marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => changeTab(t.id)} style={{
              padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#111827" : "transparent"}`,
              color: tab === t.id ? "#111827" : "#9ca3af", marginBottom: -0.5, whiteSpace: "nowrap"
            }}>{t.label}</button>
          ))}
        </div>

        {/* Summary */}
        {tab === "summary" && (
          <>
            {buys.length > 0 && (
              <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "1px", color: "#9ca3af", marginBottom: 12 }}>Portfolio allocation (₹100 basis)</div>
                <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 1, marginBottom: 12 }}>
                  {buys.map((s, i) => (
                    <div key={s.nse} style={{ flex: s.sc.total, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} title={`${s.name}: ${((s.sc.total / totalBuyScore) * 100).toFixed(1)}%`} />
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {buys.map((s, i) => (
                    <div key={s.nse} style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: ALLOC_COLORS[i % ALLOC_COLORS.length], marginTop: 3, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{s.name}</div>
                        <div style={{ fontSize: 11, fontWeight: 500 }}>{((s.sc.total / totalBuyScore) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <SummaryTable buys={buys} totalBuyScore={totalBuyScore} />
            {sells.length > 0 && <>{sectionHead("Sell / exit signals")}{sells.map(s => <StockCard key={s.nse} stock={s} sc={s.sc} rank={null} allocPct={null} expanded={expanded === s.nse} onToggle={() => toggleExpand(s.nse)} />)}</>}
          </>
        )}

        {/* Buy */}
        {tab === "buy" && (
          <>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Sorted by composite score. Entry = 2% below 20 DMA. Target = 8% from CMP. SL = 4% below 50 DMA. Tap to expand.</div>
            {buys.map((s, i) => <StockCard key={s.nse} stock={s} sc={s.sc} rank={i + 1} allocPct={totalBuyScore > 0 ? ((s.sc.total / totalBuyScore) * 100).toFixed(1) : null} expanded={expanded === s.nse} onToggle={() => toggleExpand(s.nse)} />)}
          </>
        )}

        {/* Sell */}
        {tab === "sell" && (
          <>
            {sells.length > 0 && <>{sectionHead("Sell / exit signals")}{sells.map(s => <StockCard key={s.nse} stock={s} sc={s.sc} rank={null} allocPct={null} expanded={expanded === s.nse} onToggle={() => toggleExpand(s.nse)} />)}</>}
            {waits.length > 0 && <>{sectionHead("Wait — monitor, no action")}{waits.map(s => <StockCard key={s.nse} stock={s} sc={s.sc} rank={null} allocPct={null} expanded={expanded === s.nse} onToggle={() => toggleExpand(s.nse)} />)}</>}
            {holds.length > 0 && <>{sectionHead("Hold — stay invested")}{holds.map(s => <StockCard key={s.nse} stock={s} sc={s.sc} rank={null} allocPct={null} expanded={expanded === s.nse} onToggle={() => toggleExpand(s.nse)} />)}</>}
          </>
        )}

        {/* All */}
        {tab === "all" && <AllTable rows={stocks} totalBuyScore={totalBuyScore} />}

        {lastFetch && (
          <div style={{ textAlign: "center", fontSize: 11, color: "#d1d5db", marginTop: 20 }}>
            Last checked {lastFetch.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST
          </div>
        )}

        <div style={{ marginTop: 24, padding: "12px 16px", background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 8, fontSize: 11, color: "#9ca3af", lineHeight: 1.6 }}>
          <strong style={{ color: "#6b7280" }}>SEBI disclaimer:</strong> This dashboard is for educational purposes only. Not investment advice. Not a SEBI-registered advisor. Consult a qualified financial advisor before trading.
        </div>
      </div>
    </div>
  );
}
