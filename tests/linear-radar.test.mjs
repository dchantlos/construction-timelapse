import test from "node:test";
import assert from "node:assert/strict";
import { RADAR_ENDPOINT, RADAR_HISTORY_MS, RADAR_MAX_AGE_MS, RADAR_URL_MARGIN_MS,
  radarRequestUrl, singaporeRadarDay, parseRadarResponse, mergeRadarFrames, radarFreshness, RADAR_LEGEND } from "../js/linear-radar-data.mjs";
import { createRadarClient } from "../js/linear-radar-client.mjs";

const nowMs = Date.parse("2026-11-19T11:13:36+08:00");
function response(times = ["2026-11-19T11:10:00+08:00"]) {
  return { code: 0, data: { projection: { type: "Azimuthal Equidistant", center: { longitude: 103.972583, latitude: 1.34911 } },
    boundaryBox: { crs: "EPSG:4326", upperLeft: { longitude: 103.342685, latitude: 1.97854 }, lowerRight: { longitude: 104.602315, latitude: 0.719515 } },
    records: times.map(timestamp => ({ timestamp, updatedTimestamp: timestamp,
      image: { url: `https://dgs-backend-app-assets-production.s3.ap-southeast-1.amazonaws.com/nea-rain-radar-images/png/70km/test-${Date.parse(timestamp)}.png?test=1`,
        urlExpiresAt: "2026-11-19T11:33:36+08:00", range: "70km", format: "png" } })), paginationToken: null } };
}

test("uses the official imagery endpoint and Singapore dates including midnight", () => {
  assert.equal(radarRequestUrl(), RADAR_ENDPOINT);
  assert.equal(singaporeRadarDay(Date.parse("2026-11-18T16:05:00Z")), "2026-11-19");
  const request = new URL(radarRequestUrl({ date: "2026-11-19", paginationToken: "next+page=" }));
  assert.equal(request.searchParams.get("paginationToken"), "next+page=");
  assert.throws(() => radarRequestUrl({ date: "2026-11-19T11:10:00Z" }), /Singapore radar date/);
});

test("maps upper-left and lower-right geographic corners without flipping the radar image", () => {
  const parsed = parseRadarResponse(response(), nowMs);
  assert.deepEqual(parsed.extent, { xmin: 103.342685, ymin: 0.719515, xmax: 104.602315, ymax: 1.97854, spatialReference: { wkid: 4326 } });
  assert.equal(parsed.frames.length, 1);
  assert.equal(parsed.frames[0].timestamp, Date.parse("2026-11-19T11:10:00+08:00"));
  assert.equal(parsed.center.longitude, 103.972583);
  assert.ok(parsed.extent.xmin < 103.8785 && parsed.extent.xmax > 103.8785);
  assert.ok(parsed.extent.ymin < 1.2926 && parsed.extent.ymax > 1.2926);
});

test("rejects wrong projection, reversed bounds, missing records and provider errors", () => {
  assert.throws(() => parseRadarResponse({ code: 1, data: {} }, nowMs), /unavailable/);
  const sample = response();
  sample.data.boundaryBox.crs = "EPSG:3857";
  assert.throws(() => parseRadarResponse(sample, nowMs), /boundary/);
  sample.data.boundaryBox.crs = "EPSG:4326";
  sample.data.boundaryBox.lowerRight.latitude = 3;
  assert.throws(() => parseRadarResponse(sample, nowMs), /boundary/);
  const projection = response();
  projection.data.projection.type = "Unknown";
  assert.throws(() => parseRadarResponse(projection, nowMs), /projection/);
  const missing = response();
  delete missing.data.records;
  assert.throws(() => parseRadarResponse(missing, nowMs), /records/);
});

test("refuses expired images, future observations, wrong ranges and untrusted URLs", () => {
  for (const update of [
    record => { record.image.urlExpiresAt = new Date(nowMs + RADAR_URL_MARGIN_MS).toISOString(); },
    record => { record.timestamp = new Date(nowMs + 61000).toISOString(); },
    record => { record.image.range = "240km"; },
    record => { record.image.format = "svg"; },
    record => { record.image.url = "https://example.com/nea-rain-radar-images/png/70km/rain.png"; },
    record => { record.image.url = "http://dgs-backend-app-assets-production.s3.ap-southeast-1.amazonaws.com/nea-rain-radar-images/png/70km/rain.png"; }
  ]) {
    const sample = response();
    update(sample.data.records[0]);
    assert.equal(parseRadarResponse(sample, nowMs).frames.length, 0);
  }
});

test("sorts and merges observations, refreshes signed URLs and retains only the recent loop", () => {
  const parsed = parseRadarResponse(response(["2026-11-19T11:10:00+08:00", "2026-11-19T11:05:00+08:00"]), nowMs);
  assert.ok(parsed.frames[0].timestamp < parsed.frames[1].timestamp);
  const renewed = { ...parsed.frames[1], expiresAt: nowMs + 3600000, url: parsed.frames[1].url + "&renewed=1" };
  const old = { ...parsed.frames[0], timestamp: nowMs - RADAR_HISTORY_MS - 1 };
  const merged = mergeRadarFrames([...parsed.frames, old], [renewed], nowMs);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].url, renewed.url);
});

