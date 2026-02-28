# FinSim — Financial Planning Simulators

A collection of interactive, browser-based financial planning calculators. No sign-up, no server, no build step — everything runs locally in your browser.

**[Live Demo →](https://shravank.github.io/Financial-Planning-Simulators/)**

---

## Calculators

| Calculator | Description |
|---|---|
| **SIP** | Estimate future value of monthly Systematic Investment Plan contributions |
| **Step-up SIP** | Model how increasing your SIP each year accelerates wealth creation |
| **Lumpsum** | Project the growth of a one-time investment over a chosen horizon |

More calculators coming soon (Goal Planner, EMI, Retirement Planner…).

---

## Features

- **Real-time updates** — results and charts update instantly as you adjust sliders
- **Interactive charts** — donut, bar, and line charts powered by Chart.js
- **Dark / Light theme** — persisted across pages via `localStorage`
- **Indian number formatting** — values displayed in ₹ Lakh / Crore notation
- **Year-by-year breakdown** — scrollable table for every calculator
- **100% private** — no data ever leaves your device

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI | Vanilla HTML + CSS (CSS custom properties, Grid, Flexbox) |
| Charts | [Chart.js v4.4.0](https://www.chartjs.org/) (bundled locally) |
| Fonts | Inter via Google Fonts |
| Hosting | GitHub Pages (static, no build step) |

---

## Project Structure

```
/
├── index.html                  # Landing page — calculator card grid
├── css/
│   └── main.css                # Design system: tokens, layout, components
├── js/
│   ├── main.js                 # Shared utilities: theme, formatINR, bindSlider
│   ├── chart.umd.min.js        # Chart.js (local copy, no CDN dependency)
│   ├── sip.js                  # SIP calculator logic
│   ├── stepup-sip.js           # Step-up SIP calculator logic
│   └── lumpsum.js              # Lumpsum calculator logic
└── calculators/
    ├── sip.html
    ├── stepup-sip.html
    └── lumpsum.html
```

---

## Running Locally

No build step required. Just serve the files with any static server:

```bash
# Using npx serve (Node.js)
npx serve .

# Using Python
python3 -m http.server 8080

# Using VS Code
# Install the "Live Server" extension and click "Go Live"
```

Then open `http://localhost:3000` (or whichever port your server uses).

---

## Deploying to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to `Deploy from a branch` → `main` → `/ (root)`
4. Click **Save** — your site will be live at `https://<username>.github.io/<repo-name>/`

---

## Adding a New Calculator

1. Create `calculators/your-calc.html` — copy an existing calculator page as a template
2. Create `js/your-calc.js` — wrap all logic in an IIFE:
   ```js
   (function () {
     const { formatINR, formatPct, bindSlider } = window.FinSim;
     // ... your logic ...
     document.addEventListener('DOMContentLoaded', () => {
       // bind sliders and call update()
     });
   }());
   ```
3. Add `<script defer src="../js/your-calc.js"></script>` in the `<head>` of your HTML
4. Add a card for it in `index.html`

### Key patterns to follow

- **Script loading** — use `defer` on all external scripts in `<head>`; `DOMContentLoaded` fires reliably after all deferred scripts execute
- **Chart canvas sizing** — always wrap `<canvas>` in a `position:relative` div with an explicit `height`, and set `maintainAspectRatio: false` in chart options to prevent canvas width explosion
- **IIFE isolation** — calculator JS files must be IIFEs to avoid `SyntaxError: Identifier already declared` conflicts with `main.js` globals

---

## License

MIT — free to use, modify, and distribute.
