import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Color from "@arcgis/core/Color.js";
import Glow from "@arcgis/core/webscene/Glow.js";
import { orbSymbol, sensorPulseAt, SENSOR_GLOW_INTENSITY } from "./sensor-marker-style.mjs?v=2";
import { createInstrumentLabels } from "./linear-instrument-labels.mjs";

export function createInstrumentMarkers({ scene, view, onSelect = () => {} }) {
  const groups = new Map();
  const records = new Map();
  const byGraphic = new Map();
  let locationsVisible = false;
  let labelsVisible = true;
  let typeFilter = "all";
  let disposed = false;
  let animation = 0;
  let beganAt = null;
  let flushedThisTrough = false;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const labels = createInstrumentLabels({ view, onSelect });
  const previousGlow = view.environment.lighting.glow;
  const glow = new Glow({ intensity: SENSOR_GLOW_INTENSITY });
  view.environment.lighting.glow = glow;
  for (const [mode, elevationMode] of [["ground", "on-the-ground"], ["elevated", "absolute-height"]]) {
    const elevationInfo = { mode: elevationMode };
    const orbs = new GraphicsLayer({ id: `linstr-orbs-${mode}`, title: "Roadway instruments", elevationInfo, visible: false });
    groups.set(mode, { orbs, mode });
    scene.addMany([orbs]);
  }

  function apply(record, entry) {
    const { feature, reading } = entry;
    const color = reading.config.mapColor;
    const rgb = new Color(color).toRgb();
    const geometry = { type: "point", ...feature.geometry, z: feature.geometry.z ?? 0 };
    const previous = record.orb.geometry;
    if (!previous || previous.x !== geometry.x || previous.y !== geometry.y ||
        previous.z !== geometry.z || previous.spatialReference.wkid !== geometry.spatialReference.wkid) {
      record.orb.geometry = geometry;
    }
    labels.update(entry.key, { feedId: entry.feedId, geometry: record.orb.geometry,
      onGround: record.group.mode === "ground", color,
      title: `${reading.config.label ?? reading.config.title} - ${feature.attributes.WorkFront}`, value: `${reading.text} ${reading.config.unit}` });
    if (record.color !== color) record.orb.symbol = orbSymbol(rgb, 2);
    record.color = color;
    record.pending = null;
  }

  function flush() {
    for (const record of records.values()) if (record.pending) apply(record, record.pending);
  }

  function pulse(timestamp) {
    if (disposed || !locationsVisible || document.hidden) return;
    beganAt ??= timestamp;
    const opacity = sensorPulseAt(timestamp - beganAt, motion.matches);
    for (const pair of groups.values()) {
      pair.orbs.opacity = opacity.orbs;
    }
    if (motion.matches || (opacity.trough && !flushedThisTrough)) {
      flush();
      flushedThisTrough = true;
    } else if (opacity.orbs >= 0.775) flushedThisTrough = false;
    if (!motion.matches) animation = requestAnimationFrame(pulse);
  }

  function syncVisibility() {
    for (const pair of groups.values()) {
      pair.orbs.visible = locationsVisible;
    }
    for (const record of records.values()) {
      record.orb.visible = typeFilter === "all" || record.feedId === typeFilter;
    }
    labels.setVisible(locationsVisible && labelsVisible);
    labels.setTypeFilter(typeFilter);
    cancelAnimationFrame(animation);
    if (locationsVisible && !document.hidden) {
      if (motion.matches) { flush(); pulse(performance.now()); }
      else animation = requestAnimationFrame(pulse);
    }
  }

  const click = view.on("click", async event => {
    if (!locationsVisible || disposed) return;
    try {
      const included = [...groups.values()].map(pair => pair.orbs);
      const result = await view.hitTest(event, { include: included });
      if (disposed) return;
      const hit = result.results.find(candidate => candidate.type === "graphic" && byGraphic.has(candidate.graphic));
      if (hit) onSelect(byGraphic.get(hit.graphic), { x: event.x, y: event.y });
    } catch (error) { if (!disposed) console.warn("Instrument selection unavailable", error); }
  });
  document.addEventListener("visibilitychange", syncVisibility);
  motion.addEventListener("change", syncVisibility);
  syncVisibility();

  return {
    update(entries) {
      if (disposed) return;
      const keys = new Set(entries.map(entry => entry.key));
      for (const [key, record] of records) {
        if (keys.has(key)) continue;
        record.group.orbs.remove(record.orb);
        byGraphic.delete(record.orb);
        labels.remove(key);
        records.delete(key);
      }
      for (const entry of entries) {
        let record = records.get(entry.key);
        if (!record) {
          const group = groups.get(["paving", "concrete"].includes(entry.feedId) ? "elevated" : "ground");
          record = { feedId: entry.feedId, group, orb: new Graphic(), pending: null };
          records.set(entry.key, record);
          byGraphic.set(record.orb, entry.key);
          record.orb.visible = typeFilter === "all" || entry.feedId === typeFilter;
          apply(record, entry);
          group.orbs.add(record.orb);
        } else if (motion.matches || !locationsVisible || document.hidden) apply(record, entry);
        else record.pending = entry;
      }
    },
    setLocationsVisible(value) { locationsVisible = Boolean(value); syncVisibility(); },
    setLabelsVisible(value) { labelsVisible = Boolean(value); syncVisibility(); },
    setTypeFilter(value) { typeFilter = value; syncVisibility(); },
    focus(key) {
      const record = records.get(key);
      if (!record) return;
      locationsVisible = true;
      syncVisibility();
      return view.goTo({ target: record.orb.geometry, scale: 1200, tilt: 65 }, { animate: !motion.matches, duration: 600 })
        .catch(error => { if (!disposed) console.warn("Instrument location unavailable", error); });
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(animation);
      click.remove();
      document.removeEventListener("visibilitychange", syncVisibility);
      motion.removeEventListener("change", syncVisibility);
      labels.destroy();
      for (const pair of groups.values()) {
        scene.removeMany([pair.orbs]);
        pair.orbs.destroy();
      }
      if (view.environment.lighting.glow === glow) view.environment.lighting.glow = previousGlow;
      records.clear();
      byGraphic.clear();
    }
  };
}