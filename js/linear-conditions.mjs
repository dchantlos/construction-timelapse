export const CONDITION_COLORS = Object.freeze(["#4ade80", "#facc15", "#fb923c", "#f87171"]);
export const NO_DATA_COLOR = "#94a3b8";
const stepUp = (value, thresholds) => value >= thresholds[2] ? 3 : value >= thresholds[1] ? 2 : value >= thresholds[0] ? 1 : 0;
const stepBoth = (value, limits) => value <= limits[0] || value >= limits[5] ? 3 : value <= limits[1] || value >= limits[4] ? 2 : value <= limits[2] || value >= limits[3] ? 1 : 0;

export function conditionLevel(key, snapshot) {
  const source = key in snapshot.weather.values ? snapshot.weather : snapshot.air;
  const value = source.values[key];
  if (!["current", "cached"].includes(source.status) || !Number.isFinite(value)) return null;
  if (key === "temperature_2m") return stepBoth(value, [-6, 0, 3, 27, 31, 35]);
  if (key === "relative_humidity_2m") return stepBoth(value, [12, 20, 30, 72, 85, 93]);
  if (key === "wind_speed_10m" || key === "wind_gusts_10m") return stepUp(value, [9, 14, 20]);
  if (key === "precipitation") return value > 0 ? 1 : 0;
  if (key.startsWith("us_aqi")) return stepUp(value, [51, 101, 151]);
  const indexField = { pm2_5: "us_aqi_pm2_5", pm10: "us_aqi_pm10", nitrogen_dioxide: "us_aqi_nitrogen_dioxide", ozone: "us_aqi_ozone" }[key];
  if (indexField) return Number.isFinite(source.values[indexField]) ? stepUp(source.values[indexField], [51, 101, 151]) : null;
  return 0;
}

export function assessConditions(snapshot) {
  const labels = { temperature_2m: "temperature", relative_humidity_2m: "humidity", wind_gusts_10m: "wind", us_aqi: "air quality", precipitation: "rain" };
  const levels = Object.entries(labels).map(([key, label]) => ({ label, level: conditionLevel(key, snapshot) }));
  const maximum = Math.max(0, ...levels.map(entry => entry.level ?? 0));
  const missing = levels.some(entry => entry.level === null);
  if (missing && maximum < 2) return { color: NO_DATA_COLOR, head: "Conditions partly unavailable", detail: "Some weather or air-quality readings are unavailable. Check source updates." };
  const drivers = levels.filter(entry => entry.level >= Math.max(1, maximum)).map(entry => entry.label).join(", ");
  if (maximum >= 2) return { color: CONDITION_COLORS[maximum], head: "Caution - monitor closely", detail: `Elevated ${drivers}. Review conditions at the work fronts before weather-sensitive tasks.${missing ? " Some source data is unavailable." : ""}` };
  if (maximum === 1) return { color: CONDITION_COLORS[1], head: "Good - minor watch", detail: `Keep an eye on ${drivers} and changing site conditions.` };
  return { color: CONDITION_COLORS[0], head: "Good - routine monitoring", detail: "Continue routine weather and air-quality checks at the work fronts." };
}