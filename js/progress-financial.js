// =============================================================================
// progress-financial.js — the "Financials (5D)" left-panel view.
//
// Translates the physical 4D schedule slippage (days behind, overdue component
// count) into money: a cost-vs-schedule doughnut, EVM health (CPI/SPI), the
// current pay-application draw, and schedule-driven risk & variance. The tower
// configures its contract figures (FINANCIALS) and recomputes the risk numbers
// from the live CStatus summary; the roadway sums every figure live from its
// elements' Fin_* fields (see financialModel), so the money always tracks the
// real progress.
// =============================================================================

import { PLANNED_PROGRESS_PCT, FINANCIALS, ENVIRONMENTAL_RISK, PROJECT, pageHref } from "./config.js?v=15";
import {
  refreshRiskContext,
  wireDrillDownModal,
  openDrillDownModal,
} from "./progress-drilldown.js?v=15";

/** Circumference of the SVG ring (2πr, r=52) — matches .ring__bar dasharray. */
const RING_CIRCUMFERENCE = 327;

/** Currency symbol of the active project ("$", "S$"). */
const SYMBOL = FINANCIALS.currency?.symbol ?? "$";

export const money = (n) =>
  `${n < 0 ? "-" : ""}${SYMBOL}${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const count = (n) => Number(n).toLocaleString("en-US");

/** Compact "$2.2M" / "$140k" style for headline callouts. */
export function compact(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${SYMBOL}${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${SYMBOL}${Math.round(n / 1_000)}k`;
  return money(n);
}

/** "Jul 5 – Aug 3, 2027" from the billing period's start/end dates. */
function periodLabel(start, end) {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "Current period";
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: PROJECT.timeZone,
  });
  return fmt.formatRange ? fmt.formatRange(s, e) : `${fmt.format(s)} – ${fmt.format(e)}`;
}

/**
 * The 5D figures for the active project, from a progress summary: the tower's
 * configured contract constants, or — for the attribute-driven roadway — live
 * sums of its elements' Fin_* fields. The draw always reconciles:
 * (work + materials) less retainage = net payment due.
 *
 * @param {object} [summary] collectConstructionStatus().summary
 */
export function financialModel(summary = {}) {
  const f = FINANCIALS;
  const planned = summary.plannedPct ?? PLANNED_PROGRESS_PCT;
  const effective = Math.max(0, planned - (summary.behindPct ?? 0));
  const behind = summary.behind ?? 0;

  if (f.model !== "attributes") {
    const gross = f.draw.workCompleted + f.draw.materialsStored;
    const retainage = gross * (f.draw.retainagePct / 100);
    const delayDays = Math.round(summary.daysBehind ?? 0);
    return {
      contractValue: f.contractValue,
      costToDate: f.costToDate,
      estAtCompletion: f.estAtCompletion,
      expendedPct: f.budgetExpendedPct,
      cpi: f.cpi,
      spi: f.spi,
      planned,
      effective,
      behind,
      draw: {
        period: f.draw.period,
        work: f.draw.workCompleted,
        materials: f.draw.materialsStored,
        retainagePct: f.draw.retainagePct,
        gross,
        retainage,
        net: gross - retainage,
      },
      delayDays,
      delayImpact: delayDays * f.dailyLiquidatedDamages,
      delayedCost: f.delayedComponentsCost,
      pending: f.pendingChangeOrders,
    };
  }

  const s = summary.sums ?? {};
  const budget = s.Fin_Budget ?? 0;
  const actual = s.Fin_ActualCost ?? 0;
  const earned = s.Fin_EarnedValue ?? 0;
  const plannedValue = s.Fin_PlannedValue ?? 0;
  const work = s.Fin_PeriodWork ?? 0;
  // Net change in stored materials: stock incorporated this period comes off.
  const materials = s.Fin_StoredMovement ?? 0;
  const retainagePct = summary.max?.Fin_RetainPct ?? 5;
  const gross = work + materials;
  const retainage = gross * (retainagePct / 100);
  const delayDays = Math.round(summary.criticalDelayDays ?? 0);
  return {
    contractValue: budget,
    costToDate: actual,
    estAtCompletion: s.Fin_EstAtCompletion ?? 0,
    expendedPct: budget ? (actual / budget) * 100 : 0,
    cpi: actual ? earned / actual : 0,
    spi: plannedValue ? earned / plannedValue : 0,
    planned,
    effective,
    behind,
    draw: {
      period: periodLabel(summary.values?.Fin_PeriodStart, summary.values?.Fin_PeriodEnd),
      work,
      materials,
      retainagePct,
      gross,
      retainage,
      net: gross - retainage,
    },
    delayDays,
    delayImpact: delayDays * f.dailyLiquidatedDamages,
    delayedCost: s.Fin_OverdueValue ?? 0,
    pending: f.changeOrders.reduce((sum, c) => sum + c.amount, 0),
  };
}

