// =============================================================================
// progress-financial.js — the "Financials (5D)" left-panel view.
//
// Translates the physical 4D schedule slippage (days behind, overdue component
// count) into dollars: a cost-vs-schedule doughnut, EVM health (CPI/SPI), the
// current pay-application draw, and schedule-driven risk & variance. Fixed
// contract figures come from FINANCIALS; the risk numbers are recomputed from
// the live CStatus summary so the money always tracks the real progress.
// =============================================================================

import { PLANNED_PROGRESS_PCT, FINANCIALS } from "./config.js?v=9";

/** Circumference of the SVG ring (2πr, r=52) — matches .ring__bar dasharray. */
const RING_CIRCUMFERENCE = 327;

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const count = (n) => Number(n).toLocaleString("en-US");

/** Compact "$2.2M" / "$140k" style for headline callouts. */
function compact(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return money(n);
}

/**
 * Populate the Financials (5D) panel from an aggregated CStatus summary.
 * Safe to call with an empty summary — the schedule-driven figures fall back to
 * zero while the fixed contract values still render.
 *
 * @param {{ behind?: number, behindPct?: number, daysBehind?: number }} summary
 */
export function renderFinancialPanel(summary = {}) {
  const f = FINANCIALS;
  const behind = summary.behind ?? 0;
  const behindPct = summary.behindPct ?? 0;
  const daysBehind = Math.round(summary.daysBehind ?? 0);
  const effective = Math.max(0, PLANNED_PROGRESS_PCT - behindPct);
  const expended = f.budgetExpendedPct;

  // --- Executive doughnut: blue cost up to schedule, red overrun sliver ------
  setRingArc("finRingCost", 0, Math.min(effective, expended));
  setRingArc("finRingOver", Math.min(effective, expended), expended);
  setText("finExpendedPct", `${expended.toFixed(1)}%`);

  // --- Big three -------------------------------------------------------------
  setText("finContract", money(f.contractValue));
  setText("finCostToDate", money(f.costToDate));
  setText("finEac", money(f.estAtCompletion));
  const overrun = f.estAtCompletion - f.contractValue;
  setText(
    "finEacNote",
    overrun > 0
      ? `▲ ${compact(overrun)} over budget`
      : `▼ ${compact(-overrun)} under budget`
  );

  // --- EVM health check ------------------------------------------------------
  setText("finCpi", f.cpi.toFixed(2));
  setText("finSpi", f.spi.toFixed(2));

  // --- Current billing draw --------------------------------------------------
  const gross = f.draw.workCompleted + f.draw.materialsStored;
  const retainage = gross * (f.draw.retainagePct / 100);
  const net = gross - retainage;
  setText("finDrawPeriod", f.draw.period);
  setText("finWork", money(f.draw.workCompleted));
  setText("finMaterials", money(f.draw.materialsStored));
  setText("finRetainage", `-${money(retainage)}`);
  setText("finNet", money(net));

  // --- Risk & variance (tie the headline penalty to real schedule slip) ------
  const delayImpact = daysBehind * f.dailyLiquidatedDamages;
  setText("finDelay", `-${money(delayImpact)}`);
  setText(
    "finDelaySub",
    `Penalty for ${daysBehind} day${daysBehind === 1 ? "" : "s"} behind schedule`
  );
  setText("finComp", money(f.delayedComponentsCost));
  setText("finCompSub", `Value of ${count(behind)} overdue components on map`);
  setText("finChange", money(f.pendingChangeOrders));

  // --- Header subtitle -------------------------------------------------------
  setText(
    "finSub",
    `~${compact(delayImpact)} delay penalty · ${count(behind)} at risk`
  );
}

/**
 * Wire the one-time interactions: the Schedule (4D) ↔ Financials (5D) view
 * toggle, the cost-overlay pill group, the risk-filter cards, and the AIA
 * billing button.
 */
export function createFinancialControls() {
  wireViewToggle();
  wireOverlayPills();
  wireRiskFilters();
  wireBillingButton();
}

