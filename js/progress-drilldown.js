// =============================================================================
// progress-drilldown.js — themed "drill-down" detail windows for the three
// Financials (5D) risk cards. Every card (schedule / delayed / pending) opens a
// colour-themed modal with a headline total and a staggered list of sample
// line items. The figures are illustrative — the demo's cost/map backend is
// mocked — but each card now has its own satisfying detail view.
// =============================================================================

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Per-risk modal content: heading, glyph, colour theme, total caption, rows. */
const RISK_DETAILS = {
  schedule: {
    title: "Critical Path Schedule Impact",
    icon: "\u25B2",
    theme: "rose",
    totalLabel: "Liquidated damages exposure",
    rows: [
      { label: "L12 Slab Pour", meta: "5 days late", amount: 50000 },
      { label: "Core Jump-Form", meta: "4 days late", amount: 40000 },
      { label: "Curtain Wall Hoist", meta: "3 days late", amount: 30000 },
      { label: "MEP Riser Tie-in", meta: "2 days late", amount: 20000 },
    ],
  },
  delayed: {
    title: "Delayed Components Breakdown",
    icon: "\u25A0",
    theme: "amber",
    totalLabel: "Overdue installed value",
    rows: [
      { label: "Column C4", meta: "Level 12", amount: 2400 },
      { label: "Slab S2", meta: "Level 12", amount: 15000 },
      { label: "Beam B7", meta: "Level 11", amount: 8200 },
      { label: "Curtain Wall Panel", meta: "Level 10", amount: 46500 },
      { label: "MEP Riser", meta: "Level 09", amount: 122000 },
      { label: "Column C1", meta: "Level 08", amount: 3100 },
      { label: "Slab S5", meta: "Level 07", amount: 19800 },
      { label: "Facade Bracket Set", meta: "Level 06", amount: 54000 },
      { label: "Stair Core STR", meta: "Level 05", amount: 88000 },
      { label: "Beam B3", meta: "Level 04", amount: 6900 },
    ],
  },
  pending: {
    title: "Pending Change Orders",
    icon: "\u21C4",
    theme: "cyan",
    totalLabel: "Awaiting owner approval",
    rows: [
      { label: "COR-018 \u00b7 Basement Waterproofing", meta: "Submitted", amount: 128000 },
      { label: "COR-021 \u00b7 Curtain Wall Glazing", meta: "Submitted", amount: 96500 },
      { label: "COR-024 \u00b7 Steel Reinforcement", meta: "In Review", amount: 74000 },
      { label: "COR-027 \u00b7 MEP Fire Dampers", meta: "In Review", amount: 61500 },
      { label: "COR-030 \u00b7 Lobby Finishes", meta: "Pending", amount: 65000 },
    ],
  },
};

/** Live headline total + subtitle per risk, refreshed each panel render. */
const riskContext = {
  schedule: { total: 0, sub: "" },
  delayed: { total: 0, sub: "" },
  pending: { total: 0, sub: "" },
};

/** Push the latest computed totals/subtitles in from renderFinancialPanel. */
export function refreshRiskContext(next) {
  for (const key of Object.keys(riskContext)) {
    if (next[key]) riskContext[key] = { ...riskContext[key], ...next[key] };
  }
}

/** Wire the modal's dismiss affordances once (backdrop, ✕, Close, Escape). */
export function wireDrillDownModal() {
  const modal = document.getElementById("finModal");
  if (!modal) return;
  const close = () => {
    modal.hidden = true;
  };
  for (const btn of modal.querySelectorAll("[data-modal-close]")) {
    btn.addEventListener("click", close);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) close();
  });
}

/** Open the themed drill-down for a given risk id and animate its rows in. */
export function openDrillDownModal(riskId = "delayed") {
  const modal = document.getElementById("finModal");
  const detail = RISK_DETAILS[riskId];
  if (!modal || !detail) return;
  const ctx = riskContext[riskId] ?? { total: 0, sub: "" };

  const panel = document.getElementById("finModalPanel");
  if (panel) panel.dataset.theme = detail.theme;
  setText("finModalIcon", detail.icon);
  setText("finModalTitle", detail.title);
  setText("finModalSub", ctx.sub);
  setText("finModalTotalLabel", detail.totalLabel);
  setText("finModalTotal", money(ctx.total));

  const list = document.getElementById("finModalList");
  if (list) {
    list.textContent = "";
    detail.rows.forEach((row, i) => {
      const li = document.createElement("li");
      li.style.setProperty("--i", String(i));
      const wrap = document.createElement("div");
      wrap.className = "fin-modal__row-label";
      const name = document.createElement("span");
      name.textContent = row.label;
      wrap.appendChild(name);
      if (row.meta) {
        const meta = document.createElement("span");
        meta.className = "fin-modal__row-meta";
        meta.textContent = row.meta;
        wrap.appendChild(meta);
      }
      const amount = document.createElement("strong");
      amount.textContent = money(row.amount);
      li.append(wrap, amount);
      list.appendChild(li);
    });
  }

  modal.hidden = false;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
