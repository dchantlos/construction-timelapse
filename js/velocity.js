// =============================================================================
// velocity.js — single source of truth for the ArcGIS Velocity sensor feeds.
//
// The live sensor panel (js/progress-sensors.js) will subscribe to the Velocity
// STREAM services listed here; the same analytics are also published as feature
// layers and added to the progress WebScene as 3D points. After each Velocity
// feed is published, fill in `streamUrl` (and optionally `featureLayerItemId`);
// nothing else needs to change.
//
// Coordinates are Web Mercator Auxiliary Sphere (WKID 102100 / 3857) X/Y in
// metres and mirror docs/velocity/generate_feeds.mjs exactly. Ground sensors take
// their elevation from Scene Viewer offsets; only the crane-top wind sensor
// carries an absolute z (582.35 m).
// =============================================================================

export const VELOCITY_WKID = 102100;

// Public GitHub raw folder each Velocity HTTP feed polls for its sample CSV.
const RAW = "https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity";

export const VELOCITY = {
  noise: {
    sourceCsv: `${RAW}/velocity_noise_feed.csv`,
    streamUrl: "", // ← Velocity noise StreamServer URL
    featureLayerItemId: "", // ← AGOL feature layer item id (3D points)
    valueField: "LAeq_dBA",
    categoryField: "NoiseCategory",
    unit: "dBA",
    rollup: "max", // panel headline = worst LAeq across the on-site boundary mics
    thresholds: [70, 80, 85], // Comfortable · Elevated · High · Excessive
    categories: ["Comfortable", "Elevated", "High", "Excessive"],
    sensors: [
      { id: "NOISE-N", label: "Boundary N", x: 958906.23, y: 6010563.72, offsite: false },
      { id: "NOISE-E", label: "Boundary E", x: 959045.15, y: 6010445.49, offsite: false },
      { id: "NOISE-S", label: "Boundary S", x: 958885.54, y: 6010297.7, offsite: false },
      { id: "NOISE-W", label: "Boundary W", x: 958749.58, y: 6010415.93, offsite: false },
      { id: "NOISE-NR1", label: "Neighbour NE", x: 959160.42, y: 6010678.99, offsite: true },
      { id: "NOISE-NR2", label: "Residential SW", x: 958613.61, y: 6010191.3, offsite: true },
      { id: "NOISE-NR3", label: "Façade E", x: 959234.31, y: 6010383.42, offsite: true }
    ]
  },

  dust: {
    sourceCsv: `${RAW}/velocity_dust_feed.csv`,
    streamUrl: "",
    featureLayerItemId: "",
    valueField: "PM10_ugm3",
    categoryField: "DustCategory",
    unit: "µg/m³",
    primary: "DUST-01", // panel headline = on-site earthworks monitor
    thresholds: [50, 75, 100], // Good · Moderate · High · Very High
    categories: ["Good", "Moderate", "High", "Very High"],
    sensors: [
      { id: "DUST-01", label: "Dust E boundary", x: 958989.81, y: 6010417.06, offsite: false },
      { id: "DUST-02", label: "Dust W boundary", x: 958782.2, y: 6010441.57, offsite: false }
    ]
  },

  gas: {
    sourceCsv: `${RAW}/velocity_gas_feed.csv`,
    streamUrl: "",
    featureLayerItemId: "",
    categoryField: "GasCategory",
    levelField: "GasLevel",
    primary: "GAS-01",
    categories: ["Normal", "Watch", "Caution", "Hazard"],
    // per-parameter field name, unit, and [watch, caution, hazard] thresholds
    params: [
      { key: "co", field: "CO_ppm", unit: "ppm", thresholds: [9, 25, 35] },
      { key: "co2", field: "CO2_ppm", unit: "ppm", thresholds: [800, 1200, 2000] },
      { key: "no2", field: "NO2_ugm3", unit: "µg/m³", thresholds: [40, 100, 200] },
      { key: "o3", field: "O3_ugm3", unit: "µg/m³", thresholds: [100, 160, 200] },
      { key: "voc", field: "VOC_ppb", unit: "ppb", thresholds: [500, 1500, 3000] },
      { key: "ch4", field: "CH4_ppm", unit: "ppm", thresholds: [5, 25, 50] }
    ],
    sensors: [
      { id: "GAS-01", label: "Multi-gas cabinet", x: 958969.66, y: 6010422.49, offsite: false }
    ]
  },

  wind: {
    sourceCsv: `${RAW}/velocity_wind_feed.csv`,
    streamUrl: "", // ← Velocity wind StreamServer URL
    featureLayerItemId: "", // ← AGOL feature layer item id (3D point on crane)
    valueField: "WindSpeed_ms",
    categoryField: "WindCategory",
    dirField: "WindDir_deg",
    gustField: "WindGust_ms",
    unit: "m/s",
    elevation: 582.35, // absolute metres — feature carries a true Z at the crane top
    primary: "WIND-01",
    thresholds: [6, 12, 20], // Calm · Breeze · Windy · High (tower-crane stand-down)
    categories: ["Calm", "Breeze", "Windy", "High"],
    sensors: [
      { id: "WIND-01", label: "Wind (tower crane)", x: 958778.6, y: 6010479.36, z: 582.35, offsite: false }
    ]
  }
};
