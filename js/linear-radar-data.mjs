export const RADAR_ENDPOINT = "https://api-open.data.gov.sg/v2/real-time/api/weather-radar-images/70km";
export const RADAR_DATASET = "https://data.gov.sg/datasets/d_418e9ac3414fd927b7405631e0a7bc82/view";
export const RADAR_REFRESH_MS = 300000;
export const RADAR_MAX_AGE_MS = 1200000;
export const RADAR_HISTORY_MS = 7200000;
export const RADAR_URL_MARGIN_MS = 30000;

export const RADAR_LEGEND = Object.freeze([
  { label: "Light", colors: ["#00FFFF", "#00EFEF", "#00D1D5", "#00BABF", "#00979A", "#00837D", "#008045", "#008938", "#00A235", "#00B729", "#00CA11"] },
  { label: "Light to moderate", colors: ["#00DA0D", "#00F507", "#00FF00", "#43FF41", "#48FF46"] },
  { label: "Moderate", colors: ["#FFFF3B", "#FFFF00", "#FFF000", "#FFDC00"] },
  { label: "Moderate to heavy", colors: ["#FFC600", "#FFB200", "#FFA500", "#FF8A00", "#FF7200"] },
  { label: "Heavy", colors: ["#FF4900", "#FF1F00", "#E50000", "#C10000", "#B6006A", "#D200A5", "#D400AA", "#FF00FF"] }
]);

function parseTime(value) {
  if (typeof value !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
  return Date.parse(value);
}

function coordinate(value, maximum) {
  return Number.isFinite(value) && Math.abs(value) <= maximum;
}

export function radarRequestUrl({ date, paginationToken } = {}) {
  const url = new URL(RADAR_ENDPOINT);
  if (date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/.test(date)) throw new Error("Invalid Singapore radar date");
    url.searchParams.set("date", date);
  }
  if (paginationToken) url.searchParams.set("paginationToken", paginationToken);
  return url.href;
}

export function singaporeRadarDay(timestamp) {
  return new Date(timestamp + 8 * 3600000).toISOString().slice(0, 10);
}

export function parseRadarResponse(payload, nowMs = Date.now()) {
  const data = payload?.data;
  if (payload?.code !== 0 || !data) throw new Error("NEA radar response unavailable");
  const box = data.boundaryBox;
  const projection = data.projection;
  if (box?.crs !== "EPSG:4326" || !coordinate(box.upperLeft?.longitude, 180) ||
      !coordinate(box.lowerRight?.longitude, 180) || !coordinate(box.upperLeft?.latitude, 90) ||
      !coordinate(box.lowerRight?.latitude, 90) || box.upperLeft.longitude >= box.lowerRight.longitude ||
      box.lowerRight.latitude >= box.upperLeft.latitude) throw new Error("Invalid NEA radar boundary");
  if (projection?.type !== "Azimuthal Equidistant" || !coordinate(projection.center?.longitude, 180) ||
      !coordinate(projection.center?.latitude, 90)) throw new Error("Unsupported NEA radar projection");
  if (!Array.isArray(data.records)) throw new Error("NEA radar records missing");
  const extent = { xmin: box.upperLeft.longitude, ymin: box.lowerRight.latitude,
    xmax: box.lowerRight.longitude, ymax: box.upperLeft.latitude, spatialReference: { wkid: 4326 } };
  const center = { longitude: projection.center.longitude, latitude: projection.center.latitude };
  if (center.longitude < extent.xmin || center.longitude > extent.xmax || center.latitude < extent.ymin || center.latitude > extent.ymax) {
    throw new Error("Radar centre lies outside its boundary");
  }
  const frames = new Map();
  for (const record of data.records) {
    const timestamp = parseTime(record?.timestamp);
    const updatedTimestamp = parseTime(record?.updatedTimestamp);
    const expiresAt = parseTime(record?.image?.urlExpiresAt);
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > nowMs + 60000 ||
        !Number.isFinite(updatedTimestamp) || updatedTimestamp > nowMs + 60000 ||
        !Number.isFinite(expiresAt) || expiresAt <= nowMs + RADAR_URL_MARGIN_MS ||
        record.image.format !== "png" || record.image.range !== "70km" || typeof record.image.url !== "string") continue;
    let url;
    try { url = new URL(record.image.url); } catch (error) {
      console.warn("Invalid NEA radar image URL", error.name);
      continue;
    }
    if (url.protocol !== "https:" || url.username || url.password ||
        url.hostname !== "dgs-backend-app-assets-production.s3.ap-southeast-1.amazonaws.com" ||
        !url.pathname.startsWith("/nea-rain-radar-images/png/70km/")) continue;
    const frame = { timestamp, updatedTimestamp, expiresAt, url: url.href, extent, center };
    const existing = frames.get(timestamp);
    if (!existing || updatedTimestamp > existing.updatedTimestamp ||
        (updatedTimestamp === existing.updatedTimestamp && expiresAt > existing.expiresAt)) frames.set(timestamp, frame);
  }
  return { frames: [...frames.values()].sort((first, second) => first.timestamp - second.timestamp), extent, center,
    paginationToken: typeof data.paginationToken === "string" && data.paginationToken ? data.paginationToken : null };
}

export function mergeRadarFrames(previous, incoming, nowMs = Date.now()) {
  const frames = new Map();
  for (const frame of [...previous, ...incoming]) {
    if (frame.timestamp < nowMs - RADAR_HISTORY_MS || frame.timestamp > nowMs + 60000 || frame.expiresAt <= nowMs + RADAR_URL_MARGIN_MS) continue;
    const existing = frames.get(frame.timestamp);
    if (!existing || frame.updatedTimestamp > existing.updatedTimestamp ||
        (frame.updatedTimestamp === existing.updatedTimestamp && frame.expiresAt > existing.expiresAt)) frames.set(frame.timestamp, frame);
  }
  return [...frames.values()].sort((first, second) => first.timestamp - second.timestamp).slice(-25);
}

export function radarFreshness(frame, nowMs = Date.now()) {
  if (!frame || frame.expiresAt <= nowMs + RADAR_URL_MARGIN_MS) return "unavailable";
  return nowMs - frame.timestamp <= RADAR_MAX_AGE_MS ? "current" : "stale";
}