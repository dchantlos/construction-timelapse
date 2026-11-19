export const INSTRUMENT_SOURCE = "simulation";
export const INSTRUMENT_COLORS = Object.freeze(["#4ade80", "#facc15", "#fb923c", "#f87171"]);
export const INSTRUMENT_NO_DATA = "#94a3b8";

export const INSTRUMENT_FEEDS = Object.freeze({
  settlement: { title: "Settlement", glyph: "move-down", mapColor: "#c084fc", primary: "Settlement_mm", unit: "mm", decimals: 2,
    label: "Ground settling",
    description: "How far the ground has moved down since the reference survey. The color reflects how quickly it is settling, in millimetres per hour, not just the total movement shown.",
    alertText: "The ground is sinking faster than the demo's alert setting.",
    gradeField: "SettlementRate_mm_h", bands: [0.1, 0.2, 0.3], state: "MovementState",
    metrics: [["SettlementRate_mm_h", "Settling speed", "mm/h"], ["ReferenceID", "Survey reference", ""]] },
  groundwater: { title: "Groundwater", glyph: "waves", mapColor: "#38bdf8", primary: "PorePressure_kPa", unit: "kPa", decimals: 1,
    label: "Water pressure",
    description: "Water pressure below ground, measured in kilopascals (kPa). The color reflects the change from the starting pressure, not the water depth.",
    alertText: "Water pressure below ground has risen beyond the demo's alert setting.",
    gradeField: "PressureChange_kPa", bands: [10, 18, 26], state: "PressureTrend",
    metrics: [["PressureChange_kPa", "Pressure change", "kPa"], ["TipDepth_m", "Probe depth", "m"]] },
  vibration: { title: "Vibration", glyph: "activity", mapColor: "#fb7185", primary: "PPV_Max_mm_s", unit: "mm/s", decimals: 2,
    label: "Ground vibration",
    description: "How fast the ground moves during shaking, in millimetres per second (mm/s). Larger values mean stronger vibration, not faster vehicles.",
    alertText: "Ground shaking is stronger than the demo's alert setting.",
    gradeField: "PPV_Max_mm_s", bands: [2, 4, 6], state: "WorkActivity",
    metrics: [["PPV_X_mm_s", "X velocity", "mm/s"], ["PPV_Y_mm_s", "Y velocity", "mm/s"],
      ["PPV_Z_mm_s", "Z velocity", "mm/s"], ["DominantFrequency_Hz", "Frequency", "Hz"], ["Window_s", "Window", "s"]] },
  concrete: { title: "Concrete", glyph: "thermometer", mapColor: "#fbbf24", primary: "CoreTemp_C", unit: "\u00b0C", decimals: 1,
    label: "Concrete temp.",
    description: "Temperature inside freshly poured concrete as it hardens. The color reflects the temperature difference between its center and surface, not its strength.",
    alertText: "There is a large temperature difference between the concrete's center and surface.",
    gradeField: "TempDifference_C", bands: [12, 18, 22], state: "CuringPhase",
    metrics: [["SurfaceTemp_C", "Surface temperature", "\u00b0C"], ["TempDifference_C", "Center-to-surface gap", "\u00b0C"],
      ["AgeHours", "Time since pour", "h"], ["PourID", "Pour reference", ""], ["Elevation_m", "Sensor height", "m"]] },
  runoff: { title: "Runoff", glyph: "droplets", mapColor: "#2dd4bf", primary: "Turbidity_NTU", unit: "NTU", decimals: 1,
    label: "Runoff cloudiness",
    description: "How cloudy the water draining from the site is. NTU is a cloudiness scale: higher readings mean murkier water. This is not a chemical-contamination test.",
    alertText: "Water draining from the site is cloudier than the demo's alert setting.",
    gradeField: "Turbidity_NTU", bands: [30, 80, 150], state: "RunoffState",
    metrics: [["pH", "pH", ""], ["WaterDepth_m", "Water depth", "m"], ["Flow_L_s", "Flow", "L/s"]] },
  paving: { title: "Paving", glyph: "construction", mapColor: "#fb923c", primary: "SurfaceTemp_C", unit: "\u00b0C", decimals: 1,
    label: "Asphalt temp.",
    description: "Temperature of freshly laid asphalt near the roller. Asphalt becomes harder to compact as it cools. The color is assessed only while compaction readings are valid.",
    alertText: "The asphalt has cooled below the demo's compaction-temperature setting.",
    gradeField: "SurfaceTemp_C", bands: [125, 115, 105], descending: true, state: "OperatingState",
    metrics: [["RollerSpeed_kmh", "Roller speed", "km/h"], ["PassCount", "Roller passes", ""], ["RollerCMV", "Compaction index", ""],
      ["CompactionValid", "Compaction assessed", ""], ["Elevation_m", "Sensor height", "m"]] },
  traffic: { title: "Traffic", glyph: "car", mapColor: "#a3e635", primary: "QueueLength_m", unit: "m", decimals: 0,
    label: "Traffic queue",
    description: "Length of the line of waiting vehicles, in metres, not their speed. A reading of 12 m means the waiting line is about 12 metres long.",
    alertText: "The line of waiting vehicles is longer than the demo's alert setting.",
    gradeField: "QueueLength_m", bands: [50, 120, 180], state: "TrafficState",
    metrics: [["MeanSpeed_kmh", "Average vehicle speed", "km/h"], ["VehicleCount_1min", "Vehicles in last minute", ""]] }
});

export function describeInstrument(feedId, feature, { stale = false } = {}) {
  const config = INSTRUMENT_FEEDS[feedId];
  if (!config) throw new Error("Unknown roadway instrument feed");
  const attributes = feature?.attributes;
  const value = attributes?.[config.primary];
  const grade = attributes?.[config.gradeField];
  const valid = !stale && attributes?.Quality === "Good" && Number.isFinite(value);
  let level = null;
  if (valid && Number.isFinite(grade) && (feedId !== "paving" || attributes.CompactionValid === 1)) {
    level = config.bands.filter(threshold => config.descending ? grade <= threshold : grade >= threshold).length;
  }
  return { config, value: valid ? value : null, text: valid ? value.toFixed(config.decimals) : "--", level,
    color: level === null ? INSTRUMENT_NO_DATA : INSTRUMENT_COLORS[level],
    state: valid ? String(attributes[config.state] ?? "").replaceAll("_", " ") : stale ? "Stale" : "Unavailable" };
}