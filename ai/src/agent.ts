// =============================================================================
// agent.ts — the custom "Site Conditions" agent (ArcGIS AI components beta).
//
// Built with the SDK's agent utilities (LLMAgent + FunctionTool + Zod), the
// recommended lower-boilerplate path. The LLM decides which tool to call; each
// tool returns real readings from feed.ts, so the assistant never invents data.
// =============================================================================

import { LLMAgent } from "@arcgis/ai-components/agent-utils/LLMAgent.js";
import { FunctionTool } from "@arcgis/ai-components/agent-utils/tools/FunctionTool.js";
import { z } from "zod";

import { getSiteConditions, assessCrane, assessGas, analyzeConditionTrends, craneLiftWindows, windImpactHours } from "./feed";

// These tools take no input; the site is fixed. An empty object schema is valid.
const noInput = z.object({});

const getSiteConditionsTool = new FunctionTool({
  name: "getSiteConditions",
  description:
    "Get current on-site conditions for the Zürich construction site: wind at the tower-crane apex, the harmful-gas panel (CO, CO2, NO2, O3, VOCs, CH4), dust (PM10), boundary noise, and live temperature/humidity/air-quality. Returns numeric values with their safety category. Use for general 'what are the conditions / air quality / how windy / how noisy' questions.",
  inputSchema: noInput,
  execute: async () => JSON.stringify(await getSiteConditions()),
});

const assessCraneSafetyTool = new FunctionTool({
  name: "assessCraneSafety",
  description:
    "Assess whether it is safe to operate the tower crane right now, using the live wind speed and gust at the crane apex against the 20 m/s stand-down limit. Use for any crane, lifting, or working-at-height wind question.",
  inputSchema: noInput,
  execute: async () => JSON.stringify(await assessCrane()),
});

const assessGasSafetyTool = new FunctionTool({
  name: "assessGasSafety",
  description:
    "Assess the harmful-gas panel (CO, CO2, NO2, O3, VOCs, CH4) at the on-site multi-gas cabinet against watch/caution/hazard thresholds and report any elevated readings. Use for air-safety, gas, or confined-space questions.",
  inputSchema: noInput,
  execute: async () => JSON.stringify(await assessGas()),
});

const analyzeTrendsTool = new FunctionTool({
  name: "analyzeConditionTrends",
  description:
    "Analyse the whole-day sensor time series (wind, dust/PM10, ozone, NO2, noise) for the Zürich site — returns each metric's min/max/average, the time of day it peaks, and whether it is rising, falling, or steady. Use for questions about patterns, trends, 'how has it changed today', 'when is it worst', or to summarise the day.",
  inputSchema: noInput,
  execute: async () => JSON.stringify(await analyzeConditionTrends()),
});

const craneWindowsTool = new FunctionTool({
  name: "forecastCraneLiftWindows",
  description:
    "Analyse today's crane-apex wind time series to recommend safe tower-crane lifting windows (spans where the mean wind stays below the 12 m/s caution level) and report the day's peak wind and gust with their times. Use for planning: 'when should we schedule lifts', 'best time to lift', 'when will it be too windy'.",
  inputSchema: noInput,
  execute: async () => JSON.stringify(await craneLiftWindows()),
});

// Fallback figures if the 3D bridge (parent app) isn't present (e.g. standalone).
const FALLBACK_FINANCIALS = {
  dailyLiquidatedDamages: 10000,
  cpi: 0.89,
  spi: 0.9,
  delayedComponentsCost: 850000,
  contractValue: 145000000,
};

// Format money exactly like the Financials (5D) tab (money() in js/progress-financial.js).
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

async function analyzeScheduleCostImpact() {
  const wind = await windImpactHours();
  const bridge = (window as any).CT3D;
  const summary = bridge?.getProgressSummary?.() ?? null;
  const fin = bridge?.financials ?? FALLBACK_FINANCIALS;
  const daysBehind = summary ? Math.round(summary.daysBehind ?? 0) : 14;
  const componentsBehind = summary ? summary.behind : 238;
  const penalty = daysBehind * (fin.dailyLiquidatedDamages ?? 10000);
  return {
    basis: "Cross-domain analysis: IoT wind time series × live construction-status model × 5D financials.",
    source: summary
      ? "live schedule model + live wind feed"
      : "wind feed + representative schedule figures (3D scene not loaded)",
    windToday: {
      craneHoursAboveCaution: wind.cautionHours,
      craneHoursAboveStandDown: wind.standDownHours,
      peakWind_ms: wind.peakWind_ms,
      note: "Hours the crane-apex wind sat at/above the 12 m/s caution and 20 m/s stand-down limits — a proxy for wind-driven crane downtime.",
    },
    currency: "USD",
    schedule: { daysBehind, componentsBehind, spi: fin.spi },
    cost: {
      dailyLiquidatedDamages: usd(fin.dailyLiquidatedDamages ?? 10000) + "/day",
      estimatedDelayPenalty: usd(penalty),
      cpi: fin.cpi,
      delayedComponentsValue: usd(fin.delayedComponentsCost ?? 850000),
    },
    link: "Tower-crane lifts (structural framing, curtain-wall panels) are wind-sensitive, so hours of high wind reduce available lift time. That shows up as crane-dependent components slipping behind schedule and accruing liquidated-damages exposure at the daily rate.",
  };
}

