import { compileReplayFeed, replayFeatures } from "./linear-feed-replay.mjs";
import { INSTRUMENT_FEEDS } from "./linear-instrument-config.mjs?v=3";

const DATA_ROOT = new URL("../docs/velocity/linear/", import.meta.url);

export function createReplaySource({ onFeature = () => {}, onState = () => {}, onReset = () => {},
  fetchImpl = globalThis.fetch, parseRows, now = Date.now, clock = () => performance.now(),
  schedule = setInterval, unschedule = clearInterval, timeoutMs = 15000 } = {}) {
  const loaded = new Map();
  const states = Object.fromEntries(Object.keys(INSTRUMENT_FEEDS).map(key => [key, "loading"]));
  const controllers = new Set();
  let multiplier = 60;
  let sourceOffset = 0;
  let anchor = clock();
  let running = true;
  let disposed = false;
  let started = false;
  let timer = null;

  function elapsed() { return sourceOffset + (running ? Math.max(0, clock() - anchor) * multiplier : 0); }
  function snapshot() { return { mode: "simulation", running, multiplier, sourceElapsedMs: elapsed(), feeds: { ...states } }; }
  function notify() { if (!disposed) onState(snapshot()); }
  function emit() {
    if (disposed || !running) return;
    const timestamp = now();
    const offset = elapsed();
    for (const [feedId, feed] of loaded) {
      for (const feature of replayFeatures(feed, offset, timestamp)) onFeature(feedId, feature);
    }
    notify();
  }

  async function request(url) {
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { signal: controller.signal, cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
    }
  }

  async function start() {
    if (started || disposed) return;
    started = true;
    notify();
    try {
      const [manifestText, csvParseRows] = await Promise.all([
        request(new URL("feed-manifest.json", DATA_ROOT)),
        parseRows ?? import("https://cdn.jsdelivr.net/npm/d3-dsv@3.0.1/+esm").then(module => module.csvParseRows)
      ]);
      if (disposed) return;
      const manifest = JSON.parse(manifestText);
      if (manifest.spatialReference !== 3857 || manifest.sourceStepMilliseconds !== 60000 ||
          manifest.trackIdField !== "TrackID" || manifest.timestampField !== "Timestamp") throw new Error("Unexpected replay manifest");
      await Promise.all(Object.keys(INSTRUMENT_FEEDS).map(async feedId => {
        try {
          const filename = `velocity_linear_${feedId}_feed.csv`;
          const descriptor = manifest.feeds.find(feed => feed.filename === filename);
          if (!descriptor) throw new Error("Missing feed descriptor");
          const contents = await request(new URL(filename, DATA_ROOT));
          if (disposed) return;
          loaded.set(feedId, compileReplayFeed(descriptor, csvParseRows(contents)));
          states[feedId] = "ready";
          emit();
          notify();
        } catch (error) {
          if (disposed) return;
          states[feedId] = "unavailable";
          console.warn(`Simulated ${feedId} feed unavailable`, error);
          notify();
        }
      }));
      if (!disposed) timer = schedule(emit, 1000);
    } catch (error) {
      if (disposed) return;
      Object.keys(states).forEach(feedId => { states[feedId] = "unavailable"; });
      console.warn("Roadway simulated feeds unavailable", error);
      notify();
    }
  }

  return { start, snapshot,
    pause() { if (!running || disposed) return; sourceOffset = elapsed(); running = false; notify(); },
    resume() { if (running || disposed) return; anchor = clock(); running = true; emit(); },
    restart() { if (disposed) return; sourceOffset = 0; anchor = clock(); onReset(); emit(); notify(); },
    setSpeed(value) {
      if (![1, 60].includes(value)) throw new Error("Unsupported simulation speed");
      sourceOffset = elapsed(); anchor = clock(); multiplier = value; notify();
    },
    destroy() {
      disposed = true;
      if (timer !== null) unschedule(timer);
      for (const controller of controllers) controller.abort();
      loaded.clear();
    }
  };
}