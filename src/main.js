import "./style.css";
import {
  MONTHS,
  RISK_STATEMENTS,
  ACTION_PLAN,
  ASSET_FIELDS,
  LIAB_FIELDS,
  ALLOC_LABELS,
  ALLOC_COLORS,
  DEFAULT_DATA,
} from "./data.js";
import { loadData, scheduleSave } from "./storage.js";
import { fmt$, fmt$compact, totalAssets, sumObj, showToast } from "./helpers.js";
import { lineChart, barChart, donutChart } from "./charts.js";

/* ---------------------------------------------------------------
   STATE
--------------------------------------------------------------- */
let DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
let ACTIVE_TAB = "home";
let ACCORDION_STATE = {};
let PLAN_SUBTAB = "contrib";
let SELECTED_CF_MONTH = new Date().getMonth(); // fixed bug: track selected month

/* ---------------------------------------------------------------
   COMPUTED HELPERS
--------------------------------------------------------------- */
function computeSavingsRate() {
  const months = DATA.cashflow.months;
  const idxs = Object.keys(months);
  if (idxs.length === 0) return null;
  const last = idxs.sort((a, b) => b - a)[0];
  const m = months[last];
  const income = Number(m.income) || 0;
  if (income <= 0) return null;
  const avail =
    income -
    (Number(m.fixed) || 0) -
    (Number(m.variable) || 0) -
    (Number(m.discretionary) || 0);
  return { rate: Math.round((avail / income) * 100), avail, month: last };
}

function driftStatus() {
  const t = DATA.allocation.target;
  const c = DATA.allocation.current;
  const totalC = sumObj(c);
  if (totalC === 0) return null;
  let maxDrift = 0;
  Object.keys(t).forEach((k) => {
    const curPct = ((Number(c[k]) || 0) / totalC) * 100;
    maxDrift = Math.max(maxDrift, Math.abs(curPct - t[k]));
  });
  return Math.round(maxDrift);
}

function riskBand(score) {
  if (score === null) return null;
  if (score >= 20)
    return {
      label: "Aggressive capacity",
      desc: "Likely fits an equity-heavy allocation.",
      preset: { us: 54, intl: 24, bonds: 8, alt: 9, cash: 5 },
    };
  if (score >= 13)
    return {
      label: "Balanced / moderate",
      desc: "A balanced, moderate allocation likely fits better.",
      preset: { us: 40, intl: 18, bonds: 25, alt: 8, cash: 9 },
    };
  return {
    label: "Conservative",
    desc: "A more conservative allocation — or more time before adding equity exposure — is worth considering.",
    preset: { us: 24, intl: 10, bonds: 45, alt: 5, cash: 16 },
  };
}

