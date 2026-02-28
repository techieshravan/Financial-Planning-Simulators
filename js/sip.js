// ── SIP Calculator Logic ──────────────────────────────────
(function () {
const { formatINR, formatPct, bindSlider } = window.FinSim;

let donutChart, barChart;

function calcSIP(monthly, rate, years) {
  const n = years * 12;
  const r = rate / 100 / 12;
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

  document.getElementById('resInvested').textContent = formatINR(invested, true);
  document.getElementById('resReturns').textContent  = formatINR(returns,  true);
  document.getElementById('resTotal').textContent    = formatINR(futureValue, true);

  renderCharts(invested, returns, buildYearlyData(monthly, rate, years));
  renderTable(buildYearlyData(monthly, rate, years));
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

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Invested', 'Est. Returns'],
      datasets: [{
        data: [invested, returns],
        backgroundColor: ['#4f46e5', '#10b981'],
        borderColor: c.border,
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${formatINR(ctx.raw, true)}` },
        },
      },
    },
  });

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: yearly.map(r => `Y${r.year}`),
      datasets: [
        {
          label: 'Invested',
          data: yearly.map(r => r.invested),
          backgroundColor: 'rgba(79,70,229,0.85)',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Returns',
          data: yearly.map(r => r.returns),
          backgroundColor: 'rgba(16,185,129,0.85)',
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
