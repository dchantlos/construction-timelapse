import ArcGISMap from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import Basemap from "@arcgis/core/Basemap.js";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer.js";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer.js";
import MediaLayer from "@arcgis/core/layers/MediaLayer.js";
import ImageElement from "@arcgis/core/layers/support/ImageElement.js";
import ExtentAndRotationGeoreference from "@arcgis/core/layers/support/ExtentAndRotationGeoreference.js";
import Extent from "@arcgis/core/geometry/Extent.js";
import { WEATHER_LOCATION } from "./linear-weather.mjs";
import { RADAR_HISTORY_MS, RADAR_URL_MARGIN_MS } from "./linear-radar-data.mjs";

const HOME = new Extent({ xmin: 103.48, ymin: 1.03, xmax: 104.25, ymax: 1.66, spatialReference: { wkid: 4326 } });
const PROJECT_ZOOM = 12;
const MAX_ZOOM = 14;

export function createRadarMap({ container, attribution }) {
  const base = new VectorTileLayer({ title: "Dark Gray Canvas",
    url: "https://cdn.arcgis.com/sharing/rest/content/items/e6b230fe483b43f390a7e767731d52d6/resources/styles/root.json" });
  const radar = new MediaLayer({ title: "NEA weather radar", source: [], opacity: 0.8, copyright: "NEA / data.gov.sg" });
  const corridor = new GeoJSONLayer({
    url: new URL("../docs/radar/roadway-corridor.geojson", import.meta.url).href,
    title: "Roadway project area",
    popupEnabled: false,
    renderer: { type: "simple", symbol: { type: "simple-fill", color: [36, 88, 255, 0.4],
      outline: { color: "#2458ff", width: 3.5 } } },
    effect: "drop-shadow(0px, 0px, 3px, white)"
  });
  const map = new ArcGISMap({ basemap: new Basemap({ title: "Dark Gray Canvas", baseLayers: [base] }), layers: [radar, corridor] });
  const view = new MapView({ container, map, center: [WEATHER_LOCATION.longitude, WEATHER_LOCATION.latitude],
    zoom: PROJECT_ZOOM, background: { color: "#202124" }, popupEnabled: false, ui: { components: [] },
    constraints: { minZoom: 8, maxZoom: MAX_ZOOM, rotationEnabled: false } });
  const cache = new Map();
  const controllers = new Set();
  let requestId = 0;
  let disposed = false;
  let shown = null;
  let footprint = null;

  function frameKey(frame) { return `${frame.timestamp}:${frame.updatedTimestamp}`; }

  function loadFrame(frame) {
    const key = frameKey(frame);
    if (cache.has(key)) return cache.get(key).pending;
    const entry = { timestamp: frame.timestamp, element: null, pending: null };
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 15000);
    entry.pending = Promise.resolve().then(async () => {
      try {
        if (disposed || frame.expiresAt <= Date.now() + RADAR_URL_MARGIN_MS) throw new Error("Radar image URL expired");
        const response = await fetch(frame.url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Radar image HTTP ${response.status}`);
        if (!response.headers.get("content-type")?.startsWith("image/png")) throw new Error("Unexpected radar image format");
        const bitmap = await createImageBitmap(await response.blob());
        if (disposed) { bitmap.close(); throw new Error("Radar view closed"); }
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d").drawImage(bitmap, 0, 0);
        bitmap.close();
        const element = new ImageElement({ image: canvas,
          georeference: new ExtentAndRotationGeoreference({ extent: new Extent(frame.extent) }) });
        await element.load();
        entry.element = element;
        return element;
      } catch (error) {
        cache.delete(key);
        throw error;
      } finally {
        clearTimeout(timeout);
        controllers.delete(controller);
      }
    });
    cache.set(key, entry);
    return entry.pending;
  }

  async function showFrame(frame) {
    const serial = ++requestId;
    const element = await loadFrame(frame);
    if (disposed || serial !== requestId) return false;
    radar.source.elements.removeAll();
    radar.source.elements.add(element);
    radar.visible = true;
    shown = element;
    footprint = frame.extent;
    container.dataset.frameTimestamp = String(frame.timestamp);
    for (const [key, entry] of cache) {
      if (entry.timestamp < Date.now() - RADAR_HISTORY_MS && entry.element !== shown) cache.delete(key);
    }
    return true;
  }

  function navigate(target) {
    if (disposed) return;
    return view.goTo(target, { animate: false }).catch(error => {
      if (!disposed) console.warn("Radar map navigation unavailable", error.name);
    });
  }

  return {
    ready: Promise.all([view.when(), base.load(), corridor.load()]).then(() => {
      const credits = [base.copyright].filter(Boolean);
      if (!credits.length) throw new Error("Basemap attribution unavailable");
      if (!disposed) attribution.textContent = credits.join(" | ");
    }),
    showFrame,
    prefetch: frame => loadFrame(frame).catch(error => { if (!disposed) console.warn("Radar frame prefetch unavailable", error.name); }),
    clear() { requestId += 1; radar.visible = false; delete container.dataset.frameTimestamp; },
    opacity(value) { radar.opacity = Math.max(0.2, Math.min(1, value)); },
    home: () => navigate(HOME),
    coverage: () => footprint && navigate(new Extent(footprint)),
    locate: () => navigate({ center: [WEATHER_LOCATION.longitude, WEATHER_LOCATION.latitude], zoom: PROJECT_ZOOM }),
    zoom: delta => navigate({ zoom: Math.max(8, Math.min(MAX_ZOOM, view.zoom + delta)) }),
    destroy() {
      disposed = true;
      requestId += 1;
      for (const controller of controllers) controller.abort();
      cache.clear();
      view.destroy();
    }
  };
}