/* ---------------------------------------------------------------
   RENDER: HOME
--------------------------------------------------------------- */
function renderHome() {
  const snaps = DATA.networth.snapshots;
  const sr = computeSavingsRate();
  const drift = driftStatus();
  const doneCount = Object.values(DATA.actionPlan.done).filter(Boolean).length;
  const nextTaskIdx = ACTION_PLAN.findIndex((_, i) => !DATA.actionPlan.done[i]);

  let nwTrendHtml = `<div class="empty">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#B68A35" stroke-width="1.6"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M20 19V3"/></svg>
      <p>Log your first snapshot on the Net Worth tab to start your trend line.</p>
    </div>`;
  if (snaps.length > 0) {
    const pts = snaps.slice(-8).map((s) => ({
      x: new Date(s.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      y: totalAssets(s.assets) - totalAssets(s.liabilities),
    }));
    nwTrendHtml = lineChart(pts, { w: 300, h: 130, color: "#8A6423" });
  }

  return `
  <div class="section-title"><h2>This month</h2></div>
  <div class="stat-grid">
    <div class="stat">
      <div class="k">Savings rate</div>
      <div class="v">${sr ? sr.rate + "%" : "—"}</div>
    </div>
    <div class="stat">
      <div class="k">Allocation drift</div>
      <div class="v">${drift !== null ? drift + " pts" : "—"}</div>
    </div>
    <div class="stat">
      <div class="k">Net worth check-ins</div>
      <div class="v">${snaps.length}</div>
    </div>
    <div class="stat">
      <div class="k">12-month plan</div>
      <div class="v">${doneCount}/12</div>
    </div>
  </div>

  <div class="section-title"><h2>Net worth trend</h2></div>
  <div class="card">${nwTrendHtml}</div>

  <div class="section-title"><h2>Where to focus next</h2></div>
  <div class="card">
    ${
      nextTaskIdx === -1
        ? `<p style="font-size:14px;">You've marked every step of the 12-month action plan complete. Time to recalculate your net worth and start the next cycle.</p>`
        : `<p class="small-note" style="margin-top:0;color:var(--ink-soft);">Step ${nextTaskIdx + 1} of your 12-month plan</p>
         <p style="font-size:14.5px;">${ACTION_PLAN[nextTaskIdx]}</p>
         <div style="margin-top:12px;"><button class="btn ghost small" data-goto="plan">Open the plan →</button></div>`
    }
  </div>

  <div class="section-title"><h2>Reminders</h2></div>
  <div class="card">
    <div class="list-row"><span class="l">Emergency fund (3–6 mo. expenses)</span><span class="r">Check gatekeeper</span></div>
    <div class="list-row"><span class="l">High-interest debt</span><span class="r">Pay before investing more</span></div>
    <div class="list-row"><span class="l">This is educational, not advice</span><span class="r">See a fiduciary/CPA</span></div>
  </div>
  `;
}

/* ---------------------------------------------------------------
   RENDER: NET WORTH
--------------------------------------------------------------- */
function renderNetWorth() {
  const snaps = DATA.networth.snapshots;
  const chartPts = snaps.map((s) => ({
    x: new Date(s.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    y: totalAssets(s.assets) - totalAssets(s.liabilities),
  }));

  const tableRows =
    snaps
      .slice()
      .reverse()
      .map((s, ri) => {
        const i = snaps.length - 1 - ri;
        const ta = totalAssets(s.assets);
        const tl = totalAssets(s.liabilities);
        const nw = ta - tl;
        const prev = snaps[i - 1];
        let delta = "—";
        if (prev) {
          const pd = nw - (totalAssets(prev.assets) - totalAssets(prev.liabilities));
          delta = (pd >= 0 ? "+" : "") + fmt$compact(pd);
        }
        return `<div class="list-row">
      <span class="l">${new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      <span class="r">${fmt$compact(nw)} <span style="color:var(--ink-soft);font-weight:500;font-size:12px;">(${delta})</span></span>
    </div>`;
      })
      .join("") || `<div class="empty">No snapshots yet.</div>`;

  return `
  <div class="section-title"><h2>Net worth history</h2><span class="section-sub">Appendix E</span></div>
  <div class="card">
    ${
      chartPts.length > 0
        ? lineChart(chartPts, { w: 300, h: 140, color: "#8A6423" })
        : `<div class="empty">Add a snapshot below to begin your 5-year tracker.</div>`
    }
  </div>
  <div class="card" style="padding:8px 16px;">
    ${tableRows}
  </div>

  <div class="section-title"><h2>New snapshot</h2><span class="section-sub">Worksheet 1.1</span></div>
  <div class="card">
    <div class="field">
      <label>Date</label>
      <input type="date" id="nwDate" value="${new Date().toISOString().slice(0, 10)}">
    </div>
    <h3 style="margin:12px 0 8px;color:var(--navy);">Assets</h3>
    ${ASSET_FIELDS.map(
      ([k, label]) =>
        `<div class="field"><label>${label}</label><input type="number" inputmode="decimal" id="asset_${k}" placeholder="0"></div>`
    ).join("")}
    <h3 style="margin:16px 0 8px;color:var(--navy);">Liabilities</h3>
    ${LIAB_FIELDS.map(
      ([k, label]) =>
        `<div class="field"><label>${label}</label><input type="number" inputmode="decimal" id="liab_${k}" placeholder="0"></div>`
    ).join("")}
    <button class="btn gold" id="saveSnapshotBtn">Save snapshot</button>
    <p class="small-note">Repeat this every 6–12 months. The trend line matters more than any single number.</p>
  </div>
  `;
}

function wireNetWorth() {
  document.getElementById("saveSnapshotBtn")?.addEventListener("click", () => {
    const date = document.getElementById("nwDate").value || new Date().toISOString().slice(0, 10);
    const assets = {};
    const liabilities = {};
    ASSET_FIELDS.forEach(([k]) => (assets[k] = Number(document.getElementById("asset_" + k).value) || 0));
    LIAB_FIELDS.forEach(([k]) => (liabilities[k] = Number(document.getElementById("liab_" + k).value) || 0));
    if (totalAssets(assets) === 0 && totalAssets(liabilities) === 0) {
      showToast("Enter at least one amount first");
      return;
    }
    DATA.networth.snapshots.push({ date, assets, liabilities });
    DATA.networth.snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
    scheduleSave(DATA);
    showToast("Snapshot saved");
    render();
  });
}

/* ---------------------------------------------------------------
   RENDER: CASH FLOW  (fixed month selection)
--------------------------------------------------------------- */
function renderCashFlow() {
  const months = DATA.cashflow.months;
  const monthKeys = Object.keys(months).map(Number).sort((a, b) => a - b);
  const bars = monthKeys.map((mi) => {
    const m = months[mi];
    const avail =
      (Number(m.income) || 0) -
      (Number(m.fixed) || 0) -
      (Number(m.variable) || 0) -
      (Number(m.discretionary) || 0);
    return { label: MONTHS[mi], value: avail };
  });

  // Use tracked selected month (bug fix)
  const existing = months[SELECTED_CF_MONTH] || {
    income: "",
    fixed: "",
    variable: "",
    discretionary: "",
  };

  const rows =
    monthKeys
      .slice()
      .reverse()
      .map((mi) => {
        const m = months[mi];
        const avail =
          (Number(m.income) || 0) -
          (Number(m.fixed) || 0) -
          (Number(m.variable) || 0) -
          (Number(m.discretionary) || 0);
        const rate = m.income ? Math.round((avail / Number(m.income)) * 100) : 0;
        return `<div class="list-row"><span class="l">${MONTHS[mi]} ${DATA.cashflow.year}</span><span class="r">${fmt$compact(avail)} <span style="color:var(--ink-soft);font-weight:500;font-size:12px;">(${rate}%)</span></span></div>`;
      })
      .join("") || `<div class="empty">No months logged yet.</div>`;

  return `
  <div class="section-title"><h2>Available to invest</h2><span class="section-sub">Appendix M</span></div>
  <div class="card">
    ${
      bars.length > 0
        ? barChart(bars, { w: 300, h: 130, color: "#2E4576" })
        : `<div class="empty">Log a month below to see your trend.</div>`
    }
  </div>
  <div class="card" style="padding:8px 16px;">${rows}</div>

  <div class="section-title"><h2>Log a month</h2><span class="section-sub">Worksheet 1.2</span></div>
  <div class="card">
    <div class="field">
      <label>Month</label>
      <select id="cfMonth">${MONTHS.map(
        (m, i) =>
          `<option value="${i}" ${i === SELECTED_CF_MONTH ? "selected" : ""}>${m} ${DATA.cashflow.year}</option>`
      ).join("")}</select>
    </div>
    <div class="field"><label>Take-home income (all sources)</label><input type="number" inputmode="decimal" id="cfIncome" value="${existing.income || ""}" placeholder="0"></div>
    <div class="field"><label>Fixed expenses (housing, insurance, min. debt)</label><input type="number" inputmode="decimal" id="cfFixed" value="${existing.fixed || ""}" placeholder="0"></div>
    <div class="field"><label>Variable expenses (food, transport, utilities)</label><input type="number" inputmode="decimal" id="cfVariable" value="${existing.variable || ""}" placeholder="0"></div>
    <div class="field"><label>Discretionary spending</label><input type="number" inputmode="decimal" id="cfDiscretionary" value="${existing.discretionary || ""}" placeholder="0"></div>
    <button class="btn gold" id="saveCashflowBtn">Save month</button>
    <p class="small-note">A common target for intermediate investors is saving 15–25% of gross income across all accounts — the right number depends on your goals, timeline, and debt load.</p>
  </div>
  `;
}

function wireCashFlow() {
  document.getElementById("cfMonth")?.addEventListener("change", (e) => {
    SELECTED_CF_MONTH = Number(e.target.value);
    render(); // re-render so inputs show the correct month's data
  });
  document.getElementById("saveCashflowBtn")?.addEventListener("click", () => {
    const mi = document.getElementById("cfMonth").value;
    DATA.cashflow.months[mi] = {
      income: Number(document.getElementById("cfIncome").value) || 0,
      fixed: Number(document.getElementById("cfFixed").value) || 0,
      variable: Number(document.getElementById("cfVariable").value) || 0,
      discretionary: Number(document.getElementById("cfDiscretionary").value) || 0,
    };
    SELECTED_CF_MONTH = Number(mi);
    scheduleSave(DATA);
    showToast("Month saved");
    render();
  });
}

/* ---------------------------------------------------------------
   RENDER: INVEST
--------------------------------------------------------------- */
function renderInvest() {
  const t = DATA.allocation.target;
  const c = DATA.allocation.current;
  const totalC = sumObj(c);
  const donutTarget = Object.keys(t).map((k) => ({
    label: ALLOC_LABELS[k],
    value: t[k],
    color: ALLOC_COLORS[k],
  }));

  const answers = DATA.allocation.risk.answers;
  const score = answers.every((a) => a !== null) ? answers.reduce((s, v) => s + v, 0) : null;
  const band = riskBand(score);

  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const qHtml = quarters
    .map((q) => {
      const d = DATA.allocation.quarters[q] || {};
      return `
    <div class="accordion ${ACCORDION_STATE["q" + q] ? "open" : ""}" data-acc="q${q}">
      <div class="accordion-head">
        <h3>${q} Review${d.date ? ` — ${d.date}` : ""}</h3>
        <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A6423" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
      </div>
      <div class="accordion-body">
        <div class="field"><label>Date</label><input type="date" id="q${q}_date" value="${d.date || ""}"></div>
        <div class="field"><label>On target or drifted? By how much (%)</label><input type="number" id="q${q}_drift" value="${d.drift || ""}" placeholder="0"></div>
        <div class="field"><label>Contribution this quarter</label><input type="number" id="q${q}_contrib" value="${d.contrib || ""}" placeholder="0"></div>
        <div class="field"><label>Did I stick to my plan?</label>
          <select id="q${q}_stuck">
            <option value="yes" ${d.stuck === "yes" ? "selected" : ""}>Yes</option>
            <option value="no" ${d.stuck === "no" ? "selected" : ""}>No</option>
          </select>
        </div>
        <div class="field"><label>Notes — fund/account changes, what tested the plan</label><input type="text" id="q${q}_notes" value="${d.notes || ""}" placeholder="Optional"></div>
        <button class="btn ghost small" data-save-q="${q}">Save ${q}</button>
      </div>
    </div>`;
    })
    .join("");

  return `
  <div class="section-title"><h2>Risk self-assessment</h2><span class="section-sub">Worksheet 4.1</span></div>
  <div class="card">
    ${RISK_STATEMENTS.map(
      (s, i) => `
      <div class="quiz-q">
        <p>${s}</p>
        <div class="scale" data-q="${i}">
          ${[1, 2, 3, 4, 5]
            .map(
              (v) =>
                `<button class="${answers[i] === v ? "active" : ""}" data-val="${v}">${v}</button>`
            )
            .join("")}
        </div>
      </div>
    `
    ).join("")}
    ${
      band
        ? `
      <div class="divider"></div>
      <div class="tag ${score >= 20 ? "green" : score >= 13 ? "amber" : "red"}">${band.label} · score ${score}/25</div>
      <p style="font-size:13.5px;margin-top:10px;">${band.desc}</p>
      <button class="btn ghost small" id="applyPresetBtn" style="margin-top:10px;">Use as target allocation</button>
    `
        : `<p class="small-note">Score each statement 1–5 to see a suggested starting allocation.</p>`
    }
  </div>

  <div class="section-title"><h2>Target vs. current allocation</h2><span class="section-sub">Worksheet 4.2</span></div>
  <div class="card">
    <div style="display:flex;align-items:center;gap:16px;">
      <div>${donutChart(donutTarget, { size: 110, stroke: 16 })}</div>
      <div style="flex:1;">
        ${Object.keys(t)
          .map(
            (k) =>
              `<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:4px;"><span class="badge-dot" style="background:${ALLOC_COLORS[k]}"></span>${ALLOC_LABELS[k]} · ${t[k]}%</div>`
          )
          .join("")}
      </div>
    </div>
    <div class="divider"></div>
    <h3 style="color:var(--navy);margin-bottom:8px;">Set target %</h3>
    ${Object.keys(t)
      .map(
        (k) =>
          `<div class="field"><label>${ALLOC_LABELS[k]}</label><input type="number" id="target_${k}" value="${t[k]}"></div>`
      )
      .join("")}
    <p class="small-note" id="targetSumNote"></p>

    <div class="divider"></div>
    <h3 style="color:var(--navy);margin-bottom:8px;">Current holdings ($ per bucket)</h3>
    ${Object.keys(c)
      .map(
        (k) =>
          `<div class="field"><label>${ALLOC_LABELS[k]}</label><input type="number" id="current_${k}" value="${c[k] || ""}" placeholder="0"></div>`
      )
      .join("")}
    <button class="btn gold" id="saveAllocBtn">Save allocation</button>
    ${
      totalC > 0
        ? `
      <div class="divider"></div>
      <h3 style="color:var(--navy);margin-bottom:8px;">Rebalancing gap</h3>
      ${Object.keys(t)
        .map((k) => {
          const curPct = Math.round((c[k] / totalC) * 100);
          const gap = t[k] - curPct;
          return `<div class="list-row"><span class="l">${ALLOC_LABELS[k]}</span><span class="r" style="color:${
            gap === 0 ? "var(--ink)" : gap > 0 ? "var(--green)" : "var(--red)"
          }">${curPct}% → ${t[k]}% (${gap > 0 ? "+" : ""}${gap} pts)</span></div>`;
        })
        .join("")}
    `
        : ""
    }
  </div>

  <div class="section-title"><h2>Quarterly portfolio review</h2><span class="section-sub">Appendix F</span></div>
  ${qHtml}
  <p class="small-note" style="margin:4px 0 0;">Allocation drives the large majority of a portfolio's long-term return variance — far more than picking individual winners.</p>
  `;
}