const scheduleCostTool = new FunctionTool({
  name: "analyzeScheduleCostImpact",
  description:
    "Connect the IoT weather data to the project's schedule and cost. Estimates crane-hours lost to high wind today, reads the live schedule slippage (days behind, components behind) and the 5D financials (liquidated-damages penalty, CPI/SPI), and explains the link between wind, crane-dependent slippage, and cost exposure. Use for 'business impact', 'how is weather affecting the schedule or cost', 'why are we behind', or 'what do delays cost'.",
  inputSchema: noInput,
  execute: async () => JSON.stringify(await analyzeScheduleCostImpact()),
});

// Fallback if the read-only 3D bridge (parent app) isn't present (standalone dev).
const FALLBACK_ENVIRONMENTAL = {
  windDaysLost: 3,
  heatAdvisories: 2,
  gasStandDowns: 2,
  total: 100500,
  events: [
    { category: "wind", sensor: "Crane-apex wind sensor (WIND-01)", label: "Tower Crane T2 · high-wind stand-down", meta: "3 days · gusts >45 mph", amount: 30000 },
    { category: "heat", sensor: "Site weather station", label: "High-heat advisory · crew work stoppage", meta: "2 days · heat index >105°F", amount: 22000 },
    { category: "wind", sensor: "Crane-apex wind sensor (WIND-01)", label: "Idle equipment · weather hold", meta: "Cranes + hoists", amount: 18000 },
    { category: "gas", sensor: "Multi-gas cabinet (GAS-01)", label: "Ground-crew evacuation · CO alert", meta: "Level 07 · 42 ppm", amount: 12500 },
    { category: "gas", sensor: "Multi-gas cabinet (GAS-01)", label: "Ventilation & re-entry testing · CO₂", meta: "Basement · 5,000 ppm", amount: 8000 },
    { category: "gas", sensor: "Site-wide air-quality sensors", label: "Air-quality monitoring & remediation", meta: "Site-wide sensors", amount: 10000 },
  ],
};

async function analyzeEnvironmentalImpact() {
  const bridge = (window as any).CT3D;
  const env = bridge?.getEnvironmentalRisk?.() ?? FALLBACK_ENVIRONMENTAL;
  const events: Array<{ category?: string; sensor?: string; label: string; meta: string; amount: number }> =
    Array.isArray(env.events) ? env.events : [];
  const catRaw: Record<string, { cost: number; events: number }> = {};
  for (const e of events) {
    const c = e.category ?? "other";
    if (!catRaw[c]) catRaw[c] = { cost: 0, events: 0 };
    catRaw[c].cost += e.amount ?? 0;
    catRaw[c].events += 1;
  }
  const byCategory: Record<string, { cost: string; events: number }> = {};
  for (const [c, v] of Object.entries(catRaw)) byCategory[c] = { cost: usd(v.cost), events: v.events };
  const wind = await windImpactHours();
  const summary = bridge?.getProgressSummary?.() ?? null;
  return {
    basis:
      "Sensor-attributed environmental cost: idle-time and remediation events flagged by the site's ArcGIS Velocity IoT sensors — tower-crane high-wind stand-downs, harmful-gas (CO/CO₂) crew evacuations, and heat-index work stoppages.",
    source: bridge?.getEnvironmentalRisk
      ? "live Financials (5D) risk model"
      : "representative environmental risk figures (3D scene not loaded)",
    currency: "USD",
    totalCost: usd(env.total),
    counts: {
      windDaysLost: env.windDaysLost,
      heatAdvisories: env.heatAdvisories,
      gasStandDowns: env.gasStandDowns,
    },
    byCategory,
    events: events.map((e) => ({
      category: e.category,
      sensor: e.sensor,
      label: e.label,
      detail: e.meta,
      cost: usd(e.amount ?? 0),
    })),
    liveWindContext: {
      craneHoursAboveCaution: wind.cautionHours,
      craneHoursAboveStandDown: wind.standDownHours,
      peakWind_ms: wind.peakWind_ms,
      note: "Today's live crane-apex wind hours at/above the 12 m/s caution and 20 m/s stand-down limits — the same wind exposure that drives the stand-down costs.",
    },
    scheduleContext: summary
      ? { daysBehind: Math.round(summary.daysBehind ?? 0), componentsBehind: summary.behind }
      : null,
    link:
      "High wind on the tower crane, harmful-gas evacuations, and heat-index stoppages each cost idle crew/equipment time plus remediation. Summed, these sensor-flagged holds have added the environmental exposure above — compounding, and separate from, the schedule-delay penalty.",
  };
}