test("freshness uses observation time rather than signed URL issuance time", () => {
  const frame = parseRadarResponse(response(), nowMs).frames[0];
  assert.equal(radarFreshness(frame, nowMs), "current");
  assert.equal(radarFreshness({ ...frame, timestamp: nowMs - RADAR_MAX_AGE_MS - 1 }, nowMs), "stale");
  assert.equal(radarFreshness({ ...frame, expiresAt: nowMs }, nowMs), "unavailable");
  assert.equal(radarFreshness(null, nowMs), "unavailable");
});

test("legend preserves NEA rainfall-intensity colors without inventing numerical thresholds", () => {
  assert.equal(RADAR_LEGEND.flatMap(band => band.colors).length, 33);
  assert.equal(RADAR_LEGEND[0].colors[0], "#00FFFF");
  assert.equal(RADAR_LEGEND.at(-1).colors.at(-1), "#FF00FF");
});

test("latest imagery is available before history completes, and requests are coalesced", async () => {
  const seen = [];
  const changes = [];
  const client = createRadarClient({ now: () => nowMs, onChange: state => changes.push(state.frames.length), fetchImpl: async url => {
    seen.push(new URL(url));
    return { ok: true, json: async () => response(url.includes("date=") ?
      ["2026-11-19T11:10:00+08:00", "2026-11-19T11:05:00+08:00"] : undefined) };
  } });
  await Promise.all([client.refresh(), client.refresh()]);
  assert.equal(seen.length, 2);
  assert.ok(changes.includes(1));
  assert.equal(client.snapshot().frames.length, 2);
  assert.equal(client.snapshot().status, "current");
  await client.refresh({ force: true });
  assert.equal(seen.length, 2);
  client.destroy();
});

test("history failure leaves the latest real image available", async () => {
  const client = createRadarClient({ now: () => nowMs, fetchImpl: async url => url.includes("date=") ?
    { ok: false, status: 503 } : { ok: true, json: async () => response() } });
  await client.refresh();
  assert.equal(client.snapshot().status, "current");
  assert.equal(client.snapshot().frames.length, 1);
  assert.ok(client.snapshot().historyError);
  client.destroy();
});

test("follows bounded history pages and avoids fetching records older than the loop", async () => {
  let calls = 0;
  const client = createRadarClient({ now: () => nowMs, fetchImpl: async url => {
    calls += 1;
    const request = new URL(url);
    const sample = response(request.searchParams.has("paginationToken") ? ["2026-11-19T09:10:00+08:00"] : undefined);
    if (request.searchParams.has("date")) sample.data.paginationToken = "next-page";
    return { ok: true, json: async () => sample };
  } });
  await client.refresh();
  assert.equal(calls, 3);
  assert.equal(client.snapshot().frames.length, 1);
  client.destroy();
});

test("recent history includes the previous Singapore day around midnight", async () => {
  const midnight = Date.parse("2026-11-20T00:05:00+08:00");
  const days = [];
  const client = createRadarClient({ now: () => midnight, fetchImpl: async url => {
    const date = new URL(url).searchParams.get("date");
    if (date) days.push(date);
    const sample = response([date === "2026-11-19" ? "2026-11-19T23:55:00+08:00" : "2026-11-20T00:00:00+08:00"]);
    sample.data.records[0].image.urlExpiresAt = new Date(midnight + 1200000).toISOString();
    return { ok: true, json: async () => sample };
  } });
  await client.refresh();
  assert.deepEqual(days, ["2026-11-20", "2026-11-19"]);
  assert.equal(client.snapshot().frames.length, 2);
  client.destroy();
});

test("failed refresh retains labeled cached imagery only until its URL expires", async () => {
  let time = nowMs;
  let failed = false;
  const client = createRadarClient({ now: () => time, fetchImpl: async () => failed ? { ok: false, status: 429 } :
    { ok: true, json: async () => response() } });
  await client.refresh();
  failed = true;
  time += 300000;
  await client.refresh();
  assert.equal(client.snapshot().status, "cached");
  time = Date.parse("2026-11-19T11:34:00+08:00");
  assert.equal(client.snapshot().status, "unavailable");
  assert.equal(client.snapshot().frames.length, 0);
  client.destroy();
});

test("destroy aborts pending radar requests without later UI changes", async () => {
  let changes = 0;
  let signal;
  const client = createRadarClient({ now: () => nowMs, onChange: () => { changes += 1; }, fetchImpl: (url, options) => {
    signal = options.signal;
    return new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true }));
  } });
  const pending = client.refresh();
  await Promise.resolve();
  const beforeDestroy = changes;
  client.destroy();
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(changes, beforeDestroy);
});