function wireInvest() {
  document.querySelectorAll(".scale").forEach((scale) => {
    scale.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const qi = Number(scale.dataset.q);
      DATA.allocation.risk.answers[qi] = Number(btn.dataset.val);
      scheduleSave(DATA);
      render();
    });
  });

  const applyBtn = document.getElementById("applyPresetBtn");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      const answers = DATA.allocation.risk.answers;
      const score = answers.reduce((s, v) => s + v, 0);
      const band = riskBand(score);
      DATA.allocation.target = { ...band.preset };
      scheduleSave(DATA);
      showToast("Target allocation updated");
      render();
    });
  }

  document.getElementById("saveAllocBtn")?.addEventListener("click", () => {
    const t = {};
    Object.keys(DATA.allocation.target).forEach(
      (k) => (t[k] = Number(document.getElementById("target_" + k).value) || 0)
    );
    const c = {};
    Object.keys(DATA.allocation.current).forEach(
      (k) => (c[k] = Number(document.getElementById("current_" + k).value) || 0)
    );
    DATA.allocation.target = t;
    DATA.allocation.current = c;
    scheduleSave(DATA);
    showToast("Allocation saved");
    render();
  });

  document.querySelectorAll("[data-acc]").forEach((a) => {
    a.querySelector(".accordion-head")?.addEventListener("click", () => {
      const key = a.dataset.acc;
      ACCORDION_STATE[key] = !ACCORDION_STATE[key];
      a.classList.toggle("open");
    });
  });

  document.querySelectorAll("[data-save-q]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.dataset.saveQ;
      DATA.allocation.quarters[q] = {
        date: document.getElementById(`q${q}_date`).value,
        drift: document.getElementById(`q${q}_drift`).value,
        contrib: document.getElementById(`q${q}_contrib`).value,
        stuck: document.getElementById(`q${q}_stuck`).value,
        notes: document.getElementById(`q${q}_notes`).value,
      };
      scheduleSave(DATA);
      showToast(q + " review saved");
      render();
    });
  });

  const sumNote = document.getElementById("targetSumNote");
  function updateSum() {
    const total = Object.keys(DATA.allocation.target).reduce(
      (s, k) => s + (Number(document.getElementById("target_" + k)?.value) || 0),
      0
    );
    if (sumNote) {
      sumNote.textContent =
        `Target total: ${total}%` + (total !== 100 ? ` — adjust so it sums to 100%` : " ✓");
      sumNote.style.color = total === 100 ? "var(--green)" : "var(--red)";
    }
  }
  Object.keys(DATA.allocation.target).forEach((k) => {
    const input = document.getElementById("target_" + k);
    if (input) input.addEventListener("input", updateSum);
  });
  updateSum();
}

