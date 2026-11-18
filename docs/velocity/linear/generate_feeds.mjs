import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export const START_MS = Date.parse("2027-08-03T07:00:00+08:00");
export const STEP_MS = 60000;
export const STEPS = 1440;
export const COMMON_FIELDS = ["Timestamp", "SensorID", "TrackID", "Longitude", "Latitude", "Chainage_m", "WorkFront"];
export const TRAILING_FIELDS = ["Quality", "IsSimulated", "ScenarioTimestamp"];
const directory = dirname(fileURLToPath(import.meta.url));
const round = (value, places = 2) => {
  const rounded = Number(value.toFixed(places));
  return Object.is(rounded, -0) ? 0 : rounded;
};
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function projectPoint(longitude, latitude) {
  const radians = Math.PI / 180;
  const radius = 6378137;
  return { x: round(radius * longitude * radians), y: round(radius * Math.log(Math.tan(Math.PI / 4 + latitude * radians / 2))) };
}

export function activityAt(hour) {
  if (hour < 6.5 || hour >= 18.5) return 0;
  const shift = hour < 8 ? (hour - 6.5) / 1.5 : hour < 16 ? 1 : (18.5 - hour) / 2.5;
  return clamp(shift * (hour >= 12 && hour < 13 ? 0.6 : 1), 0, 1);
}

export function pulse(hour, center, width) {
  return Math.exp(-0.5 * ((hour - center) / width) ** 2);
}

const station = (id, longitude, latitude, chainage, front) => ({
  id, track: `MBE-${id}`, longitude, latitude, chainage, front, ...projectPoint(longitude, latitude)
});

function settlementAt(tick, index) {
  const base = index ? 6 : 3;
  return base + (index ? 3 : 1.5) * (1 - Math.exp(-tick / 480));
}

function porePressureAt(hour, index) {
  return (index ? 82 : 68) + 3 * Math.sin(hour * Math.PI / 12) + 22 * pulse(hour, 15.2, 1.1);
}

