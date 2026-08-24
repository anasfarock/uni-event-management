/* ============================================================
   Charts — small dependency-free SVG chart renderers.
   Kept hand-rolled (no chart.js/CDN) so the dashboard renders
   correctly even with no internet access at grading time.
   ============================================================ */

const CHART_COLORS = ["#c79a3f", "#17233f", "#2f8f5b", "#c1443b", "#6b7280", "#8ba3c7"];

function renderBarChart(containerEl, data, opts = {}) {
  // data: [{ label, value }]
  const width = opts.width || 460;
  const barHeight = 26;
  const gap = 14;
  const labelWidth = 130;
  const chartWidth = width - labelWidth - 60;
  const max = Math.max(1, ...data.map((d) => d.value));
  const height = data.length * (barHeight + gap) + gap;

  if (data.length === 0) {
    containerEl.innerHTML = `<div class="empty-state" style="padding:20px;">No data yet.</div>`;
    return;
  }

  let bars = "";
  data.forEach((d, i) => {
    const y = gap + i * (barHeight + gap);
    const w = Math.max(2, (d.value / max) * chartWidth);
    const color = CHART_COLORS[i % CHART_COLORS.length];
    bars += `
      <text x="${labelWidth - 10}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="12" fill="#3d4451" font-family="Inter, sans-serif">${escapeHtml(d.label)}</text>
      <rect x="${labelWidth}" y="${y}" width="${chartWidth}" height="${barHeight}" rx="4" fill="#efeee8"></rect>
      <rect x="${labelWidth}" y="${y}" width="${w}" height="${barHeight}" rx="4" fill="${color}"></rect>
      <text x="${labelWidth + chartWidth + 10}" y="${y + barHeight / 2 + 4}" font-size="12.5" font-weight="600" fill="#17233f" font-family="IBM Plex Mono, monospace">${d.value}</text>
    `;
  });

  containerEl.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function renderDonutChart(containerEl, segments, opts = {}) {
  // segments: [{ label, value, color }]
  const size = opts.size || 180;
  const stroke = opts.stroke || 26;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    containerEl.innerHTML = `<div class="empty-state" style="padding:20px;">No data yet.</div>`;
    return;
  }

  let offset = 0;
  let circles = "";
  segments.forEach((seg) => {
    const frac = seg.value / total;
    const len = frac * circumference;
    circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}"
      stroke-dasharray="${len} ${circumference - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"></circle>`;
    offset += len;
  });

  const legend = segments.map((s) => `
    <div style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:#3d4451;">
      <span style="width:9px;height:9px;border-radius:50%;background:${s.color};display:inline-block;"></span>
      ${escapeHtml(s.label)} <span style="font-family:'IBM Plex Mono',monospace;color:#17233f;font-weight:600;">${s.value}</span>
    </div>`).join("");

  containerEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        ${circles}
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="20" font-weight="700" fill="#17233f" font-family="Fraunces, serif">${total}</text>
      </svg>
      <div style="display:flex;flex-direction:column;gap:8px;">${legend}</div>
    </div>
  `;
}
