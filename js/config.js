// =============================================================================
// config.js — central configuration for the 4D Construction Monitor
// =============================================================================

/** Portal item id of the time-enabled WebScene. */
export const WEBSCENE_ID = "dca938994e01425fa146c9587b3def04";

/** ArcGIS Online portal that hosts the WebScene. */
export const PORTAL_URL = "https://www.arcgis.com";

/**
 * Logical building layers contained in the WebScene.
 * Order roughly follows the real-world construction sequence and is reused to
 * drive the "active layers" analytics on the dashboard.
 */
export const BUILDING_LAYERS = [
  { id: "Slabs", label: "Slabs", startAt: 0.0, color: "#5eead4" },
  { id: "Columns", label: "Columns", startAt: 0.1, color: "#38bdf8" },
  { id: "Structural Framing", label: "Structural Framing", startAt: 0.2, color: "#818cf8" },
  { id: "Walls", label: "Walls", startAt: 0.45, color: "#a78bfa" },
  { id: "Plates", label: "Plates", startAt: 0.6, color: "#f472b6" },
  { id: "Roofs", label: "Roofs", startAt: 0.75, color: "#fb923c" },
  { id: "Curtain Wall Panels", label: "Curtain Wall Panels", startAt: 0.85, color: "#facc15" }
];

/**
 * Construction phases mapped to a normalized progress value (0..1).
 * Used by the dashboard to translate the TimeSlider position into a human
 * readable "Current Phase".
 */
export const PHASES = [
  { name: "Site & Foundations", until: 0.15 },
  { name: "Superstructure", until: 0.45 },
  { name: "Envelope & Enclosure", until: 0.72 },
  { name: "Roofing & Cladding", until: 0.9 },
  { name: "Finishing & Handover", until: 1.01 }
];

/**
 * Authored time extent of the source WebScene (read from its TimeSlider widget
 * configuration). Used as a reliable fallback if the layers don't expose their
 * own timeInfo when first queried.
 *   startTime 1760025600000 → 09 Oct 2025
 *   endTime   1789920000000 → 20 Sep 2026
 */
export const FALLBACK_TIME_EXTENT = {
  start: new Date(1760025600000),
  end: new Date(1789920000000)
};

/** Authored time-step for the slider (WebScene used 11-day stops). */
export const TIME_STEP = { value: 11, unit: "days" };

/** Neon highlight color used for the selected building component. */
export const HIGHLIGHT_COLOR = [56, 226, 234]; // cyan glow

// -----------------------------------------------------------------------------
// Current-progress view — real construction status measured against the plan
// -----------------------------------------------------------------------------

/** Portal item id of the WebScene rendered by real construction status (no time). */
export const PROGRESS_WEBSCENE_ID = "e413d34ae0ed4c2da9243e4898666080";

/**
 * Where the *planned* schedule says the build should be at the simulated
 * "current" date, as a percent complete. The progress view compares this target
 * against how many components have actually slipped behind schedule.
 */
export const PLANNED_PROGRESS_PCT = 60;

/**
 * The real construction-status field carried by the "(Current)" building layers
 * and the buckets surfaced on the progress panel. `behindValues` are the near-
 * term statuses that should already have been built by the planned date but
 * haven't — i.e. the schedule slippage.
 */
export const PROGRESS_STATUS = {
  field: "CStatus",
  installedValue: "Installed",
  behindValues: ["Scheduled_10_Days", "Scheduled_11_to_30_Days"],
  // Representative "days behind schedule" for each slipped bucket (the midpoint
  // of its window) — used to estimate an approximate average lateness.
  behindDays: {
    Scheduled_10_Days: 5,
    Scheduled_11_to_30_Days: 20
  },
  buckets: [
    { value: "Installed", label: "Installed", color: "#4ade80" },
    { value: "Scheduled_10_Days", label: "Due within 10 days", color: "#3b82f6" },
    { value: "Scheduled_11_to_30_Days", label: "Due in 11–30 days", color: "#c1440e" },
    { value: "Scheduled_31_Plus_Days", label: "Scheduled 31+ days", color: "#64748b" }
  ]
};

// -----------------------------------------------------------------------------
// 5D cost model — translates the 4D schedule slippage into dollars
// -----------------------------------------------------------------------------

/**
 * Financial figures for the "Financials (5D)" panel. The fixed contract values,
 * EVM indices and the current pay-application draw are project constants; the
 * schedule-driven risk numbers (delay penalty, count of overdue components) are
 * recomputed at render time from the live CStatus summary so the 5D view stays
 * tied to the real 4D progress.
 *
 * Derived checks (kept exact against the source figures):
 *   budgetExpendedPct = costToDate / contractValue = 60.5%
 *   EAC overrun       = estAtCompletion − contractValue = $2.2M
 *   netPaymentDue     = (workCompleted + materialsStored) × (1 − retainage) = $5,415,000
 *   delayPenalty      = daysBehind × dailyLiquidatedDamages ≈ 14 × $10k = $140,000
 */