export const FEEDS = [
  {
    name: "settlement", title: "Approach embankment settlement", fieldTypes: {
      Settlement_mm: "Float64", SettlementRate_mm_h: "Float64", ReferenceID: "String", MovementState: "String"
    },
    sensors: [station("LIN-SET-W01", 103.87304298, 1.29089857, 112, "West"), station("LIN-SET-E01", 103.8843958, 1.2943724, 1472, "East")],
    values({ tick, index, sensor }) {
      const movement = settlementAt(tick, index);
      const rate = (settlementAt(tick + 1, index) - movement) * 60;
      return { Settlement_mm: round(movement, 3), SettlementRate_mm_h: round(rate, 3),
        ReferenceID: `${sensor.id}-BASELINE`, MovementState: rate >= 0.1 ? "Settling" : "Slowing" };
    }
  },
  {
    name: "groundwater", title: "Piezometer pore-water pressure", fieldTypes: {
      PorePressure_kPa: "Float64", PressureChange_kPa: "Float64", TipDepth_m: "Float64", PressureTrend: "String"
    },
    sensors: [station("LIN-PIE-W01", 103.87316886, 1.29097311, 128, "West"), station("LIN-PIE-E01", 103.88353276, 1.2944184, 1376, "East")],
    values({ hour, index }) {
      const pressure = porePressureAt(hour, index);
      const trend = (porePressureAt(hour + 1 / 60, index) - pressure) * 60;
      return { PorePressure_kPa: round(pressure), PressureChange_kPa: round(pressure - (index ? 82 : 68)),
        TipDepth_m: index ? 10 : 8, PressureTrend: trend >= 1 ? "Rising" : trend <= -1 ? "Falling" : "Steady" };
    }
  },
  {
    name: "vibration", title: "Construction vibration at receptors", fieldTypes: {
      PPV_X_mm_s: "Float64", PPV_Y_mm_s: "Float64", PPV_Z_mm_s: "Float64", PPV_Max_mm_s: "Float64",
      DominantFrequency_Hz: "Float64", Window_s: "Int32", WorkActivity: "String"
    },
    sensors: [station("LIN-VIB-W01", 103.87758178, 1.29338146, 704, "West"), station("LIN-VIB-E01", 103.88034151, 1.29428464, 1024, "East")],
    values({ tick, hour, activity, index }) {
      const peak = 0.04 + activity * (0.8 + 5.8 * pulse(hour, 10.2 + index * 0.5, 0.24) + 4 * pulse(hour, 14.1, 0.22));
      const horizontal = round(peak * (0.75 + 0.08 * Math.sin(tick / 9)), 3);
      const transverse = round(peak * 0.68, 3);
      const vertical = round(peak, 3);
      return { PPV_X_mm_s: horizontal, PPV_Y_mm_s: transverse, PPV_Z_mm_s: vertical,
        PPV_Max_mm_s: Math.max(horizontal, transverse, vertical), DominantFrequency_Hz: round(11 + 3 * Math.sin(tick / 25 + index)),
        Window_s: 60, WorkActivity: activity > 0.2 ? "Foundation_Works" : "Background" };
    }
  },
  {
    name: "concrete", title: "Deck concrete thermal monitoring", fieldTypes: {
      CoreTemp_C: "Float64", SurfaceTemp_C: "Float64", TempDifference_C: "Float64", AgeHours: "Float64",
      PourID: "String", CuringPhase: "String"
    },
    sensors: [station("LIN-CURE-W01", 103.87584669, 1.29162121, 432, "West"), station("LIN-CURE-E01", 103.88049071, 1.2940992, 1040, "East")],
    values({ tick, index, sensor }) {
      const age = 4 + index * 3 + tick / 60;
      const core = round(30 + 33 * pulse(age, 14, 7));
      const surface = round(30 + 12 * pulse(age, 14, 8));
      return { CoreTemp_C: core, SurfaceTemp_C: surface, TempDifference_C: round(Math.abs(core - surface)),
        AgeHours: round(age), PourID: `MBE-${sensor.front.toUpperCase()}-POUR-01`, CuringPhase: age < 14 ? "Warming" : "Cooling" };
    }
  },
  {
    name: "runoff", title: "Temporary drainage and treatment outlets", fieldTypes: {
      Turbidity_NTU: "Float64", pH: "Float64", WaterDepth_m: "Float64", Flow_L_s: "Float64", RunoffState: "String"
    },
    sensors: [station("LIN-WATER-W01", 103.87419723, 1.29150992, 256, "West"), station("LIN-WATER-E01", 103.8838219, 1.29435486, 1408, "East")],
    values({ hour, index, tick }) {
      const rainfall = pulse(hour, 15 + index * 0.1, 0.55);
      const recovery = pulse(hour, 16.1, 1);
      return { Turbidity_NTU: round(12 + 120 * rainfall + 25 * recovery), pH: round(7.1 + 0.15 * Math.sin(tick / 80)),
        WaterDepth_m: round(0.12 + 0.65 * rainfall + 0.12 * recovery, 3), Flow_L_s: round(0.1 + 18 * rainfall + 3 * recovery),
        RunoffState: rainfall > 0.15 ? "Runoff_Event" : hour > 15 && recovery > 0.1 ? "Recovering" : "Dry_Weather" };
    }
  },
  {
    name: "paving", title: "Asphalt roller temperature and compaction passes", fieldTypes: {
      SurfaceTemp_C: "Float64", RollerSpeed_kmh: "Float64", PassCount: "Int32", RollerCMV: "Float64",
      CompactionValid: "Int32", OperatingState: "String"
    },
    sensors: [
      { ...station("LIN-ROLLER-W01", 103.873767, 1.290999, 192, "West"), start: [11563177.89, 143717.94], end: [11563343.23, 143777.99] },
      { ...station("LIN-ROLLER-E01", 103.881210, 1.294126, 1120, "East"), start: [11564003.28, 144070.14], end: [11564182.96, 144075.63] }
    ],
    values({ tick, hour, activity, index, sensor }) {
      const weatherHold = hour >= 14.6 && hour < 15.4;
      const working = activity > 0.2 && !weatherHold;
      const phase = (tick + index * 4) % 8;
      const distance = working ? phase <= 4 ? phase / 4 : (8 - phase) / 4 : 0;
      const pass = working ? Math.floor((tick + index * 4) / 4) % 8 + 1 : 0;
      return {
        Longitude: round(sensor.start[0] + (sensor.end[0] - sensor.start[0]) * distance),
        Latitude: round(sensor.start[1] + (sensor.end[1] - sensor.start[1]) * distance),
        Chainage_m: round(sensor.chainage + 176 * distance),
        SurfaceTemp_C: round(working ? 150 - pass * 3 + Math.sin(tick / 12) : 30 + 3 * pulse(hour, 15, 3)),
        RollerSpeed_kmh: working ? round(Math.hypot(sensor.end[0] - sensor.start[0], sensor.end[1] - sensor.start[1]) / 4 * 0.06) : 0,
        PassCount: pass, RollerCMV: working ? round(18 + pass * 3 + Math.sin(tick / 10)) : 0,
        CompactionValid: Number(working), OperatingState: weatherHold ? "Weather_Hold" : working ? "Compacting" : "Idle"
      };
    }
  },
  {
    name: "traffic", title: "Work-zone approach traffic", fieldTypes: {
      MeanSpeed_kmh: "Float64", QueueLength_m: "Float64", VehicleCount_1min: "Int32", TrafficState: "String"
    },
    sensors: [station("LIN-TRAFFIC-W01", 103.87277511, 1.29036868, 64, "West"), station("LIN-TRAFFIC-E01", 103.88426215, 1.2940426, 1456, "East")],
    values({ hour, activity, index }) {
      const busy = Math.max(pulse(hour, 8.4 + index * 0.15, 0.8), pulse(hour, 17.1, 0.9));
      const queue = round(activity * (12 + 170 * busy));
      return {
        MeanSpeed_kmh: round(38 - 29 * busy - 5 * activity), QueueLength_m: queue,
        VehicleCount_1min: Math.round(3 + 12 * busy + 3 * activity),
        TrafficState: queue >= 120 ? "Queueing" : queue >= 50 ? "Slowing" : "Free_Flow"
      };
    }
  }
];

