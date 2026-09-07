export function lineChart(points, opts = {}) {
  const w = opts.w || 300;
  const h = opts.h || 140;
  const pad = { t: 14, r: 10, b: 22, l: 10 };
  if (points.length === 0) return `<div class="empty">No data yet</div>`;

  const vals = points.map((p) => p.y);
  let min = Math.min(0, ...vals);
  let max = Math.max(...vals);
  if (max === min) max = min + 1;

  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const scaleY = (v) => pad.t + innerH - ((v - min) / (max - min)) * innerH;

  const coords = points.map((p, i) => ({
    x: pad.l + i * stepX,
    y: scaleY(p.y),
  }));

  const path = coords
    .map((c, i) => (i === 0 ? "M" : "L") + c.x.toFixed(1) + "," + c.y.toFixed(1))
    .join(" ");
  const areaPath =
    path +
    ` L${coords[coords.length - 1].x.toFixed(1)},${pad.t + innerH} L${coords[0].x.toFixed(1)},${pad.t + innerH} Z`;
  const zeroY = scaleY(0);

  const dots = coords
    .map(
      (c) =>
        `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" fill="${opts.color}"/>`
    )
    .join("");

  const labels = points
    .map((p, i) => {
      if (!(i === 0 || i === points.length - 1 || points.length <= 4)) return "";
      const anchor = i === 0 ? "start" : i === points.length - 1 ? "end" : "middle";
      return `<text x="${coords[i].x.toFixed(1)}" y="${h - 6}" font-size="9.5" fill="#6B6553" text-anchor="${anchor}" font-family="DM Sans">${p.x}</text>`;
    })
    .join("");

  return `<svg class="chart-wrap" viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <line x1="${pad.l}" y1="${zeroY.toFixed(1)}" x2="${w - pad.r}" y2="${zeroY.toFixed(1)}" stroke="#DFD3B4" stroke-width="1" stroke-dasharray="2,3"/>
    <path d="${areaPath}" fill="${opts.color}" opacity="0.12"/>
    <path d="${path}" fill="none" stroke="${opts.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${labels}
  </svg>`;
}

export function barChart(bars, opts = {}) {
  const w = opts.w || 300;
  const h = opts.h || 140;
  const pad = { t: 10, r: 6, b: 20, l: 6 };
  if (bars.length === 0) return `<div class="empty">No data yet</div>`;

  const vals = bars.map((b) => b.value);
  const max = Math.max(1, ...vals.map((v) => Math.abs(v)));
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 4;
  const bw = (innerW - gap * (bars.length - 1)) / bars.length;

  const rects = bars
    .map((b, i) => {
      const bh = Math.max(2, (Math.abs(b.value) / max) * innerH);
      const x = pad.l + i * (bw + gap);
      const y = pad.t + innerH - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" fill="${opts.color}"/>`;
    })
    .join("");

  const labels = bars
    .map((b, i) => {
      const x = pad.l + i * (bw + gap) + bw / 2;
      if (bars.length > 6 && i % 3 !== 0 && i !== bars.length - 1) return "";
      return `<text x="${x.toFixed(1)}" y="${h - 6}" font-size="8.5" fill="#6B6553" text-anchor="middle" font-family="DM Sans">${b.label}</text>`;
    })
    .join("");

  return `<svg class="chart-wrap" viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${rects}${labels}</svg>`;
}

export function donutChart(segments, opts = {}) {
  const size = opts.size || 150;
  const stroke = opts.stroke || 20;
  const total = segments.reduce((s, v) => s + v.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  const circles = segments
    .map((seg) => {
      const frac = seg.value / total;
      const dash = frac * circ;
      const el = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}"
        stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>`;
      offset += dash;
      return el;
    })
    .join("");

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${circles}</svg>`;
}
