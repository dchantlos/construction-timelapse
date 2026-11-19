import { createReplaySource } from "./linear-feed-source.mjs?v=4";
import { createInstrumentStore } from "./linear-instrument-store.mjs?v=3";
import { createInstrumentMarkers } from "./linear-instrument-map.mjs?v=5";
import { createInstrumentPanel } from "./linear-instrument-panel.mjs?v=6";

export function createLinearInstruments({ scene, view, layout, onReadings, sourceFactory = createReplaySource }) {
  const store = createInstrumentStore();
  let sourceState = { mode: "simulation", running: true, multiplier: 60, feeds: {} };
  let markers = null;
  let panel = null;
  let disposed = false;
  function paint() {
    if (disposed) return;
    const entries = store.snapshot({ paused: !sourceState.running });
    markers?.update(entries);
    panel?.render(entries, sourceState);
    onReadings?.(entries);
  }
  const source = sourceFactory({
    onFeature: (feedId, feature) => {
      if (!store.ingest(feedId, feature)) console.warn(`Discarded invalid ${feedId} instrument observation`);
    },
    onState: state => { sourceState = state; paint(); },
    onReset: () => { store.clear(); paint(); }
  });
  if (scene && view) markers = createInstrumentMarkers({ scene, view, onSelect: (key, point) => panel?.inspect(key, point) });
  panel = createInstrumentPanel(layout, {
    locations: visible => markers?.setLocationsVisible(visible),
    filter: feedId => markers?.setTypeFilter(feedId)
  });
  const freshness = setInterval(paint, 5000);
  return { start: () => source.start(), hidePopup: () => panel.hidePopup(),
    destroy() {
      disposed = true;
      clearInterval(freshness);
      source.destroy();
      markers?.destroy();
      panel.destroy();
      store.clear();
    }
  };
}