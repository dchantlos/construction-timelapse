import test from "node:test";
import assert from "node:assert/strict";
import { CONDITION_COLORS, conditionLevel, assessConditions } from "../js/linear-conditions.mjs";
import { modeledSiteActivity, SITE_ACTIVITY } from "../js/linear-site-activity.mjs";

const snapshot = () => ({
  weather: { status: "current", values: { temperature_2m: 25, relative_humidity_2m: 60, wind_speed_10m: 3, wind_gusts_10m: 4, precipitation: 0 } },
  air: { status: "current", values: { us_aqi: 30, pm2_5: 5, us_aqi_pm2_5: 20, pm10: 12, us_aqi_pm10: 10 } }
});

test("uses the vertical panel's green, yellow, orange and red palette, never accent blue", () => {
  assert.deepEqual(CONDITION_COLORS, ["#4ade80", "#facc15", "#fb923c", "#f87171"]);
  const sample = snapshot();
  for (const [value, expected] of [[25, 0], [30, 1], [32, 2], [36, 3]]) {
    sample.weather.values.temperature_2m = value;
    assert.equal(conditionLevel("temperature_2m", sample), expected);
  }
  assert.equal(assessConditions(sample).head, "Caution - monitor closely");
});

test("particle colors use provider AQI subindices, and missing data is not green", () => {
  const sample = snapshot();
  sample.air.values.us_aqi_pm2_5 = 130;
  assert.equal(conditionLevel("pm2_5", sample), 2);
  sample.air.status = "stale";
  assert.equal(conditionLevel("pm2_5", sample), null);
  assert.equal(assessConditions(sample).head, "Conditions partly unavailable");
});

test("modeled worker and vehicle counts follow Singapore shifts and stay within capacity", () => {
  const day = modeledSiteActivity(Date.parse("2026-11-18T02:00:00Z"));
  const night = modeledSiteActivity(Date.parse("2026-11-18T15:00:00Z"));
  const sunday = modeledSiteActivity(Date.parse("2026-11-22T02:00:00Z"));
  assert.ok(day.workers > 100 && day.vehicles > 14);
  assert.equal(night.workers, SITE_ACTIVITY.nightWorkers);
  assert.equal(night.vehicles, SITE_ACTIVITY.parkedVehicles);
  assert.ok(sunday.workers < day.workers / 3);
  const distinctCounts = new Set();
  for (let minute = 0; minute < 1440; minute++) {
    const result = modeledSiteActivity(Date.parse("2026-11-18T00:00:00+08:00") + minute * 60000);
    assert.ok(result.workers >= 6 && result.workers <= 120);
    assert.ok(result.vehicles >= 4 && result.vehicles <= 18);
    assert.ok(Number.isInteger(result.workers) && Number.isInteger(result.vehicles));
    distinctCounts.add(result.workers);
  }
  assert.ok(distinctCounts.size > 20);
});