export const FINANCIALS = {
  contractValue: 145_000_000,
  costToDate: 87_725_000,
  estAtCompletion: 147_200_000,
  budgetExpendedPct: 60.5, // cost expended as a % of contract (doughnut fill)
  cpi: 0.89, // Cost Performance Index — earning $0.89 per $1 spent
  spi: 0.9, // Schedule Performance Index — 54% effective vs 60% planned
  dailyLiquidatedDamages: 10_000, // $/day penalty applied to days behind schedule
  delayedComponentsCost: 850_000, // installed value of the overdue components
  pendingChangeOrders: 425_000, // change orders awaiting owner approval
  draw: {
    period: "April 2026",
    workCompleted: 4_500_000,
    materialsStored: 1_200_000,
    retainagePct: 5
  }
};

/**
 * Environmental sensor exposure for the Financials (5D) risk card and the AI
 * Site Analyst. Illustrative idle-time / remediation costs, each flagged by a
 * site IoT sensor — tower-crane high-wind stand-downs, harmful-gas (CO/CO₂)
 * crew evacuations, and heat-index work stoppages. `events` is the single
 * source of truth: the drill-down window lists them and the risk-card total is
 * their sum (30 + 22 + 18 + 12.5 + 8 + 10 = $100.5k).
 */
export const ENVIRONMENTAL_RISK = {
  windDaysLost: 3,
  heatAdvisories: 2,
  gasStandDowns: 2,
  total: 100_500,
  events: [
    { category: "wind", sensor: "Crane-apex wind sensor (WIND-01)", label: "Tower Crane T2 \u00b7 high-wind stand-down", meta: "3 days \u00b7 gusts >45 mph", amount: 30_000 },
    { category: "heat", sensor: "Site weather station", label: "High-heat advisory \u00b7 crew work stoppage", meta: "2 days \u00b7 heat index >105\u00b0F", amount: 22_000 },
    { category: "wind", sensor: "Crane-apex wind sensor (WIND-01)", label: "Idle equipment \u00b7 weather hold", meta: "Cranes + hoists", amount: 18_000 },
    { category: "gas", sensor: "Multi-gas cabinet (GAS-01)", label: "Ground-crew evacuation \u00b7 CO alert", meta: "Level 07 \u00b7 42 ppm", amount: 12_500 },
    { category: "gas", sensor: "Multi-gas cabinet (GAS-01)", label: "Ventilation & re-entry testing \u00b7 CO\u2082", meta: "Basement \u00b7 5,000 ppm", amount: 8_000 },
    { category: "gas", sensor: "Site-wide air-quality sensors", label: "Air-quality monitoring & remediation", meta: "Site-wide sensors", amount: 10_000 },
  ],
};

// -----------------------------------------------------------------------------
// IDS model audit — buildingSMART Information Delivery Specification
// -----------------------------------------------------------------------------
//
// A second bSI openBIM deliverable alongside the IFC-derived model: an IDS file
// (ids/construction-timelapse.ids) is parsed in the browser and the published
// scene is audited against it live, using the I3S per-attribute statistics that
// progress-stats.js already reads anonymously.

/** Location of the IDS 1.0 specification file to audit the model against. */
export const IDS_URL = "./ids/construction-timelapse.ids";

/**
 * Map the IFC entity names used in the IDS applicability facets to the WebScene
 * building-layer titles that represent them. Each layer is a federated IFC
 * class (the source model was authored in IFC and published as scene layers).
 */
export const IFC_ENTITY_LAYERS = {
  IFCSLAB: "Slabs",
  IFCCOLUMN: "Columns",
  IFCBEAM: "Structural Framing",
  IFCWALL: "Walls",
  IFCPLATE: "Plates",
  IFCROOF: "Roofs",
  IFCCURTAINWALL: "Curtain Wall Panels"
};

/**
 * Bridge IDS requirement facets (attribute names and property baseNames) to the
 * scene-service field that carries the value. The IDS keeps authentic IFC names
 * (e.g. PredefinedType, ThermalTransmittance); the published layers flatten them
 * to these fields, so the audit checks the right column.
 */
export const IDS_FIELD_MAP = {
  // IfcRoot / entity attributes
  GlobalId: "GlobalId",
  Name: "Name",
  PredefinedType: "PreDefinedType",
  // Pset_*Common properties
  FireRating: "FireRating",
  LoadBearing: "LoadBearing",
  IsExternal: "IsExternal",
  ThermalTransmittance: "ThermalTransmittance",
  // Pset_4D_ConstructionSequencing (project 4D schedule properties)
  ScheduledPhase: "Sched_Phase",
  PlannedStartDate: "Sched_StartDate",
  PlannedFinishDate: "Sched_EndDate",
  ConstructionStatus: "CStatus"
};

/**
 * Candidate fields that satisfy a classification requirement — an element is
 * classified if any of these carries a value.
 */
export const IDS_CLASSIFICATION_FIELDS = ["AssemblyCode", "OmniClass"];
