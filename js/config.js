// =============================================================================
// config.js — central configuration for the 4D Construction Monitor
//
// The app ships two demo projects, chosen with the top-bar switch or the URL:
//   • vertical — Meridian Tower, a high-rise building (the default)
//   • linear   — Marina Bay East Elevated Roadway, a viaduct (?project=linear)
// The named exports resolve to the active project's values (see the end of the
// file), so modules import what they always did; project-only behaviour reads
// PROJECT (its `features`, `progressModel`, labels, …).
// =============================================================================

/** Selectable projects, in switcher order (the first is the default). */
export const PROJECT_IDS = ["vertical", "linear"];

/**
 * The project the page URL asks for (`?project=`), else the default. The
 * inline <head> script on every page applies the same rule to tag
 * <html data-project>, which the CSS uses to hide the other project's UI.
 *
 * @param {string} [search]
 * @returns {"vertical"|"linear"}
 */
export function resolveProjectId(search = location.search) {
  const id = new URLSearchParams(search).get("project");
  return PROJECT_IDS.includes(id) ? id : PROJECT_IDS[0];
}

/** ArcGIS Online portal that hosts every WebScene. */
export const PORTAL_URL = "https://www.arcgis.com";

/** Authored time-step for the slider (WebScene used 11-day stops). */
export const TIME_STEP = { value: 11, unit: "days" };

/** Neon highlight color used for the selected building component. */
export const HIGHLIGHT_COLOR = [56, 226, 234]; // cyan glow

/**
 * Opt-in Google Photorealistic 3D basemap (?basemap=photoreal or the nav-stack
 * toggle; see basemap.js). Google requires a signed-in ArcGIS user whose
 * organization enables the basemap for this site, so sign-in reuses the AI Site
 * Analyst's public OAuth client (PKCE, no secret — already shipped in
 * ./assistant), whose redirect URIs include ./oauth-callback.html.
 */
export const PHOTOREAL_OAUTH = {
  appId: "nz916xFcgmndYuSc",
  portalUrl: PORTAL_URL
};

// -----------------------------------------------------------------------------
// Vertical project — Meridian Tower
// -----------------------------------------------------------------------------

const VERTICAL = {
  id: "vertical",
  kind: "Vertical",
  name: "Meridian Tower",
  place: "Downtown Core District",
  noun: "building",
  componentTag: "Building Component",

  /** Portal item ids: the time-enabled plan and the status-rendered progress scene. */
  webSceneId: "dca938994e01425fa146c9587b3def04",
  progressWebSceneId: "e413d34ae0ed4c2da9243e4898666080",

  /**
   * Logical building layers contained in the WebScene.
   * Order roughly follows the real-world construction sequence and is reused to
   * drive the "active layers" analytics on the dashboard. `timing` staggers the
   * floor-by-floor build: each trade rises with the building but is offset by
   * its place in the sequence, so structure leads, envelope follows, cladding
   * lags and the roof trails to the top.
   */
  layers: [
    { id: "Slabs", label: "Slabs", startAt: 0.0, color: "#5eead4", timing: { lead: 0.0, end: 0.9 } },
    { id: "Columns", label: "Columns", startAt: 0.1, color: "#38bdf8", timing: { lead: 0.03, end: 0.9 } },
    { id: "Structural Framing", label: "Structural Framing", startAt: 0.2, color: "#818cf8", timing: { lead: 0.05, end: 0.92 } },
    { id: "Walls", label: "Walls", startAt: 0.45, color: "#a78bfa", timing: { lead: 0.15, end: 0.95 } },
    { id: "Plates", label: "Plates", startAt: 0.6, color: "#f472b6", timing: { lead: 0.18, end: 0.95 } },
    { id: "Roofs", label: "Roofs", startAt: 0.75, color: "#fb923c", timing: { lead: 0.7, end: 1.0 } },
    { id: "Curtain Wall Panels", label: "Curtain Wall Panels", startAt: 0.85, color: "#facc15", timing: { lead: 0.3, end: 1.0 } }
  ],

  /**
   * Construction phases mapped to a normalized progress value (0..1).
   * Used by the dashboard to translate the TimeSlider position into a human
   * readable "Current Phase".
   */
  phases: [
    { name: "Site & Foundations", until: 0.15 },
    { name: "Superstructure", until: 0.45 },
    { name: "Envelope & Enclosure", until: 0.72 },
    { name: "Roofing & Cladding", until: 0.9 },
    { name: "Finishing & Handover", until: 1.01 }
  ],

  /**
   * Authored time extent of the source WebScene (read from its TimeSlider widget
   * configuration). Used as a reliable fallback if the layers don't expose their
   * own timeInfo when first queried.
   *   startTime 1760025600000 → 09 Oct 2025
   *   endTime   1789920000000 → 20 Sep 2026
   */
  fallbackTimeExtent: {
    start: new Date(1760025600000),
    end: new Date(1789920000000)
  },

  /**
   * Exploded view — vertical zones of the BIM model, following its storey names
   * (Level_00_BASE … Level_14_MECH … Level_29_MECH … Level_Roof): the podium,
   * the mid-rise and the top with its roof, each plant (MECH) floor starting the
   * tier above it. Exploding keeps zone 0 in place and lifts zone i by i × gap
   * metres, so the tiers float apart like an exploded diagram.
   */
  explode: {
    levelField: "BldgLevel",
    gap: 15,
    zones: [
      { label: "Base", min: 0, max: 13 },
      { label: "Mid-rise", min: 14, max: 28 },
      { label: "Top", min: 29, max: 45 }
    ],
    // Map units the flattened build pad extends past the model's footprint.
    padMargin: 6,
    title: "Exploded view: lift the floors apart"
  },

  /**
   * Progress model: the planned target is configured (`plannedPct`) and the
   * slippage is read from the CStatus buckets (see PROGRESS_STATUS).
   */
  progressModel: "status",
  plannedPct: 60,

  /** Tower-only extras (the linear project hides these for now). */
  features: { audit: true, sensors: true, aiAnalyst: true, presentation: true, explode: true },

  /** Example typed into the "Ask the timeline" assistant. */
  assistantExample: "Nov 1 2025"
};

