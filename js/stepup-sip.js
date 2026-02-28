// ── Step-up SIP Calculator Logic ──────────────────────────
(function () {
const { formatINR, formatPct, bindSlider } = window.FinSim;

let lineChart;

function buildStepupData(initMonthly, stepupPct, rate, years) {
  const monthlyRate = rate / 100 / 12;
  let corpusStart = 0;
  let totalInvested = 0;
  const rows = [];

  for (let y = 1; y <= years; y++) {
    const monthlyAmt = initMonthly * Math.pow(1 + stepupPct / 100, y - 1);
    let corpus = corpusStart;
    for (let m = 0; m < 12; m++) {
      corpus = corpus * (1 + monthlyRate) + monthlyAmt;
      totalInvested += monthlyAmt;
    }
    corpusStart = corpus;
    rows.push({
      year: y,
      monthlyAmt,
      invested: totalInvested,
      returns: corpus - totalInvested,
      total: corpus,
    });
  }
  return rows;
}

function regularSIPValue(monthly, rate, years) {
  const n = years * 12;
  const r = rate / 100 / 12;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

function buildRegularData(monthly, rate, years) {
  const rows = [];
  for (let y = 1; y <= years; y++) {
    const n = y * 12;
    const r = rate / 100 / 12;
    const fv = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    rows.push({ year: y, total: fv });
  }
  return rows;
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text: isDark ? '#64748b' : '#94a3b8',
  };
}

function renderResults(initMonthly, stepupPct, rate, years) {
  const stepupRows  = buildStepupData(initMonthly, stepupPct, rate, years);
  const regularRows = buildRegularData(initMonthly, rate, years);
  const last = stepupRows[stepupRows.length - 1];
  const regFV = regularRows[regularRows.length - 1].total;

  document.getElementById('resInvested').textContent = formatINR(last.invested, true);
  document.getElementById('resReturns').textContent  = formatINR(last.returns,  true);
  document.getElementById('resTotal').textContent    = formatINR(last.total,    true);

  document.getElementById('regularSIPValue').textContent = formatINR(regFV, true);
  const extra = ((last.total - regFV) / regFV * 100).toFixed(1);
  document.getElementById('extraGain').textContent = `+${extra}% extra with step-up`;

  renderChart(stepupRows, regularRows);
  renderTable(stepupRows);
}

function renderChart(stepupRows, regularRows) {
  const c = getChartColors();
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: stepupRows.map(r => `Y${r.year}`),
      datasets: [
        {
          label: 'Step-up SIP',
          data: stepupRows.map(r => r.total),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2.5,
        },
        {
          label: 'Regular SIP',
          data: regularRows.map(r => r.total),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2,
          borderDash: [6, 3],
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
        legend: { labels: { color: c.text, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatINR(ctx.raw, true)}` },
        },
      },
    },
  });
}

function renderTable(rows) {
  document.getElementById('yearlyTable').innerHTML = rows.map(r => `
    <tr>
      <td>Year ${r.year}</td>
      <td>${formatINR(r.monthlyAmt)}/mo</td>
      <td>${formatINR(r.invested)}</td>
      <td>${formatINR(r.returns)}</td>
      <td>${formatINR(r.total)}</td>
    </tr>
  `).join('');
}

// ── Wire ─────────────────────────────────────────────────
let monthly = 5000, stepup = 10, rate = 12, years = 15;

function update() {
  document.getElementById('lblMonthly').textContent = formatINR(monthly);
  document.getElementById('lblStepup').textContent  = formatPct(stepup, 0);
  document.getElementById('lblRate').textContent    = formatPct(rate);
  document.getElementById('lblYears').textContent   = `${years} yr${years > 1 ? 's' : ''}`;
  renderResults(monthly, stepup, rate, years);
}

document.addEventListener('DOMContentLoaded', () => {
  bindSlider('sliderMonthly', 'inputMonthly', v => { monthly = v; update(); });
  bindSlider('sliderStepup',  'inputStepup',  v => { stepup  = v; update(); });
  bindSlider('sliderRate',    'inputRate',    v => { rate    = v; update(); });
  bindSlider('sliderYears',   'inputYears',   v => { years   = v; update(); });

  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  update();
});
}());
