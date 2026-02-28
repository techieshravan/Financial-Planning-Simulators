// ── SIP Wealth Planner Logic ───────────────────────────────
(function () {
const { formatINR, formatPct, bindSlider } = window.FinSim;

let lineChart;

// ── State ─────────────────────────────────────────────────
let portfolio = 100000, monthly = 5000, stepup = 10, rate = 12, years = 15;
let activeCompareRates = new Set([0, 20]);

// ── Constants ─────────────────────────────────────────────
const COMPARE_RATES = [0, 5, 10, 15, 20, 25];

const RATE_COLORS = {
  0:  { b: '#10b981', bg: 'rgba(16,185,129,0.06)' },
  5:  { b: '#06b6d4', bg: 'rgba(6,182,212,0.06)' },
  10: { b: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
  15: { b: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  20: { b: '#ef4444', bg: 'rgba(239,68,68,0.06)' },
  25: { b: '#8b5cf6', bg: 'rgba(139,92,246,0.06)' },
};
const FALLBACK_COLOR = { b: '#ec4899', bg: 'rgba(236,72,153,0.06)' };

function getColor(r) { return RATE_COLORS[r] || FALLBACK_COLOR; }

// Milestone thresholds (₹)
const MILESTONE_VALUES = [
  25000, 50000, 100000, 250000, 500000, 750000,
  1000000, 2000000, 3000000, 5000000, 7500000,
  10000000, 20000000, 30000000, 50000000, 75000000,
  100000000, 200000000, 300000000, 500000000, 1000000000,
];

function fmtMilestone(v) {
  if (v >= 10000000) {
    const cr = v / 10000000;
    return `₹${Number.isInteger(cr) ? cr : cr.toFixed(1)}Cr`;
  }
  if (v >= 100000) {
    const l = v / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`;
  }
  return formatINR(v, true);
}

function fmtMonthYear(date) {
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// ── Core Calculation ──────────────────────────────────────
function buildData(pf, initMonthly, stepupPct, annualRate, numYears) {
  const mr = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  let corpus = pf;
  let newInvested = 0;

  const rows = [];
  const milestones = [];
  const today = new Date();

  // Only track milestones above current portfolio
  const pending = MILESTONE_VALUES.filter(m => m > corpus);
  const hit = new Set();
  let totalMonths = 0;

  for (let y = 1; y <= numYears; y++) {
    const ma = initMonthly * Math.pow(1 + stepupPct / 100, y - 1);

    for (let m = 0; m < 12; m++) {
      corpus = (corpus + ma) * (1 + mr);
      newInvested += ma;
      totalMonths++;

      // Check milestones
      for (const mv of pending) {
        if (!hit.has(mv) && corpus >= mv) {
          hit.add(mv);
          const d = new Date(today);
          d.setMonth(d.getMonth() + totalMonths);
          milestones.push({ value: mv, date: d, year: y, ma });
        }
      }
    }

    const totalInvested = pf + newInvested;
    const yearEnd = new Date(today);
    yearEnd.setMonth(yearEnd.getMonth() + y * 12);

    rows.push({
      year: y,
      ma,
      invested: totalInvested,
      returns: corpus - totalInvested,
      total: corpus,
      date: yearEnd,
    });
  }

  const maturityDate = new Date(today);
  maturityDate.setMonth(maturityDate.getMonth() + numYears * 12);

  return { rows, milestones, maturityDate };
}

// ── Chart Colors Helper ───────────────────────────────────
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text: isDark ? '#64748b' : '#94a3b8',
  };
}

// ── Render ────────────────────────────────────────────────
function renderResults(pf, initMonthly, stepupPct, annualRate, numYears) {
  const { rows, milestones, maturityDate } = buildData(pf, initMonthly, stepupPct, annualRate, numYears);
  const last = rows[rows.length - 1];

  // Summary bar
  document.getElementById('resInvested').textContent = formatINR(last.invested);
  document.getElementById('resReturns').textContent  = formatINR(last.returns);
  document.getElementById('resTotal').textContent    = formatINR(last.total);

  const invPct = last.invested / last.total * 100;
  const retPct = 100 - invPct;
  document.getElementById('barFillInvested').style.width = invPct.toFixed(2) + '%';
  document.getElementById('barFillReturns').style.width  = retPct.toFixed(2) + '%';
  document.getElementById('pctInvested').textContent = Math.round(invPct) + '%';
  document.getElementById('pctReturns').textContent  = Math.round(retPct) + '%';

  // Info boxes
  document.getElementById('maturityDate').textContent  = fmtMonthYear(maturityDate);
  const finalMa = initMonthly * Math.pow(1 + stepupPct / 100, numYears - 1);
  document.getElementById('finalMonthly').textContent  = `${formatINR(finalMa)}/mo`;
  const wealthX = (last.total / last.invested).toFixed(1);
  document.getElementById('wealthMultiple').textContent = `${wealthX}x`;

  // Step-up gain vs flat
  const { rows: flatRows } = buildData(pf, initMonthly, 0, annualRate, numYears);
  const flatLast = flatRows[flatRows.length - 1];
  const extra = ((last.total - flatLast.total) / flatLast.total * 100).toFixed(1);
  document.getElementById('stepupGain').textContent = `+${extra}% vs flat SIP`;

  renderChart(rows, pf, initMonthly, annualRate, numYears);
  renderMilestones(milestones);
  renderTable(rows);
  renderComparison(pf, initMonthly, annualRate, numYears, stepupPct);
}

function renderChart(primaryRows, pf, initMonthly, annualRate, numYears) {
  const c = getChartColors();
  const datasets = [];

  // Comparison lines (dashed)
  for (const r of [...activeCompareRates].sort((a, b) => a - b)) {
    if (r === stepup) continue; // skip if same as primary
    const { rows } = buildData(pf, initMonthly, r, annualRate, numYears);
    const col = getColor(r);
    datasets.push({
      label: `${r}% step-up`,
      data: rows.map(row => row.total),
      borderColor: col.b,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 1.5,
      borderDash: [5, 3],
    });
  }

  // Primary line (solid, filled)
  const col = getColor(stepup);
  datasets.push({
    label: `${stepup}% step-up (yours)`,
    data: primaryRows.map(r => r.total),
    borderColor: col.b,
    backgroundColor: col.bg,
    fill: true,
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 5,
    borderWidth: 3,
  });

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: primaryRows.map(r => `Y${r.year}`),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 10 } } },
        y: {
          grid: { color: c.grid },
          ticks: { color: c.text, font: { size: 10 }, callback: v => formatINR(v, true) },
        },
      },
      plugins: {
        legend: { labels: { color: c.text, usePointStyle: true, pointStyle: 'circle', boxWidth: 8 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatINR(ctx.raw, true)}` } },
      },
    },
  });
}

