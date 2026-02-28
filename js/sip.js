// ── SIP Calculator Logic ──────────────────────────────────
(function () {
const { formatINR, formatPct, bindSlider } = window.FinSim;

let barChart;

function calcSIP(monthly, rate, years) {
  const n = years * 12;
  const r = Math.pow(1 + rate / 100, 1 / 12) - 1;
  const futureValue = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = monthly * n;
  const returns  = futureValue - invested;
  return { futureValue, invested, returns };
}

function buildYearlyData(monthly, rate, years) {
  const rows = [];
  for (let y = 1; y <= years; y++) {
    const { futureValue, invested, returns } = calcSIP(monthly, rate, y);
    rows.push({ year: y, invested, returns, total: futureValue });
  }
  return rows;
}

function renderResults(monthly, rate, years) {
  const { futureValue, invested, returns } = calcSIP(monthly, rate, years);

  document.getElementById('resInvested').textContent = formatINR(invested);
  document.getElementById('resReturns').textContent  = formatINR(returns);
  document.getElementById('resTotal').textContent    = formatINR(futureValue);

  // Update stacked bar widths + percentage labels
  const invPct = (invested / futureValue * 100);
  const retPct = 100 - invPct;
  document.getElementById('barFillInvested').style.width = invPct.toFixed(2) + '%';
  document.getElementById('barFillReturns').style.width  = retPct.toFixed(2) + '%';
  document.getElementById('pctInvested').textContent = Math.round(invPct) + '%';
  document.getElementById('pctReturns').textContent  = Math.round(retPct) + '%';

  const yearly = buildYearlyData(monthly, rate, years);
  renderCharts(invested, returns, yearly);
  renderTable(yearly);
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text:   isDark ? '#64748b' : '#94a3b8',
    border: isDark ? '#1c1c27' : '#fff',
  };
}

function renderCharts(invested, returns, yearly) {
  const c = getChartColors();

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: yearly.map(r => `Y${r.year}`),
      datasets: [
        {
          label: 'Invested',
          data: yearly.map(r => r.invested),
          backgroundColor: 'rgba(249,115,22,0.9)',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Returns',
          data: yearly.map(r => r.returns),
          backgroundColor: 'rgba(59,130,246,0.9)',
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: { color: c.grid },
          ticks: { color: c.text, font: { size: 10 } },
        },
        y: {
          stacked: true,
          grid: { color: c.grid },
          ticks: {
            color: c.text,
            font: { size: 10 },
            callback: v => formatINR(v, true),
          },
        },
      },
      plugins: {
        legend: {
          labels: { color: c.text, usePointStyle: true, pointStyle: 'circle' },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatINR(ctx.raw, true)}`,
          },
        },
      },
    },
  });
}

function renderTable(yearly) {
  const tbody = document.getElementById('yearlyTable');
  tbody.innerHTML = yearly.map(r => `
    <tr>
      <td>Year ${r.year}</td>
      <td>${formatINR(r.invested)}</td>
      <td>${formatINR(r.returns)}</td>
      <td>${formatINR(r.total)}</td>
    </tr>
  `).join('');
}

// ── Wire inputs ──────────────────────────────────────────
let monthly = 5000, rate = 12, years = 15;

function update() {
  document.getElementById('lblMonthly').textContent = formatINR(monthly);
  document.getElementById('lblRate').textContent    = formatPct(rate);
  document.getElementById('lblYears').textContent   = `${years} yr${years > 1 ? 's' : ''}`;
  renderResults(monthly, rate, years);
}

document.addEventListener('DOMContentLoaded', () => {
  bindSlider('sliderMonthly', 'inputMonthly', v => { monthly = v; update(); });
  bindSlider('sliderRate',    'inputRate',    v => { rate    = v; update(); });
  bindSlider('sliderYears',   'inputYears',   v => { years   = v; update(); });

  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  update();
});
}());