/* ---------------------------------------------------------------
   RENDER: PLAN
--------------------------------------------------------------- */
function renderPlan() {
  return `
  <div class="seg">
    <button data-sub="contrib" class="${PLAN_SUBTAB === "contrib" ? "active" : ""}">Contributions</button>
    <button data-sub="goals" class="${PLAN_SUBTAB === "goals" ? "active" : ""}">Goals</button>
    <button data-sub="action" class="${PLAN_SUBTAB === "action" ? "active" : ""}">12-Month Plan</button>
  </div>
  <div id="planSubContent"></div>
  `;
}

function renderContribSub() {
  const accounts = DATA.contributions.accounts;
  const rowsHtml = Object.keys(accounts)
    .map((key) => {
      const acc = accounts[key];
      const ytd = acc.months.reduce((s, v) => s + (Number(v) || 0), 0);
      const pct = Math.min(100, Math.round((ytd / acc.limit) * 100));
      return `
    <div class="card">
      <div class="card-title">
        <h3>${acc.label}</h3>
        <span class="tag ${pct >= 100 ? "green" : pct >= 60 ? "amber" : ""}">${fmt$compact(ytd)} / ${fmt$compact(acc.limit)}</span>
      </div>
      <div class="progress-track"><div class="progress-fill ${pct >= 100 ? "over" : ""}" style="width:${pct}%"></div></div>
      <div class="small-note">${pct}% of the ${DATA.contributions.year} limit</div>
      <div class="divider"></div>
      <table class="mini-tbl">
        <tr>${MONTHS.map((m) => `<th>${m}</th>`).join("")}</tr>
        <tr>${MONTHS.map(
          (m, i) =>
            `<td><input type="number" data-acc="${key}" data-mi="${i}" value="${acc.months[i] || ""}" placeholder="0"></td>`
        ).join("")}</tr>
      </table>
    </div>`;
    })
    .join("");

  return `
  <div class="section-title"><h2>12-month contribution tracker</h2><span class="section-sub">Appendix H</span></div>
  <p class="small-note" style="margin-bottom:12px;">Compared against Appendix C's ${DATA.contributions.year} IRS limits. These figures change most years — verify current limits at irs.gov.</p>
  ${rowsHtml}
  `;
}

