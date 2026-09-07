# Building Real Wealth — Companion

A privacy-first, offline-capable personal finance workbook companion (net worth, cash flow, allocation, contributions, goals, and 12-month action plan).

Built with **Vite + vanilla JavaScript**. Fully static — no backend, no accounts, data stays in your browser’s `localStorage`.

## Quick start (any modern builder)

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (hot reload)
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Production build

```bash
npm run build
```

The optimized static site is written to the `dist/` folder.  
You can host it on any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, etc.) or open `dist/index.html` directly.

Preview the production build locally:

```bash
npm run preview
```

## Project structure

```
brw-companion/
├── index.html          # Entry HTML
├── package.json
├── vite.config.js
├── public/             # Static assets (optional)
└── src/
    ├── main.js         # App entry + all UI logic
    ├── style.css       # Full design system
    ├── data.js         # Constants, defaults, deepMerge
    ├── storage.js      # localStorage persistence
    ├── helpers.js      # Formatting helpers
    └── charts.js       # SVG line / bar / donut charts
```

## Features

- **Home** – savings rate, allocation drift, next action-plan step, net-worth trend
- **Net Worth** – snapshot history + chart (Worksheet 1.1 / Appendix E)
- **Cash Flow** – monthly available-to-invest log + bar chart (Worksheet 1.2)
- **Invest** – risk quiz → suggested allocation, target vs current, rebalancing gaps, quarterly reviews
- **Plan** – 2026 contribution tracker (401k / IRA / HSA), retirement + other goals, 12-month checklist

All data is saved automatically to `localStorage` under the key `brw-companion-v1`.

## 2026 IRS limits used

| Account              | Limit   |
|----------------------|---------|
| 401(k) / 403(b)      | $24,500 |
| IRA (Trad + Roth)    | $7,500  |
| HSA (self-only)      | $4,400  |

Update the numbers in `src/data.js` → `DEFAULT_DATA.contributions` when limits change.

## License

Educational companion. Not financial advice. Verify all limits and rules with a fiduciary / CPA / the IRS.