export function buildFeed(feed) {
  const fields = [...COMMON_FIELDS, ...Object.keys(feed.fieldTypes), ...TRAILING_FIELDS];
  const rows = [];
  const sensors = [...feed.sensors].sort((first, second) => first.track.localeCompare(second.track));
  for (let tick = 0; tick < STEPS; tick++) {
    const timestamp = START_MS + tick * STEP_MS;
    const hour = (7 + tick / 60) % 24;
    for (const [index, sensor] of sensors.entries()) {
      const values = feed.values({ tick, hour, activity: activityAt(hour), index, sensor });
      rows.push({
        Timestamp: timestamp, SensorID: sensor.id, TrackID: sensor.track, Longitude: sensor.x, Latitude: sensor.y,
        Chainage_m: sensor.chainage, WorkFront: sensor.front, ...values,
        Quality: "Good", IsSimulated: 1, ScenarioTimestamp: timestamp
      });
    }
  }
  return { fields, rows };
}

export function toCsv(fields, rows) {
  const cell = value => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [fields.join(","), ...rows.map(row => fields.map(field => cell(row[field])).join(","))].join("\n") + "\n";
}

export function generateFiles() {
  const records = FEEDS.map(feed => {
    const { fields, rows } = buildFeed(feed);
    const content = toCsv(fields, rows);
    const filename = `velocity_linear_${feed.name}_feed.csv`;
    const destination = join(directory, filename);
    if (existsSync(destination)) {
      if (readFileSync(destination, "utf8") !== content) throw new Error(`Refusing to overwrite changed dataset: ${filename}`);
    } else writeFileSync(destination, content, { flag: "wx" });
    return { filename, tracks: feed.sensors.length, observations: rows.length, bytes: Buffer.byteLength(content),
      sha256: createHash("sha256").update(content).digest("hex") };
  });
  const fieldTypes = { Timestamp: "Int64", SensorID: "String", TrackID: "String", Longitude: "Float64", Latitude: "Float64",
    Chainage_m: "Float64", WorkFront: "String", Quality: "String", IsSimulated: "Int32", ScenarioTimestamp: "Int64" };
  const manifest = {
    description: "Synthetic roadway construction data for ArcGIS Velocity HTTP Simulator. Not site measurements or engineering acceptance criteria.",
    spatialReference: 3857, coordinateFields: { x: "Longitude", y: "Latitude", units: "metres, NOT degrees" },
    timestampField: "Timestamp", timestampUnit: "epoch milliseconds UTC", timestampIndex: 0, trackIdField: "TrackID",
    originalTimeField: "ScenarioTimestamp", scenarioTimeZone: "Asia/Singapore", scenarioStart: START_MS,
    sourceStepMilliseconds: STEP_MS, stepsPerTrack: STEPS,
    httpSimulator: { featuresPerExecution: 2, intervalMilliseconds: 1000, repeatSimulation: true, convertToCurrentTime: true },
    feeds: FEEDS.map((feed, index) => ({ ...records[index], title: feed.title,
      rawUrl: `https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity/linear/${records[index].filename}`,
      fields: buildFeed(feed).fields.map(name => ({ name, type: feed.fieldTypes[name] ?? fieldTypes[name] })),
      sensors: feed.sensors.map(sensor => ({ SensorID: sensor.id, TrackID: sensor.track, WorkFront: sensor.front,
        StartChainage_m: sensor.chainage, Longitude: sensor.start?.[0] ?? sensor.x, Latitude: sensor.start?.[1] ?? sensor.y }))
    }))
  };
  const manifestPath = join(directory, "feed-manifest.json");
  const content = JSON.stringify(manifest, null, 2) + "\n";
  if (existsSync(manifestPath)) {
    if (readFileSync(manifestPath, "utf8") !== content) throw new Error("Refusing to overwrite a changed feed manifest");
  } else writeFileSync(manifestPath, content, { flag: "wx" });
  return records;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(generateFiles(), null, 2));
}
