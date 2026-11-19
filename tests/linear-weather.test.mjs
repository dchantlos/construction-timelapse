import test from "node:test";
import assert from "node:assert/strict";
import { WEATHER_FIELDS, WEATHER_MAX_AGE_MS, WEATHER_REFRESH_MS, openMeteoUrl, parseOpenMeteo, airQualityCategory, createOpenMeteoClient } from "../js/linear-weather.mjs";

const nowMs = Date.parse("2026-11-18T03:00:00Z");
function payload(kind, overrides = {}) {
  return { current: { time: nowMs / 1000, interval: kind === "weather" ? 900 : 3600,
    ...Object.fromEntries(Object.keys(WEATHER_FIELDS[kind]).map(key => [key, 20])), ...overrides },
    current_units: { time: "unixtime", ...Object.fromEntries(Object.entries(WEATHER_FIELDS[kind]).map(([key, field]) => [key, field.unit.replaceAll("\u00b5", "\u03bc")])) } };
}

test("requests Singapore coordinates, explicit SI wind units and UTC epoch timestamps", () => {
  const weather = new URL(openMeteoUrl("weather"));
  assert.equal(weather.searchParams.get("latitude"), "1.2926");
  assert.equal(weather.searchParams.get("longitude"), "103.8785");
  assert.equal(weather.searchParams.get("wind_speed_unit"), "ms");
  assert.equal(weather.searchParams.get("timeformat"), "unixtime");
  assert.equal(weather.searchParams.get("timezone"), "Asia/Singapore");
  assert.ok(new URL(openMeteoUrl("air")).searchParams.get("current").includes("pm2_5"));
});

test("preserves zero and negative temperatures; nulls, strings and wrong units never become valid readings", () => {
  const sample = payload("weather", { temperature_2m: -2, precipitation: 0, relative_humidity_2m: null, wind_speed_10m: "5" });
  sample.current_units.wind_gusts_10m = "km/h";
  const parsed = parseOpenMeteo("weather", sample, nowMs);
  assert.equal(parsed.timestamp, nowMs);
  assert.equal(parsed.values.temperature_2m, -2);
  assert.equal(parsed.values.precipitation, 0);
  for (const key of ["relative_humidity_2m", "wind_speed_10m", "wind_gusts_10m"]) assert.equal(parsed.values[key], null);
  assert.equal(parseOpenMeteo("air", payload("air"), nowMs).values.pm10, 20);
  assert.throws(() => parseOpenMeteo("weather", payload("weather", { time: nowMs / 1000 + 61 }), nowMs), /time/);
});

test("US AQI has six conventional bands, not site-wide safety statements", () => {
  assert.deepEqual([50, 51, 101, 151, 201, 301].map(value => airQualityCategory(value).label),
    ["Good", "Moderate", "Unhealthy for sensitive groups", "Unhealthy", "Very unhealthy", "Hazardous"]);
  assert.equal(airQualityCategory(null).label, "Unavailable");
});

test("weather and air requests are independent and errors retain only explicitly cached data", async () => {
  let time = nowMs;
  let failAir = false;
  const fetchImpl = async url => {
    const kind = url.includes("air-quality-api") ? "air" : "weather";
    if (kind === "air" && failAir) return { ok: false, status: 503 };
    return { ok: true, json: async () => payload(kind, { time: Math.floor(time / 1000) }) };
  };
  const client = createOpenMeteoClient({ fetchImpl, now: () => time });
  await client.refresh();
  failAir = true;
  time += WEATHER_REFRESH_MS + 1;
  await client.refresh();
  assert.equal(client.snapshot().weather.status, "current");
  assert.equal(client.snapshot().air.status, "cached");
  assert.equal(client.snapshot().air.timestamp, nowMs);
  time = nowMs + WEATHER_MAX_AGE_MS + 1;
  assert.equal(client.snapshot().air.status, "stale");
  assert.equal(client.snapshot().air.values.us_aqi, null);
  client.destroy();
});

test("unavailable sources do not produce synthetic atmospheric readings and failed requests retry", async () => {
  let unavailable = true;
  const client = createOpenMeteoClient({ now: () => nowMs, fetchImpl: async url => {
    if (unavailable) return { ok: false, status: 429 };
    return { ok: true, json: async () => payload(url.includes("air-quality-api") ? "air" : "weather") };
  } });
  await client.refresh();
  assert.equal(client.snapshot().weather.status, "unavailable");
  assert.equal(client.snapshot().air.values.pm2_5, null);
  unavailable = false;
  await client.refresh();
  assert.equal(client.snapshot().air.status, "current");
  client.destroy();
});

test("cache is project-specific, validated, and does not trigger repeated API calls after reload", async () => {
  const saved = new Map();
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
  let calls = 0;
  const fetchImpl = async url => { calls += 1; return { ok: true, json: async () => payload(url.includes("air-quality-api") ? "air" : "weather") }; };
  const first = createOpenMeteoClient({ storage, fetchImpl, now: () => nowMs });
  await first.refresh(); first.destroy();
  const second = createOpenMeteoClient({ storage, fetchImpl, now: () => nowMs + 1000 });
  await second.refresh();
  assert.equal(calls, 2);
  assert.equal(second.snapshot().air.values.us_aqi, 20);
  assert.ok([...saved.keys()].every(key => key.startsWith("roadway.open-meteo.v2.1.2926.103.8785")));
  second.destroy();
});