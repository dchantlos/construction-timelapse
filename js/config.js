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
  buckets: [
    { value: "Installed", label: "Installed", color: "#4ade80" },
    { value: "Scheduled_10_Days", label: "Due within 10 days", color: "#facc15" },
    { value: "Scheduled_11_to_30_Days", label: "Due in 11\u201330 days", color: "#fb923c" },
    { value: "Scheduled_31_Plus_Days", label: "Scheduled 31+ days", color: "#64748b" }
  ]
};
