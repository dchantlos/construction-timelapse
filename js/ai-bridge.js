// =============================================================================
// ai-bridge.js — exposes a small read-only window.CT3D surface so the embedded
// AI assistant can read the live schedule/cost figures + the environmental-risk
// breakdown for its IoT→cost analysis. Reuses the app's own FINANCIALS and
// ENVIRONMENTAL_RISK; no core changes, no camera control.
//
// The import specifier MUST match progress.js exactly so this shares the same
// live config module instance.
// =============================================================================

import { FINANCIALS, ENVIRONMENTAL_RISK } from "./config.js?v=13";

export function installAiBridge() {
  let summary = null;

  function getProgressSummary() {
    if (!summary) return null;
    return {
      total: summary.total,
      installed: summary.installed,
      installedPct: summary.installedPct,
      behind: summary.behind,
      behindPct: summary.behindPct,
      daysBehind: summary.daysBehind,
      counts: summary.counts,
    };
  }

  const api = {
    ready: true,
    getProgressSummary,
    financials: FINANCIALS,
    getEnvironmentalRisk() {
      return ENVIRONMENTAL_RISK;
    },
    setSummary(s) {
      summary = s;
    },
  };
  window.CT3D = api;
  return api;
}
