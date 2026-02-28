// ── Lumpsum Calculator Logic ──────────────────────────────
(function () {
const { formatINR, formatPct, bindSlider } = window.FinSim;

let lineChart;

function buildYearlyData(amount, rate, years) {
  const rows = [];
  let opening = amount;
  for (let y = 1; y <= years; y++) {
    const closing = opening * (1 + rate / 100);
    const earned  = closing - opening;
    rows.push({ year: y, opening, earned, closing, totalGain: closing - amount });
    opening = closing;
  }
  return rows;
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text:   isDark ? '#64748b' : '#94a3b8',
    border: isDark ? '#1c1c27' : '#fff',
  };
}

function renderResults(amount, rate, years) {
  const rows  = buildYearlyData(amount, rate, years);
  const last  = rows[rows.length - 1];
  const total = last.closing;
  const gains = total - amount;

  document.getElementById('resInvested').textContent = formatINR(amount);
  document.getElementById('resReturns').textContent  = formatINR(gains);
  document.getElementById('resTotal').textContent    = formatINR(total);

  // Update stacked bar widths + percentage labels
  const invPct = (amount / total * 100);
  const retPct = 100 - invPct;
  document.getElementById('barFillInvested').style.width = invPct.toFixed(2) + '%';
  document.getElementById('barFillReturns').style.width  = retPct.toFixed(2) + '%';
  document.getElementById('pctInvested').textContent = Math.round(invPct) + '%';
  document.getElementById('pctReturns').textContent  = Math.round(retPct) + '%';

  const doubling = (72 / rate).toFixed(1);
  document.getElementById('doublingTime').textContent = `${doubling} yrs`;

  renderChart(amount, rows);
  renderTable(rows);
}

function renderChart(invested, rows) {
  const c = getChartColors();

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: ['Start', ...rows.map(r => `Y${r.year}`)],
      datasets: [{
        label: 'Portfolio Value',
        data: [invested, ...rows.map(r => r.closing)],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 10 } } },
        y: {
          grid: { color: c.grid },
          ticks: { color: c.text, font: { size: 10 }, callback: v => formatINR(v, true) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` Value: ${formatINR(ctx.raw, true)}` } },
      },
    },
  });
}

function renderTable(rows) {
  document.getElementById('yearlyTable').innerHTML = rows.map(r => `
    <tr>
      <td>Year ${r.year}</td>
      <td>${formatINR(r.opening)}</td>
      <td>${formatINR(r.earned)}</td>
      <td>${formatINR(r.closing)}</td>
      <td style="color:#10b981;">+${formatINR(r.totalGain)}</td>
    </tr>
  `).join('');
}

// ── Wire ─────────────────────────────────────────────────
let amount = 100000, rate = 12, years = 10;

function update() {
  document.getElementById('lblAmount').textContent = formatINR(amount);
  document.getElementById('lblRate').textContent   = formatPct(rate);
  document.getElementById('lblYears').textContent  = `${years} yr${years > 1 ? 's' : ''}`;
  renderResults(amount, rate, years);
}

document.addEventListener('DOMContentLoaded', () => {
  bindSlider('sliderAmount', 'inputAmount', v => { amount = v; update(); });
  bindSlider('sliderRate',   'inputRate',   v => { rate   = v; update(); });
  bindSlider('sliderYears',  'inputYears',  v => { years  = v; update(); });

  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  update();
});
}());
