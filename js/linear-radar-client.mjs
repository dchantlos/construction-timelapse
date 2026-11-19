import { RADAR_REFRESH_MS, RADAR_HISTORY_MS, parseRadarResponse, radarRequestUrl,
  singaporeRadarDay, mergeRadarFrames, radarFreshness } from "./linear-radar-data.mjs";

export function createRadarClient({ fetchImpl = globalThis.fetch, now = Date.now, onChange = () => {}, timeoutMs = 15000 } = {}) {
  let frames = [];
  let pending = null;
  let attemptedAt = null;
  let error = null;
  let historyError = null;
  let disposed = false;
  const controllers = new Set();

  function snapshot() {
    const available = mergeRadarFrames([], frames, now());
    const freshness = radarFreshness(available.at(-1), now());
    return { frames: available, fetching: pending !== null, attemptedAt, error, historyError,
      status: freshness === "unavailable" ? error || attemptedAt !== null && !pending ? "unavailable" : "loading" :
        freshness === "stale" ? "stale" : error ? "cached" : "current" };
  }

  function notify() { if (!disposed) onChange(snapshot()); }

  async function request(parameters) {
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(radarRequestUrl(parameters), { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`Radar API HTTP ${response.status}`);
      return parseRadarResponse(await response.json(), now());
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
    }
  }

  async function recentHistory() {
    const cutoff = now() - RADAR_HISTORY_MS;
    const dates = [...new Set([singaporeRadarDay(now()), singaporeRadarDay(cutoff)])];
    for (const date of dates) {
      let paginationToken;
      const visited = new Set();
      for (let page = 0; page < 4 && !disposed; page += 1) {
        const result = await request({ date, paginationToken });
        if (disposed) return;
        frames = mergeRadarFrames(frames, result.frames, now());
        notify();
        if (!result.paginationToken || result.frames.some(frame => frame.timestamp <= cutoff)) break;
        if (visited.has(result.paginationToken)) throw new Error("Radar history repeated a page token");
        visited.add(result.paginationToken);
        paginationToken = result.paginationToken;
      }
    }
  }

  function refresh({ force = false } = {}) {
    if (disposed || pending) return pending;
    if (attemptedAt !== null && now() - attemptedAt < (force ? 30000 : RADAR_REFRESH_MS)) return;
    attemptedAt = now();
    pending = Promise.resolve().then(async () => {
      try {
        if (disposed) return;
        const latest = await request();
        if (disposed) return;
        if (!latest.frames.length) throw new Error("No usable NEA radar image");
        frames = mergeRadarFrames(frames, latest.frames, now());
        error = null;
        historyError = null;
        notify();
        try { await recentHistory(); }
        catch (failure) {
          if (disposed) return;
          historyError = "Recent radar history is partly unavailable";
          console.warn(historyError, failure instanceof Error ? failure.name : "Request error");
        }
      } catch (failure) {
        if (disposed) return;
        error = "Radar update unavailable";
        console.warn(error, failure instanceof Error ? failure.message : "Request error");
      } finally {
        pending = null;
        notify();
      }
    });
    notify();
    return pending;
  }

  return { snapshot, refresh, destroy() {
    disposed = true;
    for (const controller of controllers) controller.abort();
    frames = [];
  } };
}