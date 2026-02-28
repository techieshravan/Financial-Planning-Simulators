/* ─────────────────────────────────────────────────────────────
   FinSim — Core JavaScript
   Theme toggle · Shared utilities
───────────────────────────────────────────────────────────── */

// ── Theme ────────────────────────────────────────────────────
(function initTheme() {
  const savedTheme = localStorage.getItem('finsim-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
})();

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
  localStorage.setItem('finsim-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function initNav() {
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNav);
} else {
  initNav();
}

// ── Formatting Utilities ─────────────────────────────────────

/**
 * Format a number as Indian currency (₹ with lakh/crore notation).
 * @param {number} value
 * @param {boolean} compact  - use lakh/crore suffix
 */
function formatINR(value, compact = false) {
  if (compact) {
    if (value >= 1e7) return '₹' + (value / 1e7).toFixed(2) + ' Cr';
    if (value >= 1e5) return '₹' + (value / 1e5).toFixed(2) + ' L';
  }
  return '₹' + value.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

/**
 * Format a percentage.
 */
function formatPct(value, decimals = 1) {
  return value.toFixed(decimals) + '%';
}

// ── Sync slider ↔ number input ───────────────────────────────

/**
 * Bind a range slider and a number input so they stay in sync.
 * Calls `onChange(value)` whenever the value changes.
 *
 * @param {string} sliderId
 * @param {string} inputId
 * @param {Function} onChange
 */
function bindSlider(sliderId, inputId, onChange) {
  const slider = document.getElementById(sliderId);
  const input  = document.getElementById(inputId);
  if (!slider || !input) return;

  const update = (val) => {
    const clamped = Math.min(Number(slider.max), Math.max(Number(slider.min), Number(val)));
    slider.value = clamped;
    input.value  = clamped;
    updateSliderFill(slider);
    onChange(clamped);
  };

  slider.addEventListener('input', () => update(slider.value));
  input.addEventListener('change', () => update(input.value));
  input.addEventListener('input', () => update(input.value));

  // Initialise fill on load
  updateSliderFill(slider);
}

/**
 * Update the CSS fill gradient on a range input to reflect its current value.
 */
function updateSliderFill(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-surface-2) ${pct}%)`;
}

// Expose globally
window.FinSim = { formatINR, formatPct, bindSlider, updateSliderFill, applyTheme, toggleTheme };
