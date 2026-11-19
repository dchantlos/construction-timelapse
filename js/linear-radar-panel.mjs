import { createRadarLayout } from "./linear-radar-layout.mjs";
import { createRadarClient } from "./linear-radar-client.mjs";
import { RADAR_REFRESH_MS, RADAR_MAX_AGE_MS } from "./linear-radar-data.mjs";

const time = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateTime = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function createRadarPanel({ icon, onOpen = () => {} }) {
  const { panel, toggles, nodes, actions } = createRadarLayout(icon);
  const events = new AbortController();
  const options = { signal: events.signal };
  const navigation = ["home", "locate", "coverage", "zoom-in", "zoom-out"];
  let disposed = false;
  let radarMap = null;
  let mapPending = null;
  let mapReady = false;
  let selectedTime = null;
  let followLatest = true;
  let displayed = null;
  let requestedKey = null;
  let loadingFrame = false;
  let frameError = null;
  let playing = false;
  let animationTimer = null;
  let returnFocus = toggles[0];
  const client = createRadarClient({ onChange: paint });

  function stop() {
    playing = false;
    clearInterval(animationTimer);
    animationTimer = null;
    actions.play.innerHTML = icon("play");
    actions.play.title = "Play radar history";
    actions.play.setAttribute("aria-label", "Play radar history");
    actions.play.setAttribute("aria-pressed", "false");
    panel.dataset.playing = "false";
  }

  function draw(frame) {
    const key = `${frame.timestamp}:${frame.updatedTimestamp}:${frame.expiresAt}`;
    if (!mapReady || requestedKey === key || panel.hidden) return;
    requestedKey = key;
    loadingFrame = true;
    frameError = null;
    radarMap.showFrame(frame).then(shown => {
      if (disposed || requestedKey !== key || !shown) return;
      displayed = frame;
      loadingFrame = false;
      panel.dataset.frameTimestamp = String(frame.timestamp);
      const frames = client.snapshot().frames;
      const index = frames.findIndex(candidate => candidate.timestamp === frame.timestamp);
      if (frames.length > 1) radarMap.prefetch(frames[(index + 1) % frames.length]);
      paint();
    }).catch(error => {
      if (disposed || requestedKey !== key) return;
      loadingFrame = false;
      frameError = "Radar image unavailable. Refresh to retry.";
      console.warn("NEA radar image unavailable", error.name);
      stop();
      paint();
    });
  }

  function paint() {
    if (disposed) return;
    const state = client.snapshot();
    const frames = state.frames;
    const latest = frames.at(-1);
    if (followLatest || !frames.some(frame => frame.timestamp === selectedTime)) selectedTime = latest?.timestamp ?? null;
    const index = frames.findIndex(frame => frame.timestamp === selectedTime);
    const selected = frames[index];
    panel.dataset.sourceState = state.status;
    panel.dataset.frameCount = String(frames.length);
    nodes.status.dataset.state = state.status;
    nodes.status.textContent = ({ current: "Current", cached: "Cached", stale: "Delayed", unavailable: "Unavailable", loading: "Loading" })[state.status];
    navigation.forEach(action => { actions[action].disabled = !mapReady; });
    actions.refresh.disabled = state.fetching || state.attemptedAt !== null && Date.now() - state.attemptedAt < 30000;
    actions.refresh.setAttribute("aria-busy", String(state.fetching));
    actions.play.disabled = !mapReady || frames.length < 2;
    actions.previous.disabled = !mapReady || index <= 0;
    actions.next.disabled = !mapReady || index < 0 || index >= frames.length - 1;
    actions.latest.disabled = !latest;
    nodes.timeline.disabled = !mapReady || frames.length < 2;
    nodes.timeline.max = String(Math.max(0, frames.length - 1));
    nodes.timeline.value = String(Math.max(0, index));
    nodes.timeline.setAttribute("aria-valuetext", selected ? `${dateTime.format(selected.timestamp)} SGT` : "No radar frames");
    nodes.start.textContent = frames.length ? time.format(frames[0].timestamp) : "--:--";
    nodes.end.textContent = latest ? `${time.format(latest.timestamp)} SGT` : "--:--";
    nodes.count.textContent = `${frames.length} frame${frames.length === 1 ? "" : "s"}`;
    nodes.notice.textContent = frameError || state.error || state.historyError || "";
    nodes.notice.hidden = !nodes.notice.textContent;
    if (!latest) {
      stop();
      radarMap?.clear();
      displayed = null;
      requestedKey = null;
      loadingFrame = false;
      delete panel.dataset.frameTimestamp;
    }
    if (displayed && !frames.some(frame => frame.timestamp === displayed.timestamp)) {
      radarMap?.clear();
      displayed = null;
      delete panel.dataset.frameTimestamp;
    }
    if (selected) draw(selected);
    nodes.time.textContent = displayed ? `${dateTime.format(displayed.timestamp)} SGT` : "--:-- SGT";
    nodes["frame-state"].textContent = loadingFrame ? "Loading frame" : !displayed ? "No image displayed" :
      displayed.timestamp !== latest?.timestamp ? "History" : Date.now() - displayed.timestamp > RADAR_MAX_AGE_MS ? "Delayed image" : "Latest image";
    if (mapReady) {
      nodes["map-message"].hidden = Boolean(displayed);
      nodes["map-message"].textContent = loadingFrame || state.status === "loading" ? "Loading radar image" : "Radar imagery unavailable";
    }
  }

  function ensureMap() {
    if (mapPending || disposed) return;
    panel.dataset.mapState = "loading";
    nodes["map-message"].hidden = false;
    nodes["map-message"].textContent = "Loading radar map";
    mapPending = import("./linear-radar-map.mjs").then(({ createRadarMap }) => {
      if (disposed) return;
      radarMap = createRadarMap({ container: nodes.map, attribution: nodes.attribution });
      return radarMap.ready;
    }).then(() => {
      if (disposed) return;
      mapReady = true;
      panel.dataset.mapState = "ready";
      requestedKey = null;
      paint();
    }).catch(error => {
      if (disposed) return;
      console.warn("Radar map unavailable", error.name);
      radarMap?.destroy();
      radarMap = null;
      mapPending = null;
      mapReady = false;
      panel.dataset.mapState = "unavailable";
      nodes["map-message"].hidden = false;
      nodes["map-message"].textContent = "Radar map unavailable";
      paint();
    });
  }

  function setOpen(open) {
    if (disposed) return;
    if (open && panel.hidden) returnFocus = document.activeElement;
    panel.hidden = !open;
    for (const toggle of toggles) {
      toggle.classList.toggle("is-active", open);
      toggle.setAttribute("aria-expanded", String(open));
    }
    document.documentElement.classList.toggle("linear-radar-open", open);
    if (open) { onOpen(); ensureMap(); client.refresh(); paint(); }
    else stop();
  }

  function close() {
    setOpen(false);
    if (returnFocus instanceof HTMLElement && returnFocus.getClientRects().length) returnFocus.focus();
    else toggles.find(toggle => toggle.getClientRects().length)?.focus();
  }

  function select(index) {
    const frames = client.snapshot().frames;
    selectedTime = frames[Math.max(0, Math.min(index, frames.length - 1))]?.timestamp ?? null;
    followLatest = false;
    paint();
  }

  for (const toggle of toggles) toggle.addEventListener("click", () => setOpen(panel.hidden), options);
  actions.close.addEventListener("click", close, options);
  actions.refresh.addEventListener("click", () => { requestedKey = null; frameError = null; client.refresh({ force: true }); ensureMap(); paint(); }, options);
  actions.home.addEventListener("click", () => radarMap?.home(), options);
  actions.locate.addEventListener("click", () => radarMap?.locate(), options);
  actions.coverage.addEventListener("click", () => radarMap?.coverage(), options);
  actions["zoom-in"].addEventListener("click", () => radarMap?.zoom(1), options);
  actions["zoom-out"].addEventListener("click", () => radarMap?.zoom(-1), options);
  actions.latest.addEventListener("click", () => { stop(); followLatest = true; paint(); }, options);
  actions.previous.addEventListener("click", () => { stop(); select(client.snapshot().frames.findIndex(frame => frame.timestamp === selectedTime) - 1); }, options);
  actions.next.addEventListener("click", () => { stop(); select(client.snapshot().frames.findIndex(frame => frame.timestamp === selectedTime) + 1); }, options);
  nodes.timeline.addEventListener("input", () => { stop(); select(Number(nodes.timeline.value)); }, options);
  nodes.opacity.addEventListener("input", () => { nodes["opacity-value"].value = `${nodes.opacity.value}%`; radarMap?.opacity(Number(nodes.opacity.value) / 100); }, options);
  actions.play.addEventListener("click", () => {
    if (playing) { stop(); return; }
    const frames = client.snapshot().frames;
    if (frames.length < 2) return;
    playing = true;
    followLatest = false;
    actions.play.innerHTML = icon("pause");
    actions.play.title = "Pause radar animation";
    actions.play.setAttribute("aria-label", "Pause radar animation");
    actions.play.setAttribute("aria-pressed", "true");
    panel.dataset.playing = "true";
    if (selectedTime === frames.at(-1).timestamp) select(0);
    animationTimer = setInterval(() => {
      if (panel.hidden || document.hidden) { stop(); return; }
      if (loadingFrame) return;
      const current = client.snapshot().frames;
      select((current.findIndex(frame => frame.timestamp === selectedTime) + 1) % current.length);
    }, 900);
  }, options);
  panel.addEventListener("keydown", event => { if (event.key === "Escape") close(); }, options);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!panel.hidden) { client.refresh(); paint(); }
  }, options);
  const refreshTimer = setInterval(() => { if (!panel.hidden && !document.hidden) client.refresh(); }, RADAR_REFRESH_MS);
  const freshnessTimer = setInterval(() => { if (!panel.hidden) paint(); }, 15000);
  paint();
  return { setOpen, destroy() {
    disposed = true;
    stop();
    clearInterval(refreshTimer);
    clearInterval(freshnessTimer);
    events.abort();
    client.destroy();
    radarMap?.destroy();
    panel.remove();
    toggles.forEach(toggle => toggle.remove());
    document.documentElement.classList.remove("linear-radar-open");
  } };
}