const environmentalImpactTool = new FunctionTool({
  name: "analyzeEnvironmentalImpact",
  description:
    "Explain how environmental conditions flagged by the site's IoT sensors have added to project COST and DELAY: tower-crane high-wind stand-downs, harmful-gas (CO/CO₂) crew evacuations, and heat-index work stoppages. Returns the itemised sensor-flagged costs, per-category subtotals (wind / gas / heat), the counts of wind days lost, gas evacuations and heat advisories, and ties them to today's live crane wind. Use for 'how have environmental factors / weather / high winds / gas alerts contributed to delay and cost', 'what have crane wind stand-downs or gas evacuations cost us', 'break down the environmental / sensor-related costs', or 'why did we evacuate and what did it cost'.",
  inputSchema: noInput,
  execute: async () => JSON.stringify(await analyzeEnvironmentalImpact()),
});

export const agentTools = [
  getSiteConditionsTool,
  assessCraneSafetyTool,
  assessGasSafetyTool,
  analyzeTrendsTool,
  craneWindowsTool,
  scheduleCostTool,
  environmentalImpactTool,
];

// The description drives the assistant's orchestrator routing — be specific about
// when to use this agent, with example prompts.
const description = String.raw`- **Site Conditions** — An AI analyst for the Zürich construction site's live ArcGIS Velocity IoT feeds. It answers questions about current conditions (crane wind and lift safety, air quality, harmful gases CO/CO2/NO2/O3/VOCs/CH4, dust/PM10, noise, temperature, humidity), analyses whole-day trends and patterns, recommends tower-crane lifting windows, explains how the weather is affecting the project's schedule and cost, and itemises how sensor-flagged environmental events (wind stand-downs, gas evacuations, heat holds) have added to project delay and cost.

  _Example queries:_
  - "How is the weather affecting our schedule and cost?"
  - "What's our schedule delay penalty, and why are we behind?"
  - "What have wind stand-downs and gas evacuations cost us?"
  - "Is it safe to run the tower crane right now?"
  - "When are the safe crane lifting windows today?"`;

// The system prompt guiding tool use and answer style.
const prompt = String.raw`You are the AI Site Analyst for an active construction site in Zürich, Switzerland, wired to its live ArcGIS Velocity IoT feeds.

Always use your tools to fetch real data before answering — never invent or guess a value:
- Current conditions or air quality → getSiteConditions.
- Crane / lifting / working-at-height wind safety right now → assessCraneSafety.
- Gas / air-safety / confined-space → assessGasSafety.
- Patterns, trends, "how has it changed today", "when is it worst", day summaries → analyzeConditionTrends.
- Planning lifts / best time to lift / when it will be too windy → forecastCraneLiftWindows.
- The schedule delay impact / liquidated-damages penalty / how the weather is affecting the schedule or cost right now / why we're behind / what the delay costs → analyzeScheduleCostImpact.
- How environmental events have ADDED to cost or delay — itemised wind stand-downs, gas evacuations, heat holds, "what did the crane wind or gas alerts cost us", a breakdown of sensor-flagged costs → analyzeEnvironmentalImpact.

When you answer:
- Lead with the direct answer or verdict, then support it with the key numbers (with units and safety category).
- All monetary figures are in US dollars (USD). Present every cost exactly as the tool's USD-formatted string (e.g. $140,000) — never convert currency, change the digits, or reformat; these match the Financials (5D) tab.
- Always state the threshold you compared against (e.g. the 20 m/s crane stand-down limit, 12 m/s caution).
- For trend/pattern questions, call out the peak time of day and the trend direction; for lift planning, give the recommended windows explicitly.
- Be concise and practical, as if briefing a site supervisor.
- Briefly note that wind/gas/dust/noise are ArcGIS Velocity telemetry and temperature/humidity/air-quality are live (Open-Meteo).
- If a tool returns an error, say the reading is unavailable rather than guessing.`;

const siteConditionsAgent = new LLMAgent({
  name: "Site Conditions",
  description,
  prompt,
  modelTier: "fast",
  tools: agentTools,
});

export const SiteConditionsAgent = siteConditionsAgent.registration;