/** Map a risk-card id to the mock ArcGIS layer the UI would highlight. */
const RISK_LAYERS = {
  schedule: "schedule_delay",
  delayed: "delayed_components",
  pending: "pending_change_orders",
  environmental: "environmental_sensors",
};

/** The latest figures, for the billing button, CSV fallback and map banners. */
let model = financialModel();

/** Latest count-up targets, refreshed each render, replayed on first reveal. */
const countTargets = { finCostToDate: 0, finNet: 0 };

/**
 * Populate the Financials (5D) panel from an aggregated CStatus summary.
 * Safe to call with an empty summary — the schedule-driven figures fall back to
 * zero while the fixed contract values still render.
 *
 * @param {{ behind?: number, behindPct?: number, daysBehind?: number }} summary
 */
export function renderFinancialPanel(summary = {}) {
  const m = (model = financialModel(summary));
  const { behind, effective, delayDays, delayImpact } = m;
  const expended = m.expendedPct;

  // --- Executive doughnut: blue cost up to schedule, red overrun sliver ------
  setRingArc("finRingCost", 0, Math.min(effective, expended));
  setRingArc("finRingOver", Math.min(effective, expended), expended);
  setText("finExpendedPct", `${expended.toFixed(1)}%`);

  // --- Big three -------------------------------------------------------------
  setText("finContract", money(m.contractValue));
  setText("finCostToDate", money(m.costToDate));
  setText("finEac", money(m.estAtCompletion));
  const overrun = m.estAtCompletion - m.contractValue;
  setText(
    "finEacNote",
    overrun > 0
      ? `▲ ${compact(overrun)} over budget`
      : `▼ ${compact(-overrun)} under budget`
  );

  // --- EVM health check ------------------------------------------------------
  setText("finCpi", m.cpi.toFixed(2));
  setText("finSpi", m.spi.toFixed(2));
  setText("finCpiSub", `Earning ${SYMBOL}${m.cpi.toFixed(2)} per ${SYMBOL}1 spent`);
  setText(
    "finSpiSub",
    `${Math.round(effective)}% effective vs ${Math.round(m.planned)}% planned`
  );

  // --- Current billing draw --------------------------------------------------
  const d = m.draw;
  setText("finDrawPeriod", d.period);
  setText("finWork", money(d.work));
  setText("finMaterialsLabel", d.materials < 0 ? "Materials Stored (net)" : "Materials Stored");
  setText("finMaterials", money(d.materials));
  setText("finRetainageLabel", `Less Retainage (${d.retainagePct}%)`);
  setText("finRetainage", `-${money(d.retainage)}`);
  setText("finNet", money(d.net));
  countTargets.finCostToDate = m.costToDate;
  countTargets.finNet = d.net;

  // --- Risk & variance (tie the headline penalty to real schedule slip) ------
  setText("finDelay", money(delayImpact));
  setText(
    "finDelaySub",
    `Penalty for ${delayDays} day${delayDays === 1 ? "" : "s"} behind schedule`
  );
  setText("finComp", money(m.delayedCost));
  setText("finCompSub", `Value of ${count(behind)} overdue components on map`);
  setText("finChange", money(m.pending));
  const env = ENVIRONMENTAL_RISK;
  setText("finEnv", money(env.total));
  setText(
    "finEnvSub",
    `${env.windDaysLost} wind \u00b7 ${env.heatAdvisories} heat \u00b7 ${env.gasStandDowns} air-quality holds`
  );

  // Feed the themed drill-down windows with the live totals + subtitles. The
  // roadway's liquidated damages break down by sectional-completion milestone.
  const milestones = FINANCIALS.milestones?.map((ms) => ({
    label: ms.label,
    meta: `+${delayDays} d \u00b7 ${compact(ms.rate)}/day`,
    amount: ms.rate * delayDays,
  }));
  refreshRiskContext({
    schedule: {
      total: delayImpact,
      sub: `${delayDays} critical-path day${delayDays === 1 ? "" : "s"} behind schedule`,
      ...(milestones ? { rows: milestones } : {}),
    },
    delayed: {
      total: m.delayedCost,
      sub: `${count(behind)} overdue components on the 3D map`,
    },
    pending: {
      total: m.pending,
      sub: "Submitted CORs not yet in the contract sum",
    },
    environmental: {
      total: env.total,
      sub: `${env.windDaysLost} wind hold${env.windDaysLost === 1 ? "" : "s"} \u00b7 ${env.heatAdvisories} heat advisor${env.heatAdvisories === 1 ? "y" : "ies"} \u00b7 ${env.gasStandDowns} gas evacuation${env.gasStandDowns === 1 ? "" : "s"} flagged by site sensors`,
    },
  });

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
export function createFinancialControls(onPhotoMode) {
  wireViewToggle(onPhotoMode);
  wireOverlayPills();
  wireRiskFilters();
  wireBillingButton();
  wireDrillDownModal();
}

function wireViewToggle(onPhotoMode) {
  const tabs = [...document.querySelectorAll(".dash-toggle [aria-controls]")]
    .filter(tab => tab.id !== "viewSitePhotos" || onPhotoMode);
  let countsPlayed = false;
  tabs.forEach((tab, index) => {
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.addEventListener("click", () => {
      if (tab.getAttribute("aria-selected") === "true") return;
      for (const other of tabs) {
        const active = other === tab;
        other.tabIndex = active ? 0 : -1;
        other.setAttribute("aria-selected", String(active));
        other.classList.toggle("is-active", active);
        document.getElementById(other.getAttribute("aria-controls")).classList.toggle("is-inactive", !active);
      }
      onPhotoMode?.(tab.id === "viewSitePhotos");
      if (tab.id === "viewFinancial" && !countsPlayed) {
        countsPlayed = true;
        playCountUps();
      }
    });
    tab.addEventListener("keydown", event => {
      const next = { ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next == null) return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  });
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
 * geometry/cost analysis a real pay-application export would run. On click it
 * opens the standalone report page (report.html) in a new tab; the tab is
 * opened synchronously inside the gesture so pop-up blockers allow it, and if
 * the browser blocks it anyway we fall back to a direct CSV download.
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
    if (state === "loading") label.textContent = "Compiling AIA G702 Report…";
    else if (state === "success")
      // Truncated to two decimals, like the tower's original "$5.41M".
      label.textContent = `Report Opened - ${SYMBOL}${(Math.floor(model.draw.net / 1e4) / 100).toFixed(2)}M Due`;
    else label.textContent = idleLabel;
  };

  button.addEventListener("click", () => {
    if (button.disabled) return;
    while (timers.length) window.clearTimeout(timers.pop());
    // Open synchronously (inside the user gesture) so it isn't pop-up blocked.
    const reportWindow = window.open(pageHref("./report.html"), "_blank");
    if (!reportWindow) downloadAiaCsv(); // blocked — still hand over the data
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
      text: () => `Map Overlay Active: Highlighting ${count(model.behind)} overdue components…`,
      tone: "is-amber",
    },
    pending: {
      text: "Map Overlay Active: Viewing geometry for pending CORs…",
      tone: "is-cyan",
    },
    environmental: {
      text: "Map Overlay Active: Locating sensor-flagged wind & air-quality zones…",
      tone: "is-violet",
    },
  };

  let active = null;

  const apply = () => {
    for (const card of group.querySelectorAll(".fin-risk__card")) {
      const on = card.dataset.risk === active;
      card.classList.toggle("is-active", on);
      card.setAttribute("aria-pressed", String(on));
    }
    banner.classList.remove("is-rose", "is-amber", "is-cyan", "is-violet");
    const meta = active ? BANNERS[active] : null;
    if (meta) {
      banner.textContent = typeof meta.text === "function" ? meta.text() : meta.text;
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

    // Simulated map command — proves the panel is wired to drive the 3D viewer.
    if (active) {
      console.log({
        action: "HIGHLIGHT_GEOMETRY",
        layer: RISK_LAYERS[active] ?? active,
        camera_pan: true,
      });
    }

    // Every risk card drills into its own themed detail window.
    openDrillDownModal(id);
  });
}

/**
 * Fallback AIA G702 export used only when the report tab is pop-up blocked.
 * Figures come from the same model as the panel so the summary reconciles
 * exactly: work + materials = gross, less retainage = net.
 */
function downloadAiaCsv() {
  const d = model.draw;
  const csv = [
    "AIA G702 — Application for Payment",
    `Billing Period,"${d.period}"`,
    "",
    "Line,Amount",
    `Work Completed This Period,${Math.round(d.work)}`,
    `Materials Presently Stored,${Math.round(d.materials)}`,
    `Total Earned This Period,${Math.round(d.gross)}`,
    `Less ${d.retainagePct}% Retainage,-${Math.round(d.retainage)}`,
    `Net Amount Due,${Math.round(d.net)}`,
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `AIA_G702_Draw_${d.period.replace(/[\s,–]+/g, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Replay the headline figures counting up from $0 (called on first reveal). */
function playCountUps() {
  animateCountUp("finCostToDate", countTargets.finCostToDate);
  animateCountUp("finNet", countTargets.finNet);
}

/** Ease-out count-up animation from 0 to `target`, formatted as currency. */
function animateCountUp(id, target, duration = 2000) {
  const el = document.getElementById(id);
  if (!el || !(target > 0)) return;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let startTs = null;
  const step = (ts) => {
    if (startTs === null) startTs = ts;
    const progress = Math.min((ts - startTs) / duration, 1);
    el.textContent = money(target * easeOut(progress));
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = money(target);
  };
  requestAnimationFrame(step);
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