/** Toggle the left dashboard between the schedule and financial views. */
function wireViewToggle() {
  const btnSchedule = document.getElementById("viewSchedule");
  const btnFinancial = document.getElementById("viewFinancial");
  const scheduleView = document.getElementById("scheduleView");
  const financialView = document.getElementById("financialView");
  if (!btnSchedule || !btnFinancial || !scheduleView || !financialView) return;

  const show = (financial) => {
    financialView.classList.toggle("is-inactive", !financial);
    scheduleView.classList.toggle("is-inactive", financial);
    btnFinancial.classList.toggle("is-active", financial);
    btnSchedule.classList.toggle("is-active", !financial);
    btnFinancial.setAttribute("aria-selected", String(financial));
    btnSchedule.setAttribute("aria-selected", String(!financial));
  };

  btnSchedule.addEventListener("click", () => show(false));
  btnFinancial.addEventListener("click", () => show(true));
}

/** Single-select the 3D-map cost overlay pills (visual state only for now). */
function wireOverlayPills() {
  const group = document.getElementById("finOverlays");
  if (!group) return;
  group.addEventListener("click", (event) => {
    const pill = event.target.closest(".fin-pill");
    if (!pill) return;
    for (const button of group.querySelectorAll(".fin-pill")) {
      const active = button === pill;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  });
}

/**
 * AIA billing button — a mocked idle → loading → success → idle state machine.
 * There is no billing backend in this demo; the delays stand in for the
 * geometry/cost analysis a real pay-application export would run.
 */
function wireBillingButton() {
  const button = document.getElementById("finBilling");
  const label = button?.querySelector(".fin-btn__label");
  if (!button || !label) return;
  const idleLabel = label.textContent;
  const timers = [];

  const setState = (state) => {
    button.classList.toggle("is-loading", state === "loading");
    button.classList.toggle("is-success", state === "success");
    button.disabled = state !== "idle";
    if (state === "loading") label.textContent = "Analyzing 3D Geometry & Costs…";
    else if (state === "success") label.textContent = "AIA G702 Generated - $5.41M";
    else label.textContent = idleLabel;
  };

  button.addEventListener("click", () => {
    if (button.disabled) return;
    while (timers.length) window.clearTimeout(timers.pop());
    setState("loading");
    timers.push(
      window.setTimeout(() => {
        setState("success");
        timers.push(window.setTimeout(() => setState("idle"), 3500));
      }, 2500)
    );
  });
}

/**
 * Risk & variance cards double as mutually-exclusive 3D-map filters. Selecting
 * a card highlights it and reveals a status banner naming the overlay; clicking
 * the active card again clears the filter. (Map wiring is mocked for the demo.)
 */
function wireRiskFilters() {
  const group = document.getElementById("finRisks");
  const banner = document.getElementById("finRiskBanner");
  if (!group || !banner) return;

  const BANNERS = {
    schedule: {
      text: "Map Overlay Active: Isolating critical path schedule impacts…",
      tone: "is-rose",
    },
    delayed: {
      text: "Map Overlay Active: Highlighting 238 overdue components…",
      tone: "is-amber",
    },
    pending: {
      text: "Map Overlay Active: Viewing geometry for pending CORs…",
      tone: "is-cyan",
    },
  };

  let active = null;

  const apply = () => {
    for (const card of group.querySelectorAll(".fin-risk__card")) {
      const on = card.dataset.risk === active;
      card.classList.toggle("is-active", on);
      card.setAttribute("aria-pressed", String(on));
    }
    banner.classList.remove("is-rose", "is-amber", "is-cyan");
    const meta = active ? BANNERS[active] : null;
    if (meta) {
      banner.textContent = meta.text;
      banner.classList.add(meta.tone);
      banner.hidden = false;
    } else {
      banner.textContent = "";
      banner.hidden = true;
    }
  };

  group.addEventListener("click", (event) => {
    const card = event.target.closest(".fin-risk__card");
    if (!card) return;
    const id = card.dataset.risk;
    active = active === id ? null : id;
    apply();
  });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Draw a coloured arc segment of the doughnut between two percentages.
 * The parent <svg> is already rotated -90° (12 o'clock start); each arc is
 * positioned by rotating its own circle by `fromPct` of a full turn.
 */
function setRingArc(id, fromPct, toPct) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = clampPct(fromPct);
  const end = Math.max(start, clampPct(toPct));
  const length = (RING_CIRCUMFERENCE * (end - start)) / 100;
  el.style.strokeDasharray = `${length} ${RING_CIRCUMFERENCE}`;
  el.style.strokeDashoffset = "0";
  el.setAttribute("transform", `rotate(${(start / 100) * 360} 60 60)`);
}

function clampPct(n) {
  return Math.max(0, Math.min(100, Number(n) || 0));
}