function renderGoalsSub() {
  const r = DATA.goals.retirement;
  const items = DATA.goals.items;
  const itemsHtml = items
    .map((g, i) => {
      const gap = (Number(g.targetAmount) || 0) - (Number(g.currentSaved) || 0);
      return `
    <div class="card">
      <div class="card-title"><h3>${g.title || "Goal"}</h3>
      <button class="btn danger-ghost small" data-del-goal="${i}">Remove</button></div>
      <div class="list-row"><span class="l">Target amount</span><span class="r">${fmt$compact(g.targetAmount)}</span></div>
      <div class="list-row"><span class="l">Target date</span><span class="r">${g.targetDate || "—"}</span></div>
      <div class="list-row"><span class="l">Currently saved</span><span class="r">${fmt$compact(g.currentSaved)}</span></div>
      <div class="list-row"><span class="l">Still needed</span><span class="r">${fmt$compact(Math.max(0, gap))}</span></div>
      <div class="list-row"><span class="l">Monthly contribution</span><span class="r">${fmt$compact(g.monthlyContribution)}</span></div>
    </div>`;
    })
    .join("");

  return `
  <div class="section-title"><h2>Retirement goal</h2><span class="section-sub">Appendix G</span></div>
  <div class="card">
    <div class="field"><label>Target retirement age</label><input type="number" id="ret_age" value="${r.targetAge}"></div>
    <div class="field"><label>Annual income needed in retirement (today's $)</label><input type="number" id="ret_income" value="${r.incomeNeeded}"></div>
    <div class="field"><label>Years until retirement</label><input type="number" id="ret_years" value="${r.yearsLeft}"></div>
    <div class="field"><label>Current retirement balances (401k + IRA + other)</label><input type="number" id="ret_balance" value="${r.currentBalance}"></div>
    <div class="field"><label>Current monthly contribution (all retirement accounts)</label><input type="number" id="ret_currentmonthly" value="${r.currentMonthly}"></div>
    <div class="field"><label>Target monthly contribution</label><input type="number" id="ret_targetmonthly" value="${r.targetMonthly}"></div>
    <button class="btn gold" id="saveRetirementBtn">Save retirement goal</button>
  </div>

  <div class="section-title"><h2>Other goals</h2><span class="section-sub">Home, education, major purchase</span></div>
  ${itemsHtml}
  <div class="card">
    <div class="field"><label>Goal name</label><input type="text" id="newGoalTitle" placeholder="e.g. House down payment"></div>
    <div class="row">
      <div class="field"><label>Target amount</label><input type="number" id="newGoalAmount" placeholder="0"></div>
      <div class="field"><label>Target date</label><input type="date" id="newGoalDate"></div>
    </div>
    <div class="row">
      <div class="field"><label>Currently saved</label><input type="number" id="newGoalSaved" placeholder="0"></div>
      <div class="field"><label>Monthly contribution</label><input type="number" id="newGoalMonthly" placeholder="0"></div>
    </div>
    <button class="btn ghost" id="addGoalBtn">Add goal</button>
  </div>
  `;
}

