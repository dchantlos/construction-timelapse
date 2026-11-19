export const WEATHER_LOCATION = Object.freeze({ latitude: 1.2926, longitude: 103.8785, timeZone: "Asia/Singapore" });
export const WEATHER_REFRESH_MS = 600000;
export const WEATHER_MAX_AGE_MS = 10800000;

export const WEATHER_FIELDS = Object.freeze({
  weather: {
    temperature_2m: { unit: "\u00b0C", decimals: 1, min: -90, max: 60 },
    relative_humidity_2m: { unit: "%", decimals: 0, min: 0, max: 100 },
    precipitation: { unit: "mm", decimals: 1, min: 0, max: 1000 },
    wind_speed_10m: { unit: "m/s", decimals: 1, min: 0, max: 150 },
    wind_gusts_10m: { unit: "m/s", decimals: 1, min: 0, max: 150 },
    wind_direction_10m: { unit: "\u00b0", decimals: 0, min: 0, max: 360 }
  },
  air: {
    us_aqi: { unit: "USAQI", decimals: 0, min: 0, max: 10000 },
    us_aqi_pm2_5: { unit: "USAQI", decimals: 0, min: 0, max: 10000 },
    us_aqi_pm10: { unit: "USAQI", decimals: 0, min: 0, max: 10000 },
    us_aqi_nitrogen_dioxide: { unit: "USAQI", decimals: 0, min: 0, max: 10000 },
    us_aqi_ozone: { unit: "USAQI", decimals: 0, min: 0, max: 10000 },
    pm2_5: { unit: "\u00b5g/m\u00b3", decimals: 1, min: 0, max: 100000 },
    pm10: { unit: "\u00b5g/m\u00b3", decimals: 1, min: 0, max: 100000 },
    nitrogen_dioxide: { unit: "\u00b5g/m\u00b3", decimals: 1, min: 0, max: 100000 },
    ozone: { unit: "\u00b5g/m\u00b3", decimals: 1, min: 0, max: 100000 }
  }
});

export function openMeteoUrl(kind) {
  if (!WEATHER_FIELDS[kind]) throw new Error("Unknown Open-Meteo source");
  const endpoint = kind === "weather" ? "https://api.open-meteo.com/v1/forecast" : "https://air-quality-api.open-meteo.com/v1/air-quality";
  const url = new URL(endpoint);
  url.search = new URLSearchParams({ latitude: String(WEATHER_LOCATION.latitude), longitude: String(WEATHER_LOCATION.longitude),
    current: Object.keys(WEATHER_FIELDS[kind]).join(","), timeformat: "unixtime", timezone: WEATHER_LOCATION.timeZone });
  if (kind === "weather") url.searchParams.set("wind_speed_unit", "ms");
  return url.href;
}

export function parseOpenMeteo(kind, payload, nowMs = Date.now()) {
  const fields = WEATHER_FIELDS[kind];
  const current = payload?.current;
  const units = payload?.current_units;
  if (!fields || !current || units?.time !== "unixtime" || !Number.isSafeInteger(current.time) ||
      current.time <= 0 || current.time * 1000 > nowMs + 60000) throw new Error(`Invalid ${kind} model time`);
  const values = {};
  for (const [key, field] of Object.entries(fields)) {
    const unit = typeof units[key] === "string" ? units[key].replaceAll("\u03bc", "\u00b5") : "";
    const value = current[key];
    values[key] = unit === field.unit && Number.isFinite(value) && value >= field.min && value <= field.max ? value : null;
  }
  if (!Object.values(values).some(value => value !== null)) throw new Error(`No valid ${kind} model values`);
  return { values, timestamp: current.time * 1000, intervalSeconds: Number.isFinite(current.interval) && current.interval > 0 ? current.interval : null };
}

export function airQualityCategory(value) {
  if (!Number.isFinite(value) || value < 0) return { label: "Unavailable", color: "#94a3b8" };
  const categories = [
    [50, "Good", "#4ade80"], [100, "Moderate", "#facc15"], [150, "Unhealthy for sensitive groups", "#fb923c"],
    [200, "Unhealthy", "#f87171"], [300, "Very unhealthy", "#c084fc"], [Infinity, "Hazardous", "#be123c"]
  ];
  const [, label, color] = categories.find(([maximum]) => value <= maximum);
  return { label, color };
}

export function createOpenMeteoClient({ fetchImpl = globalThis.fetch, storage = null, now = Date.now, onChange = () => {}, timeoutMs = 10000 } = {}) {
  const cacheKey = `roadway.open-meteo.v2.${WEATHER_LOCATION.latitude}.${WEATHER_LOCATION.longitude}`;
  const sources = Object.fromEntries(Object.keys(WEATHER_FIELDS).map(kind => [kind, { data: null, fetchedAt: 0, error: null, pending: null }]));
  const controllers = new Set();
  let disposed = false;
  for (const [kind, source] of Object.entries(sources)) {
    try {
      const saved = JSON.parse(storage?.getItem(`${cacheKey}.${kind}`) ?? "null");
      if (saved && Number.isFinite(saved.fetchedAt) && saved.fetchedAt <= now() && now() - saved.fetchedAt <= WEATHER_MAX_AGE_MS) {
        source.data = parseOpenMeteo(kind, saved.payload, now());
        source.fetchedAt = saved.fetchedAt;
      }
    } catch (error) { console.warn(`Open-Meteo ${kind} cache unavailable`, error); }
  }

  function snapshot() {
    return Object.fromEntries(Object.entries(sources).map(([kind, source]) => {
      const age = source.data ? now() - source.data.timestamp : Infinity;
      const fresh = age >= -60000 && age <= WEATHER_MAX_AGE_MS;
      const status = !source.data ? source.error ? "unavailable" : "loading" : !fresh ? "stale" : source.error ? "cached" : "current";
      const values = fresh ? source.data.values : Object.fromEntries(Object.keys(WEATHER_FIELDS[kind]).map(key => [key, null]));
      return [kind, { ...source.data, values, status, error: source.error, fetchedAt: source.fetchedAt }];
    }));
  }

  async function refreshSource(kind, force) {
    const source = sources[kind];
    if (disposed || source.pending) return source.pending;
    if (!force && source.fetchedAt && now() - source.fetchedAt < WEATHER_REFRESH_MS && !source.error && snapshot()[kind].status === "current") return;
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    source.pending = (async () => {
      try {
        const response = await fetchImpl(openMeteoUrl(kind), { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const data = parseOpenMeteo(kind, payload, now());
        if (disposed) return;
        if (source.data && data.timestamp < source.data.timestamp) throw new Error("Older model timestamp received");
        source.data = data;
        source.fetchedAt = now();
        source.error = null;
        try { storage?.setItem(`${cacheKey}.${kind}`, JSON.stringify({ payload, fetchedAt: source.fetchedAt })); }
        catch (error) { console.warn(`Open-Meteo ${kind} cache write failed`, error); }
      } catch (error) {
        if (disposed) return;
        source.error = error.message;
        console.warn(`Open-Meteo ${kind} request unavailable`, error);
      } finally {
        clearTimeout(timeout);
        controllers.delete(controller);
        source.pending = null;
        if (!disposed) onChange(snapshot());
      }
    })();
    return source.pending;
  }
  return {
    snapshot,
    refresh: ({ force = false } = {}) => Promise.all(Object.keys(sources).map(kind => refreshSource(kind, force))),
    destroy() { disposed = true; for (const controller of controllers) controller.abort(); }
  };
}