// -----------------------------------------------------------------------------
// Current-progress view — real construction status measured against the plan
// -----------------------------------------------------------------------------

/**
 * Where the *planned* schedule says the build should be at the simulated
 * "current" date, as a percent complete. The progress view compares this target
 * against how many components have actually slipped behind schedule. (The
 * linear project reads its target from the Prog_Planned field instead.)
 */
export const PLANNED_PROGRESS_PCT = VERTICAL.plannedPct;

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
VERTICAL.financials = {
  model: "constants",
  currency: { code: "USD", symbol: "$" },
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

/** AIA pay-application header for the tower (report.html). */
VERTICAL.report = {
  applicationNo: "07",
  owner: "Meridian Development Partners",
  contractNote: "Lump-sum GMP"
};

// -----------------------------------------------------------------------------
// Linear project — Marina Bay East Elevated Roadway (Singapore)
// -----------------------------------------------------------------------------
//
// A conceptual 1.54 km twin-carriageway viaduct built from two work fronts
// (West: Ch 0–760 m, East: Ch 768–1,525 m) and published as I3S from IFC 4.3
// infrastructure classes (IfcPile, IfcBearing, IfcCourse, …). Unlike the tower,
// every element carries its own simulated progress (Prog_*) and cost (Fin_*)
// fields, so the progress panel, the 5D financials and the AIA report are
// summed live from the layers' public I3S statistics rather than configured.

const LINEAR = {
  id: "linear",
  kind: "Linear",
  name: "Marina Bay East Elevated Roadway",
  place: "Marina Bay East, Singapore",
  noun: "viaduct",
  componentTag: "Roadway Component",
  /** Schedule dates are Singapore midnights; show them as such everywhere. */
  timeZone: "Asia/Singapore",

  webSceneId: "8a44ef0177c641c7ba5443b196cc79c5",
  progressWebSceneId: "3e54db048f4d44cd83a4a234cca9f1eb",

  /**
   * Scene layers in build order (`id` is the WebScene layer title). Labels name
   * what each published IFC class holds on this job — e.g. "Structural Framing"
   * carries the lighting masts. Each layer's dashboard progress is computed from
   * its own Sched_StartDate statistics (see dashboard.js), so there's no timing.
   */
  layers: [
    { id: "Structural Foundation", label: "Piles & Pile Caps", color: "#5eead4" },
    { id: "Columns", label: "Pier Stems", color: "#38bdf8" },
    { id: "Beams", label: "Crossheads & Girders", color: "#818cf8" },
    { id: "Bearings", label: "Bearings", color: "#c084fc" },
    { id: "Slabs", label: "Deck & Approach Slabs", color: "#f472b6" },
    { id: "Railings", label: "Safety Barriers", color: "#fb923c" },
    { id: "Courses", label: "Asphalt Surfacing", color: "#94a3b8" },
    { id: "Generic Model", label: "Road Markings", color: "#f1f5f9" },
    { id: "Structural Framing", label: "Lighting Masts", color: "#a3e635" },
    { id: "Lighting Fixtures", label: "Lighting Fixtures", color: "#fde047" }
  ],

  /**
   * The schedule's four Sched_Phase values overlap along the two work fronts,
   * so each hands over at the midpoint between neighbouring phases' median
   * element start (0.25 · 0.49 · 0.57 · 0.69 of the programme). `code` is the
   * Sched_Phase prefix ("04 Girder erection and deck construction"), so the
   * click tooltips use the same names.
   */
  phases: [
    { name: "Piling & Foundations", until: 0.37, code: "02" },
    { name: "Piers, Crossheads & Bearings", until: 0.53, code: "03" },
    { name: "Girder Erection & Deck", until: 0.63, code: "04" },
    { name: "Road Finishes & Lighting", until: 1.01, code: "05" }
  ],

  /** Authored TimeSlider extent: 12 Feb 2027 → 16 Nov 2027 (Singapore time). */
  fallbackTimeExtent: {
    start: new Date(1802361600000),
    end: new Date(1826294400000)
  },

  /**
   * Exploded view — the viaduct's structural systems, bottom to top, grouped by
   * each element's Sched_Category (several IFC classes mix systems, e.g. Beams
   * holds pier crossheads and girders). Tier i lifts by i × gap metres.
   */
  explode: {
    field: "Sched_Category",
    gap: 9,
    zones: [
      { label: "Foundations", values: ["Bored piles", "Pile caps", "Approach embankment"] },
      { label: "Piers", values: ["Pier stems", "Pier crossheads"] },
      { label: "Bearings", values: ["Bearings"] },
      { label: "Girders", values: ["Girder erection"] },
      { label: "Deck", values: ["Deck slab", "Approach slab"] },
      {
        label: "Finishes",
        values: ["Asphalt surfacing", "Road markings", "Safety barriers", "Lighting supports", "Lighting fixtures"]
      }
    ],
    padMargin: 6,
    title: "Exploded view: lift the viaduct's systems apart"
  },

  /**
   * Progress model: planned, installed and overdue counts (and the days late)
   * are summed from the elements' Prog_* fields; CStatus still drives the
   * status breakdown and the scene colours.
   */
  progressModel: "attributes",

  /** Element attributes shown in the click tooltip on both views. */
  tooltipFields: [
    "Name", "Sched_Phase", "Sched_StartDate", "Sched_EndDate", "Sched_WorkFront",
    "ChainageStart", "ChainageEnd", "CStatus", "Prog_TaskState", "Prog_Overdue",
    "Prog_OverdueDays", "Prog_DelayDays"
  ],

  /** Name layers by their configured labels in lists ("Lighting Masts", not "Structural Framing"). */
  relabelLayers: true,

  /** Tower-only extras stay hidden here until they're rebuilt for the roadway. */
  features: { audit: false, sensors: false, aiAnalyst: false, presentation: false, explode: true },

  assistantExample: "Jun 1 2027",

  /** The authored scenes use Google Photorealistic 3D (see basemap.js). */
  photoreal: true,

  report: {
    applicationNo: "04",
    owner: "Bayfront Infrastructure Partners",
    contractNote: "Work-package allowance"
  }
};

/**
 * 5D inputs the roadway's fields don't carry. Everything else — contract value,
 * cost to date, EAC, CPI/SPI, the current draw and the overdue value — is
 * summed from the Fin_* fields at runtime (progress-stats.js), so it always
 * reconciles with the model. Figures are illustrative, in Singapore dollars.
 *
 * Liquidated damages apply per sectional-completion milestone; the West front's
 * simulated access delay pushes all three back by the critical-path delay
 * (max Prog_DelayDays, 21 days): 21 × (5k + 8k + 12k) = S$525,000.
 */
LINEAR.financials = {
  model: "attributes",
  currency: { code: "SGD", symbol: "S$" },
  dailyLiquidatedDamages: 25_000,
  milestones: [
    { label: "M1 · West substructure complete", rate: 5_000 },
    { label: "M2 · West deck complete (S01–S24)", rate: 8_000 },
    { label: "M3 · Roadway open to traffic", rate: 12_000 }
  ],
  // Highest-value overdue work at the 3 Aug 2027 status date (Fin_OverdueValue).
  delayedComponents: [
    { label: "Girders · span S14", meta: "West · Ch 432 m · 14 d overdue", amount: 615_385 },
    { label: "Girders · span S15", meta: "West · Ch 464 m · 7 d overdue", amount: 615_385 },
    { label: "Girders · span S16", meta: "West · Ch 496 m · due now", amount: 615_385 },
    { label: "Deck pour · span S12", meta: "West · Ch 368 m · 19 d overdue", amount: 399_585 },
    { label: "Deck pour · span S13", meta: "West · Ch 400 m · 12 d overdue", amount: 399_585 },
    { label: "Wearing course · zone Z02", meta: "West · Ch 192 m · 11 d overdue", amount: 399_585 },
    { label: "Deck pour · span S14", meta: "West · Ch 432 m · 5 d overdue", amount: 399_585 },
    { label: "Pier stems · P16", meta: "West · Ch 608 m · 18 d overdue", amount: 180_000 },
    { label: "Pier stems · P17", meta: "West · Ch 640 m · 11 d overdue", amount: 180_000 },
    { label: "Pile caps · P19", meta: "West · Ch 704 m · 14 d overdue", amount: 150_000 }
  ],
  changeOrders: [
    { label: "COR-006 \u00b7 Utility diversion at Ch 420 m", meta: "Submitted", amount: 186_000 },
    { label: "COR-009 \u00b7 West-front temporary access road", meta: "Submitted", amount: 142_500 },
    { label: "COR-011 \u00b7 Extra bored-pile length, P14\u2013P16", meta: "In Review", amount: 118_000 },
    { label: "COR-014 \u00b7 Noise barriers, East Coast Park", meta: "In Review", amount: 96_500 },
    { label: "COR-017 \u00b7 Smart lighting controls", meta: "Pending", amount: 67_000 }
  ]
};

/**
 * Fields summed per layer for the attribute-driven progress + 5D model. Each
 * public I3S layer ships precomputed statistics (sum / min / max, and value
 * counts for strings), so no feature query is needed.
 */
export const ATTRIBUTE_STAT_FIELDS = [
  "Prog_Planned", "Prog_Installed", "Prog_Overdue", "Prog_OverdueDays", "Prog_DelayDays",
  "Fin_Budget", "Fin_PlannedValue", "Fin_EarnedValue", "Fin_ActualCost", "Fin_EstAtCompletion",
  "Fin_PeriodWork", "Fin_StoredMovement", "Fin_GrossToDate", "Fin_Retention",
  "Fin_PrevCertified", "Fin_NetDue", "Fin_OverdueValue", "Fin_RetainPct",
  "Prog_AsOfDate", "Fin_PeriodStart", "Fin_PeriodEnd"
];

// -----------------------------------------------------------------------------
// Active project — what every module imports
// -----------------------------------------------------------------------------

export const PROJECTS = { vertical: VERTICAL, linear: LINEAR };
export const PROJECT_ID = resolveProjectId();
export const PROJECT = PROJECTS[PROJECT_ID];

/** Portal item id of the time-enabled WebScene. */
export const WEBSCENE_ID = PROJECT.webSceneId;
/** Portal item id of the WebScene rendered by real construction status (no time). */
export const PROGRESS_WEBSCENE_ID = PROJECT.progressWebSceneId;
export const BUILDING_LAYERS = PROJECT.layers;
export const PHASES = PROJECT.phases;
export const FALLBACK_TIME_EXTENT = PROJECT.fallbackTimeExtent;
export const EXPLODE = PROJECT.explode;
export const FINANCIALS = PROJECT.financials;

/** Display label for a scene layer title ("Slabs (Current)" → "Deck & Approach Slabs"). */
export function layerLabel(title = "") {
  const clean = title.replace(/\s*\(current\)\s*$/i, "").trim();
  return BUILDING_LAYERS.find((l) => l.id.toLowerCase() === clean.toLowerCase())?.label ?? clean;
}

/**
 * Same-site link to a page that keeps the visitor's project and basemap choice
 * (and nothing else, so one-off flags like ?welcome don't stick).
 *
 * @param {string} page e.g. "./progress.html"
 * @param {{ project?: string }} [overrides]
 */
export function pageHref(page, overrides = {}) {
  const current = new URLSearchParams(location.search);
  const params = new URLSearchParams();
  const project = overrides.project ?? PROJECT_ID;
  if (project !== PROJECT_IDS[0]) params.set("project", project);
  const basemap = current.get("basemap");
  if (basemap && PROJECTS[project]?.photoreal) params.set("basemap", basemap);
  const query = params.toString();
  return query ? `${page}?${query}` : page;
}