function renderActionSub() {
  const done = DATA.actionPlan.done;
  const doneCount = Object.values(done).filter(Boolean).length;
  const items = ACTION_PLAN.map(
    (txt, i) => `
    <div class="check-item ${done[i] ? "done" : ""}">
      <div class="check-box ${done[i] ? "on" : ""}" data-idx="${i}">
        ${
          done[i]
            ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>'
            : ""
        }
      </div>
      <div class="m">${i + 1}</div>
      <div class="txt">${txt}</div>
    </div>
  `
  ).join("");

  return `
  <div class="section-title"><h2>Your 12-month action plan</h2><span class="section-sub">Chapter 18</span></div>
  <div class="card">
    <div class="progress-track" style="margin-bottom:10px;"><div class="progress-fill ${doneCount === 12 ? "over" : ""}" style="width:${(doneCount / 12) * 100}%"></div></div>
    <div class="small-note" style="margin-bottom:6px;">${doneCount} of 12 months complete</div>
    ${items}
  </div>
  <div class="card">
    <h3 style="color:var(--navy);margin-bottom:8px;">Final reflection</h3>
    <div class="field"><label>The gap between where I started and where I am now</label><input type="text" id="reflGap" value="${DATA.actionPlan.reflGap || ""}"></div>
    <div class="field"><label>The single habit I'm committing to for next year</label><input type="text" id="reflHabit" value="${DATA.actionPlan.reflHabit || ""}"></div>
    <button class="btn ghost small" id="saveReflBtn">Save reflection</button>
  </div>
  `;
}

