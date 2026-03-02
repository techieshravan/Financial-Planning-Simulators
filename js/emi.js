// ── EMI Calculator Logic ───────────────────────────────────
(function () {
const { formatINR, formatPct, bindSlider } = window.FinSim;

let barChart;

function calcEMI(principal, annualRate, years) {
  const n = years * 12;
  const r = annualRate / 12 / 100;
  if (r === 0) {
    const emi = principal / n;
    return { emi, totalInterest: 0, totalPayable: principal };
  }
  const factor = Math.pow(1 + r, n);
  const emi = principal * r * factor / (factor - 1);
  const totalPayable = emi * n;
  const totalInterest = totalPayable - principal;
  return { emi, totalInterest, totalPayable };
}

function buildYearlyData(principal, annualRate, years) {
  const n = years * 12;
  const r = annualRate / 12 / 100;
  const factor = Math.pow(1 + r, n);
  const emi = r === 0 ? principal / n : principal * r * factor / (factor - 1);

  let balance = principal;
  const rows = [];

  for (let y = 1; y <= years; y++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = balance * r;
      const principalPaid = Math.min(emi - interest, balance);
      yearInterest += interest;
      yearPrincipal += principalPaid;
      balance -= principalPaid;
      if (balance < 0.01) balance = 0;
    }
    rows.push({ year: y, principalPaid: yearPrincipal, interestPaid: yearInterest, balance });
  }
  return rows;
}

function renderResults(principal, annualRate, years) {
  const { emi, totalInterest, totalPayable } = calcEMI(principal, annualRate, years);

  document.getElementById('resEMI').textContent      = formatINR(emi);
  document.getElementById('resInvested').textContent = formatINR(principal);
  document.getElementById('resReturns').textContent  = formatINR(totalInterest);
  document.getElementById('resTotal').textContent    = formatINR(totalPayable);

  const principalPct = principal / totalPayable * 100;
  const interestPct  = 100 - principalPct;
  document.getElementById('barFillInvested').style.width = principalPct.toFixed(2) + '%';
  document.getElementById('barFillReturns').style.width  = interestPct.toFixed(2) + '%';
  document.getElementById('pctInvested').textContent = Math.round(principalPct) + '%';
  document.getElementById('pctReturns').textContent  = Math.round(interestPct) + '%';

  const yearly = buildYearlyData(principal, annualRate, years);
  renderChart(yearly);
  renderTable(yearly);
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid:  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text:  isDark ? '#64748b' : '#94a3b8',
  };
}

function renderChart(yearly) {
  const c = getChartColors();
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: yearly.map(r => `Y${r.year}`),
      datasets: [
        {
          label: 'Principal',
          data: yearly.map(r => r.principalPaid),
          backgroundColor: 'rgba(249,115,22,0.9)',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Interest',
          data: yearly.map(r => r.interestPaid),
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
      <td>${formatINR(r.principalPaid)}</td>
      <td>${formatINR(r.interestPaid)}</td>
      <td>${formatINR(r.balance)}</td>
    </tr>
  `).join('');
}

// ── Wire inputs ───────────────────────────────────────────
let principal = 3000000, annualRate = 8.5, years = 20;

function update() {
  document.getElementById('lblPrincipal').textContent = formatINR(principal);
  document.getElementById('lblRate').textContent      = formatPct(annualRate);
  document.getElementById('lblYears').textContent     = `${years} yr${years > 1 ? 's' : ''}`;
  renderResults(principal, annualRate, years);
}

document.addEventListener('DOMContentLoaded', () => {
  bindSlider('sliderPrincipal', 'inputPrincipal', v => { principal = v; update(); });
  bindSlider('sliderRate',      'inputRate',      v => { annualRate = v; update(); });
  bindSlider('sliderYears',     'inputYears',     v => { years      = v; update(); });

  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  update();
});
}());