function renderMilestones(milestones) {
  const el = document.getElementById('milestonesTable');
  if (!milestones.length) {
    el.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:1.5rem;">No milestones crossed in this period</td></tr>';
    return;
  }
  el.innerHTML = milestones.map(h => `
    <tr>
      <td style="font-weight:700;color:var(--color-accent);">${fmtMilestone(h.value)}</td>
      <td>${fmtMonthYear(h.date)}</td>
      <td>Year ${h.year}</td>
      <td>${formatINR(h.ma)}/mo</td>
    </tr>
  `).join('');
}

function renderTable(rows) {
  document.getElementById('yearlyTable').innerHTML = rows.map(r => `
    <tr>
      <td>Year ${r.year}</td>
      <td style="color:var(--color-text-muted);font-size:.82rem;">${fmtMonthYear(r.date)}</td>
      <td>${formatINR(r.ma)}/mo</td>
      <td>${formatINR(r.invested)}</td>
      <td>${formatINR(r.returns)}</td>
      <td>${formatINR(r.total)}</td>
    </tr>
  `).join('');
}

function renderComparison(pf, initMonthly, annualRate, numYears, currentStepup) {
  const rates = [...new Set([...COMPARE_RATES, currentStepup])].sort((a, b) => a - b);
  document.getElementById('comparisonTable').innerHTML = rates.map(r => {
    const { rows } = buildData(pf, initMonthly, r, annualRate, numYears);
    const last = rows[rows.length - 1];
    const col = getColor(r);
    const isCurrent = r === currentStepup;
    return `
      <tr style="${isCurrent ? 'font-weight:700;background:rgba(99,102,241,0.06);' : ''}">
        <td>
          <span style="display:inline-flex;align-items:center;gap:.45rem;">
            <span style="width:9px;height:9px;border-radius:50%;background:${col.b};flex-shrink:0;${isCurrent ? 'box-shadow:0 0 0 2px '+col.b+'44;' : ''}"></span>
            ${r}%${isCurrent ? ' ★' : ''}
          </span>
        </td>
        <td>${formatINR(last.total, true)}</td>
        <td>${formatINR(last.invested, true)}</td>
        <td>${formatINR(last.returns, true)}</td>
        <td>${(last.total / last.invested).toFixed(1)}x</td>
      </tr>
    `;
  }).join('');
}

// ── Wire ──────────────────────────────────────────────────
function update() {
  document.getElementById('lblPortfolio').textContent = formatINR(portfolio);
  document.getElementById('lblMonthly').textContent   = formatINR(monthly);
  document.getElementById('lblStepup').textContent    = formatPct(stepup, 0);
  document.getElementById('lblRate').textContent      = formatPct(rate);
  document.getElementById('lblYears').textContent     = `${years} yr${years > 1 ? 's' : ''}`;
  renderResults(portfolio, monthly, stepup, rate, years);
}

document.addEventListener('DOMContentLoaded', () => {
  bindSlider('sliderPortfolio', 'inputPortfolio', v => { portfolio = v; update(); });
  bindSlider('sliderMonthly',   'inputMonthly',   v => { monthly   = v; update(); });
  bindSlider('sliderStepup',    'inputStepup',    v => { stepup    = v; update(); });
  bindSlider('sliderRate',      'inputRate',       v => { rate     = v; update(); });
  bindSlider('sliderYears',     'inputYears',      v => { years    = v; update(); });

  // Chip toggles for comparison rates
  document.querySelectorAll('.chip[data-rate]').forEach(chip => {
    chip.addEventListener('click', () => {
      const r = Number(chip.dataset.rate);
      if (activeCompareRates.has(r)) {
        activeCompareRates.delete(r);
        chip.classList.remove('chip--active');
      } else {
        activeCompareRates.add(r);
        chip.classList.add('chip--active');
      }
      renderChart(
        buildData(portfolio, monthly, stepup, rate, years).rows,
        portfolio, monthly, rate, years
      );
    });
  });

  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  update();
});
}());