function wirePlan() {
  document.querySelectorAll("[data-sub]").forEach((b) => {
    b.addEventListener("click", () => {
      PLAN_SUBTAB = b.dataset.sub;
      renderPlanSub();
    });
  });
  renderPlanSub();
}

function renderPlanSub() {
  document
    .querySelectorAll("[data-sub]")
    .forEach((b) => b.classList.toggle("active", b.dataset.sub === PLAN_SUBTAB));
  const holder = document.getElementById("planSubContent");
  if (!holder) return;

  if (PLAN_SUBTAB === "contrib") {
    holder.innerHTML = renderContribSub();
    holder.querySelectorAll("input[data-acc]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const acc = inp.dataset.acc;
        const mi = Number(inp.dataset.mi);
        DATA.contributions.accounts[acc].months[mi] = Number(inp.value) || 0;
        scheduleSave(DATA);
        renderPlanSub();
      });
    });
  } else if (PLAN_SUBTAB === "goals") {
    holder.innerHTML = renderGoalsSub();
    document.getElementById("saveRetirementBtn")?.addEventListener("click", () => {
      DATA.goals.retirement = {
        targetAge: document.getElementById("ret_age").value,
        incomeNeeded: document.getElementById("ret_income").value,
        yearsLeft: document.getElementById("ret_years").value,
        currentBalance: document.getElementById("ret_balance").value,
        currentMonthly: document.getElementById("ret_currentmonthly").value,
        targetMonthly: document.getElementById("ret_targetmonthly").value,
      };
      scheduleSave(DATA);
      showToast("Retirement goal saved");
    });
    document.getElementById("addGoalBtn")?.addEventListener("click", () => {
      const title = document.getElementById("newGoalTitle").value.trim();
      if (!title) {
        showToast("Give the goal a name");
        return;
      }
      DATA.goals.items.push({
        id: Date.now(),
        title,
        targetAmount: Number(document.getElementById("newGoalAmount").value) || 0,
        targetDate: document.getElementById("newGoalDate").value,
        currentSaved: Number(document.getElementById("newGoalSaved").value) || 0,
        monthlyContribution: Number(document.getElementById("newGoalMonthly").value) || 0,
      });
      scheduleSave(DATA);
      showToast("Goal added");
      renderPlanSub();
    });
    holder.querySelectorAll("[data-del-goal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        DATA.goals.items.splice(Number(btn.dataset.delGoal), 1);
        scheduleSave(DATA);
        renderPlanSub();
      });
    });
  } else if (PLAN_SUBTAB === "action") {
    holder.innerHTML = renderActionSub();
    holder.querySelectorAll(".check-box").forEach((box) => {
      box.addEventListener("click", () => {
        const idx = box.dataset.idx;
        DATA.actionPlan.done[idx] = !DATA.actionPlan.done[idx];
        scheduleSave(DATA);
        renderPlanSub();
        renderHeader();
      });
    });
    document.getElementById("saveReflBtn")?.addEventListener("click", () => {
      DATA.actionPlan.reflGap = document.getElementById("reflGap").value;
      DATA.actionPlan.reflHabit = document.getElementById("reflHabit").value;
      scheduleSave(DATA);
      showToast("Reflection saved");
    });
  }
}

