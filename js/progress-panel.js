// =============================================================================
// progress-panel.js — populate the left "Construction Progress" panel from an
// aggregated CStatus summary. Compares the planned schedule target against the
// components that have slipped behind, and lists the full status breakdown.
// =============================================================================

import { PLANNED_PROGRESS_PCT, PROGRESS_STATUS } from "./config.js?v=10";

/** Circumference of the SVG ring (2πr, r=52) — matches .ring__bar dasharray. */
const RING_CIRCUMFERENCE = 327;

const fmt = (n) => n.toLocaleString("en-US");
const pct = (n) => `${n.toFixed(1)}%`;

/**
 * Populate the progress panel from an aggregated CStatus summary.
 *
 * @param {{
 *   total: number,
 *   counts: Record<string, number>,
 *   behind: number,
 *   behindPct: number,
 *   daysBehind: number,
 *   installed: number,
 *   installedPct: number
 * }} stats
 * @param {{ scope?: string|null }} [context] Optional isolated-layer label.
 */
export function renderProgressPanel(stats, context = {}) {
  const hasData = stats.total > 0;
  const planned = PLANNED_PROGRESS_PCT;
  const effective = Math.max(0, planned - stats.behindPct);

  setText("progPlannedPct", `${Math.round(planned)}%`);
  setRing("progRing", planned);

  setText("progEffective", hasData ? pct(effective) : "—");
  setText("progBehindPct", hasData ? pct(stats.behindPct) : "—");
  setText("progOverdue", hasData ? fmt(stats.behind) : "—");
  setText("progTotal", hasData ? fmt(stats.total) : "—");
  setText(
    "progInstalledPct",
    hasData ? `${pct(stats.installedPct)} built` : "—"
  );

  const sub = document.getElementById("progSub");
  if (sub) {
    const days = Math.round(stats.daysBehind ?? 0);
    let text = "Status unavailable";
    if (hasData) {
      if (context.scope) {
        text =
          stats.behind > 0
            ? `${context.scope} · ${fmt(stats.behind)} behind · ~${days}d`
            : `${context.scope} · on track`;
      } else {
        text =
          stats.behind > 0
            ? `~${days} days behind · ${fmt(stats.behind)} components`
            : "On schedule";
      }
    }
    sub.textContent = text;
    sub.classList.toggle("is-behind", hasData && stats.behind > 0);
  }

  renderBreakdown(stats);
}

/** Render one row per CStatus bucket with count, share, and a mini bar. */
function renderBreakdown(stats) {
  const list = document.getElementById("progBreakdown");
  if (!list) return;
  list.innerHTML = "";

  const max = Math.max(
    1,
    ...PROGRESS_STATUS.buckets.map((b) => stats.counts[b.value] ?? 0)
  );

  for (const bucket of PROGRESS_STATUS.buckets) {
    const count = stats.counts[bucket.value] ?? 0;
    const share = stats.total ? (count / stats.total) * 100 : 0;

    const li = document.createElement("li");
    li.className = "status-row";

    const dot = document.createElement("span");
    dot.className = "status-row__dot";
    dot.style.background = bucket.color;
    dot.style.boxShadow = `0 0 8px ${bucket.color}`;

    const name = document.createElement("span");
    name.className = "status-row__name";
    name.textContent = bucket.label;

    const value = document.createElement("span");
    value.className = "status-row__val";
    value.textContent = `${fmt(count)} · ${share.toFixed(1)}%`;

    const bar = document.createElement("span");
    bar.className = "status-row__bar";
    const fill = document.createElement("span");
    fill.className = "status-row__fill";
    fill.style.width = `${(count / max) * 100}%`;
    fill.style.background = bucket.color;
    bar.appendChild(fill);

    li.append(dot, name, value, bar);
    list.appendChild(li);
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Sweep the ring to `percent` (0..100) via stroke-dashoffset. */
function setRing(id, percent) {
  const el = document.getElementById(id);
  if (!el) return;
  const clamped = Math.max(0, Math.min(100, percent));
  el.style.strokeDashoffset = String(
    RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * clamped) / 100
  );
}
