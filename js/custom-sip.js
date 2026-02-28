// ── Custom Yearly SIP Planner Logic ───────────────────────
(function () {
const { formatINR, formatPct, bindSlider } = window.FinSim;

let lineChart;

// ── State ─────────────────────────────────────────────────
let portfolio = 2950000, rate = 12, years = 10;
let sipByYear = Array(years).fill(40000);

// ── Milestone thresholds ──────────────────────────────────
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

// ── Core calculation ──────────────────────────────────────
function buildData(pf, sipArr, annualRate, numYears) {
  const mr = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  let corpus = pf;
  let newInvested = 0;
  const rows = [], milestones = [];
  const today = new Date();
  const pending = MILESTONE_VALUES.filter(m => m > corpus);
  const hit = new Set();
  let totalMonths = 0;

  for (let y = 1; y <= numYears; y++) {
    const ma = sipArr[y - 1] || 0;
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + ma) * (1 + mr);
      newInvested += ma;
      totalMonths++;
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
    rows.push({ year: y, ma, invested: totalInvested, returns: corpus - totalInvested, total: corpus, date: yearEnd });
  }

  const maturityDate = new Date(today);
  maturityDate.setMonth(maturityDate.getMonth() + numYears * 12);
  return { rows, milestones, maturityDate };
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text: isDark ? '#64748b' : '#94a3b8',
  };
}

// ── SIP year table ────────────────────────────────────────
function renderSIPTable() {
  const container = document.getElementById('sipYearTable');
  container.innerHTML = sipByYear.map((amt, i) => `
    <div class="sip-year-row">
      <span class="sip-year-label">Yr ${i + 1}</span>
      <input type="number" class="sip-year-input" data-year="${i}" value="${amt}" min="0" step="500" />
      <span class="sip-year-tag">${formatINR(amt, true)}/mo</span>
    </div>
  `).join('');

  container.querySelectorAll('.sip-year-input').forEach(input => {
    input.addEventListener('change', () => {
      const y = Number(input.dataset.year);
      const val = Math.max(0, Number(input.value) || 0);
      sipByYear[y] = val;
      input.value = val;
      input.nextElementSibling.textContent = formatINR(val, true) + '/mo';
      renderResults();
    });
  });
}

function applyQuickFill(type) {
  const base = sipByYear[0] || 40000;
  sipByYear = sipByYear.map((_, i) => {
    if (type === 'flat')   return base;
    if (type === 'step10') return Math.round(base * Math.pow(1.10, i) / 500) * 500;
    if (type === 'step20') return Math.round(base * Math.pow(1.20, i) / 500) * 500;
    return _;
  });
  renderSIPTable();
  renderResults();
}

// ── Render results ────────────────────────────────────────
function renderResults() {
  const { rows, milestones, maturityDate } = buildData(portfolio, sipByYear, rate, years);
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
  document.getElementById('totalSIPContrib').textContent = formatINR(last.invested - portfolio);
  document.getElementById('wealthMultiple').textContent  = `${(last.total / last.invested).toFixed(1)}x`;

  // vs flat SIP using Year 1 amount
  const flatAmt = sipByYear[0] || 0;
  const { rows: flatRows } = buildData(portfolio, Array(years).fill(flatAmt), rate, years);
  const flatLast = flatRows[flatRows.length - 1];
  const diff = last.total - flatLast.total;
  const diffPct = flatLast.total > 0 ? (diff / flatLast.total * 100).toFixed(1) : '0.0';
  const gainEl = document.getElementById('vsFlat');
  gainEl.textContent = `${diff >= 0 ? '+' : ''}${diffPct}% vs flat ₹${formatINR(flatAmt, true)}/mo`;
  gainEl.style.color = diff >= 0 ? '#10b981' : '#ef4444';

  renderChart(rows, flatRows);
  renderMilestones(milestones);
  renderTable(rows);
}

function renderChart(customRows, flatRows) {
  const c = getChartColors();
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: customRows.map(r => `Y${r.year}`),
      datasets: [
        {
          label: `Flat SIP (Yr 1 amount)`,
          data: flatRows.map(r => r.total),
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 1.5,
          borderDash: [5, 3],
        },
        {
          label: 'Your Custom Plan',
          data: customRows.map(r => r.total),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 3,
        },
      ],
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

// ── Wire ──────────────────────────────────────────────────
function updateLabels() {
  document.getElementById('lblPortfolio').textContent = formatINR(portfolio);
  document.getElementById('lblRate').textContent      = formatPct(rate);
  document.getElementById('lblYears').textContent     = `${years} yr${years > 1 ? 's' : ''}`;
}

document.addEventListener('DOMContentLoaded', () => {
  bindSlider('sliderPortfolio', 'inputPortfolio', v => {
    portfolio = v; updateLabels(); renderResults();
  });

  bindSlider('sliderRate', 'inputRate', v => {
    rate = v; updateLabels(); renderResults();
  });

  bindSlider('sliderYears', 'inputYears', v => {
    const newYrs = v;
    if (newYrs > years) {
      const last = sipByYear[sipByYear.length - 1] || 40000;
      for (let i = years; i < newYrs; i++) sipByYear.push(last);
    } else {
      sipByYear = sipByYear.slice(0, newYrs);
    }
    years = newYrs;
    updateLabels();
    renderSIPTable();
    renderResults();
  });

  // Quick-fill buttons
  document.getElementById('qfFlat').addEventListener('click',   () => applyQuickFill('flat'));
  document.getElementById('qfStep10').addEventListener('click', () => applyQuickFill('step10'));
  document.getElementById('qfStep20').addEventListener('click', () => applyQuickFill('step20'));

  const observer = new MutationObserver(() => { renderChart(
    buildData(portfolio, sipByYear, rate, years).rows,
    buildData(portfolio, Array(years).fill(sipByYear[0] || 0), rate, years).rows
  ); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  updateLabels();
  renderSIPTable();
  renderResults();
});
}());