/* ---------------------------------------------------------------
   HEADER + MAIN ROUTER
--------------------------------------------------------------- */
function renderHeader() {
  const snaps = DATA.networth.snapshots;
  const latest = snaps[snaps.length - 1];
  const nw = latest ? totalAssets(latest.assets) - totalAssets(latest.liabilities) : 0;
  document.getElementById("hdrNetWorth").textContent = fmt$(nw);
  const deltaEl = document.getElementById("hdrDelta");
  if (snaps.length > 1) {
    const prev = snaps[snaps.length - 2];
    const prevNw = totalAssets(prev.assets) - totalAssets(prev.liabilities);
    const delta = nw - prevNw;
    const cls = delta > 0 ? "pos" : delta < 0 ? "neg" : "flat";
    deltaEl.innerHTML = `<span class="hdr-nw-delta ${cls}">${delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} ${fmt$compact(Math.abs(delta))} since last check-in</span>`;
  } else {
    deltaEl.innerHTML = `<span class="hdr-nw-delta flat">Log snapshots to track your trend</span>`;
  }
}

function render() {
  renderHeader();
  const main = document.getElementById("main");
  if (ACTIVE_TAB === "home") main.innerHTML = renderHome();
  else if (ACTIVE_TAB === "networth") main.innerHTML = renderNetWorth();
  else if (ACTIVE_TAB === "cashflow") main.innerHTML = renderCashFlow();
  else if (ACTIVE_TAB === "invest") main.innerHTML = renderInvest();
  else if (ACTIVE_TAB === "plan") main.innerHTML = renderPlan();

  if (ACTIVE_TAB === "home") {
    const gotoBtn = main.querySelector("[data-goto]");
    if (gotoBtn) gotoBtn.addEventListener("click", () => setTab(gotoBtn.dataset.goto));
  }
  if (ACTIVE_TAB === "networth") wireNetWorth();
  if (ACTIVE_TAB === "cashflow") wireCashFlow();
  if (ACTIVE_TAB === "invest") wireInvest();
  if (ACTIVE_TAB === "plan") wirePlan();

  document.querySelectorAll("nav.tabbar button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === ACTIVE_TAB);
  });
  main.scrollTop = 0;
}

function setTab(tab) {
  ACTIVE_TAB = tab;
  render();
}

/* ---------------------------------------------------------------
   INIT
--------------------------------------------------------------- */
async function init() {
  DATA = await loadData();
  document.getElementById("loadingScreen").classList.add("hide");
  document.getElementById("app").style.display = "flex";

  document.querySelectorAll("nav.tabbar button").forEach((b) => {
    b.addEventListener("click", () => setTab(b.dataset.tab));
  });

  render();
}

init();
