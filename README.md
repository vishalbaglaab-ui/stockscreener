# Stock Screener Dashboard

A daily stock analysis dashboard that reads from `public/data.json`, auto-refreshing every 5 min between 8–9:30 AM IST and every 30 min otherwise.

---

## Local Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → /dist
```

---

## Deploy to Vercel (one-time, ~5 minutes)

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/YOUR_USERNAME/stock-screener.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → Import Project → select the repo
3. Framework: **Vite**. Build command: `npm run build`. Output dir: `dist`
4. Deploy → you get a URL like `https://stock-screener-xyz.vercel.app`

Every time Cowork pushes a new `public/data.json` to GitHub, Vercel auto-redeploys in ~30 seconds.

---

## How Cowork Updates the Data

Add this to the end of your Cowork scheduling prompt:

```
After saving results/YYYY-MM-DD_analysis.md, also save a file called
public/data.json in the stock-screener GitHub repo folder with the
following structure: [paste the data.json schema from this repo].
Then run:
  cd ~/Documents/stock-screener
  git add public/data.json
  git commit -m "Daily analysis $(date +%Y-%m-%d)"
  git push
```

Vercel picks up the push automatically and redeploys within ~30 seconds.

---

## data.json Schema

```json
{
  "generated_at": "2026-04-18T08:05:00+05:30",
  "nifty50": 24353,
  "sentiment": "Bullish",
  "total_screened": 500,
  "summary": { "buy": 42, "hold": 95, "wait": 180, "sell": 183 },
  "stocks": [
    {
      "name": "Stock Name",
      "nse": "NSECODE",
      "group": "Industry Group",
      "industry": "Sub-Industry",
      "cmp": 1000,
      "w52h": 1200,
      "w52l": 700,
      "roe5y": 25.0,
      "roce5y": 30.0,
      "de": 0.1,
      "opm": 40.0,
      "pe": 30.0,
      "peg": 1.5,
      "fcf": 500,
      "mcap": 10000,
      "pledged": 0,
      "rsi": 65,
      "macd": "bull",
      "dma20": 980,
      "dma50": 950,
      "dma200": 880,
      "volume": "above",
      "ha_trend": "bull",
      "ichi_signal": "bull",
      "tf_score": 22,
      "mom_score": 20,
      "ha_score": 25,
      "ichi_score": 25,
      "risk_adj": 0,
      "total_score": 92,
      "recommendation": "BUY",
      "entry": 960,
      "target": 1080,
      "stop_loss": 912,
      "eta": "1-2W",
      "alloc_pct": 8.5,
      "catalyst": "Near 52W high, strong momentum",
      "risk_factors": "High PE, sector headwinds"
    }
  ]
}
```

---

## Dashboard Features

- **Buy tab** — ranked by score, with allocation bar and full score breakdown
- **Sell tab** — stocks to exit, sorted weakest first
- **Hold / Wait tabs** — monitoring list
- **All tab** — full universe
- **Auto-refresh** — every 5 min during 8–9:30 AM IST, every 30 min otherwise
- **Manual refresh** — ⟳ button top right
- Click any stock to expand full analysis (4 scores, entry/target/SL, catalyst, risks)
