export function fmt$(n) {
  n = Number(n) || 0;
  const neg = n < 0;
  n = Math.abs(n);
  const s = "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return neg ? "-" + s : s;
}

export function fmt$compact(n) {
  n = Number(n) || 0;
  const neg = n < 0;
  n = Math.abs(n);
  let s;
  if (n >= 1_000_000) s = "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  else if (n >= 1_000) s = "$" + (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  else s = "$" + n.toFixed(0);
  return neg ? "-" + s : s;
}

export function totalAssets(a) {
  return Object.values(a).reduce((s, v) => s + (Number(v) || 0), 0);
}

export function sumObj(o) {
  return Object.values(o).reduce((s, v) => s + (Number(v) || 0), 0);
}

export function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}
