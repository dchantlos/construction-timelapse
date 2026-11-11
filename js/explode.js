// =============================================================================
// explode.js — "Exploded view" of the BIM tower, shared by both views.
//
// One click springs the tower's vertical zones apart (podium, mid-rise, top —
// EXPLODE in config.js); a second click settles them back.
//
// Each BIM scene layer is split once, on first use, into one layer per zone it
// occupies: the original keeps its lowest zone (via definitionExpression) and
// clones carry the others. Clones mirror the original's live state, so the
// timeline, isolation, layer toggles, IDS review and cost lenses keep driving
// the original layers exactly as before.
//
// Zones move with `relative-to-ground` elevation offsets, which the SDK applies
// per frame without reloading (an `absolute-height` offset change reloads every
// node, so the layer blinks). Relative placement adds the ground height under
// each element, so installSitePad() flattens the terrain under the footprint to
// one known height before the view starts; subtracting it keeps every lifted
// element exactly aligned.
// =============================================================================

import BaseElevationLayer from "@arcgis/core/layers/BaseElevationLayer.js";
import Multipoint from "@arcgis/core/geometry/Multipoint.js";
import Point from "@arcgis/core/geometry/Point.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import { BUILDING_LAYERS, EXPLODE } from "./config.js?v=14";

const BIM_TITLES = new Set(BUILDING_LAYERS.map((l) => l.id.toLowerCase()));

/** BIM building layers on either view ("Slabs", "Slabs (Current)", …). */
function isBimLayer(layer) {
  if (layer?.type !== "scene") return false;
  const name = (layer.title ?? "")
    .replace(/\s*\(current\)\s*$/i, "")
    .trim()
    .toLowerCase();
  return BIM_TITLES.has(name);
}

/** Resolve with the promise's value, or `fallback` if it fails or takes > ms. */
function settle(promise, ms, fallback = null) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

/** Union of the layers' full extents. */
function unionExtent(layers) {
  let extent = null;
  for (const layer of layers) {
    const ext = layer.fullExtent;
    if (ext) extent = extent ? extent.union(ext) : ext.clone();
  }
  return extent;
}

// ---------- Site pad -----------------------------------------------------------

/** Mean ground height over an extent, sampled from the source terrain. */
async function meanGroundHeight(terrain, extent) {
  const n = 6;
  const points = [];
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      points.push([
        extent.xmin + (i / n) * extent.width,
        extent.ymin + (j / n) * extent.height
      ]);
    }
  }
  const { geometry, noDataValue } = await terrain.queryElevation(
    new Multipoint({ points, spatialReference: extent.spatialReference })
  );
  const heights = geometry.points
    .map((p) => p[2])
    .filter((z) => Number.isFinite(z) && z !== noDataValue);
  return heights.length
    ? heights.reduce((sum, z) => sum + z, 0) / heights.length
    : null;
}

/** The flat pad under the BIM model: its footprint plus a margin, at mean ground height. */
async function computePad(terrain, bimLayers) {
  await Promise.allSettled(bimLayers.map((layer) => layer.load()));
  const footprint = unionExtent(bimLayers.filter((layer) => layer.loaded));
  const tileSR = terrain.tileInfo?.spatialReference;
  if (!footprint || !tileSR || !footprint.spatialReference.equals(tileSR)) return null;

  const elevation = await meanGroundHeight(terrain, footprint);
  if (elevation == null) return null;

  const m = EXPLODE.padMargin;
  return {
    xmin: footprint.xmin - m,
    ymin: footprint.ymin - m,
    xmax: footprint.xmax + m,
    ymax: footprint.ymax + m,
    elevation
  };
}

/** Overwrite the pad's samples in an elevation tile with the pad height. */
function flattenTile(tile, tileInfo, level, row, col, pad) {
  const lod = tileInfo.lods.find((l) => l.level === level);
  if (!lod || !tile?.values) return;
  const span = tileInfo.size[0] * lod.resolution;
  const xmin = tileInfo.origin.x + col * span;
  const ymax = tileInfo.origin.y - row * span;
  if (xmin > pad.xmax || xmin + span < pad.xmin || ymax < pad.ymin || ymax - span > pad.ymax) return;

  // Elevation tiles sample the tile corners (e.g. 257 × 257 for 256 px tiles).
  const { width, height, values } = tile;
  const dx = span / (width - 1);
  const dy = span / (height - 1);
  const i0 = Math.max(0, Math.ceil((pad.xmin - xmin) / dx));
  const i1 = Math.min(width - 1, Math.floor((pad.xmax - xmin) / dx));
  const j0 = Math.max(0, Math.ceil((ymax - pad.ymax) / dy));
  const j1 = Math.min(height - 1, Math.floor((ymax - pad.ymin) / dy));
  if (i0 > i1) return;
  for (let j = j0; j <= j1; j++) {
    values.fill(pad.elevation, j * width + i0, j * width + i1 + 1);
  }
}

/**
 * Flatten the terrain under the BIM model to one height by wrapping the scene's
 * elevation layer, so `relative-to-ground` offsets lift every element by the
 * same amount. Call after the WebScene loads and before the SceneView gets it:
 * swapping elevation layers on a live view makes the whole scene jump. The pad
 * sits under the building (plus a few metres) at the mean ground height there.
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 */
export function installSitePad(scene) {
  const layers = scene.ground?.layers;
  const terrain = layers?.find((layer) => layer.type === "elevation");
  const bimLayers = scene.allLayers.filter(isBimLayer).toArray();
  if (!terrain || !bimLayers.length) return;

  let pad = null;
  let resolvePad;
  const padReady = new Promise((resolve) => (resolvePad = resolve));

  const SitePadLayer = BaseElevationLayer.createSubclass({
    load() {
      const ready = terrain.load().then(async () => {
        this.tileInfo = terrain.tileInfo;
        this.spatialReference = terrain.spatialReference;
        this.fullExtent = terrain.fullExtent;
        // Keep the terrain's data credits in the Esri attribution.
        this.copyright = terrain.copyright;
        pad = await settle(computePad(terrain, bimLayers), 8000);
      });
      // Never leaves a rejection unhandled (the app surfaces those on the veil).
      ready.then(
        () => resolvePad(pad),
        () => resolvePad(null)
      );
      this.addResolvingPromise(ready);
    },

    /** Resolves to the pad ({ xmin, ymin, xmax, ymax, elevation }) or null. */
    whenSitePad() {
      return padReady;
    },

    async fetchTile(level, row, col, options) {
      const tile = await terrain.fetchTile(level, row, col, options);
      if (pad) flattenTile(tile, this.tileInfo, level, row, col, pad);
      return tile;
    }
  });

  layers.splice(
    layers.indexOf(terrain),
    1,
    new SitePadLayer({ id: terrain.id, title: terrain.title, listMode: terrain.listMode })
  );
}

/** The scene's site pad, or null if it isn't installed or couldn't be computed. */
function sitePadOf(scene) {
  const layer = scene.ground?.layers.find((l) => typeof l.whenSitePad === "function");
  return layer ? settle(layer.whenSitePad(), 8000) : Promise.resolve(null);
}

// ---------- Exploded view --------------------------------------------------------

// Spring like the ArcGIS explode-view demo's anime.js "spring" (mass 1,
// stiffness 100, damping 10): a quick lift with a soft overshoot.
const SPRING = { zeta: 0.5, omega: 10, ms: 1400 };
const COLLAPSE_MS = 550;

// Pixels kept clear at the top of the view for the app's top bar.
const SAFE_TOP = 96;

/** Damped spring step response, 0 → 1 over `t` seconds. */
function spring(t) {
  const { zeta, omega } = SPRING;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return (
    1 -
    Math.exp(-zeta * omega * t) *
      (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
  );
}

const easeInOutCubic = (x) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/** Where-clause selecting one zone's storeys. */
function zoneWhere(zone) {
  const f = EXPLODE.levelField;
  return `(${f} >= ${zone.min} AND ${f} <= ${zone.max})`;
}

/**
 * Indices of the zones a layer has elements in, from its cached I3S
 * statistics. Falls back to every zone when the statistics can't prove which
 * storeys are present (a zone without elements just costs an empty clone).
 */
async function occupiedZones(layer) {
  const all = EXPLODE.zones.map((_, i) => i);
  try {
    const doc = await layer.queryCachedStatistics(EXPLODE.levelField);
    const stats = doc?.stats ?? doc ?? {};
    const frequent = stats.mostFrequentValues ?? [];
    const counted = frequent.reduce((sum, v) => sum + Number(v.count || 0), 0);
    const total = Number(stats.count ?? stats.totalValuesCount ?? counted);
    if (frequent.length && counted >= total) {
      const levels = frequent.map((v) => Number(v.value)).filter(Number.isFinite);
      return all.filter((i) => {
        const { min, max } = EXPLODE.zones[i];
        return levels.some((level) => level >= min && level <= max);
      });
    }
    if (Number.isFinite(stats.min) && Number.isFinite(stats.max)) {
      return all.filter((i) => {
        const { min, max } = EXPLODE.zones[i];
        return max >= stats.min && min <= stats.max;
      });
    }
  } catch (err) {
    console.warn(`Exploded view: no ${EXPLODE.levelField} statistics for "${layer.title}"`, err);
  }
  return all;
}

/**
 * Resolve once a layer view has loaded what it needs: streaming starts right
 * after the layer view is created, so wait for it to begin and then to end.
 */
async function whenDrawn(view, layer) {
  const layerView = await view.whenLayerView(layer);
  await settle(reactiveUtils.whenOnce(() => layerView.updating), 500);
  await reactiveUtils.whenOnce(() => !layerView.updating);
}

/** Live state copied from an original layer to its zone clones. */
const MIRRORED = ["visible", "opacity", "renderer", "useViewTime", "outFields"];

/** Keep a clone's live state in sync with its original layer. */
function mirror(source, clone) {
  for (const prop of MIRRORED) {
    reactiveUtils.watch(
      () => source[prop],
      (value) => {
        if (prop === "renderer") clone.renderer = value ? value.clone() : null;
        else if (prop === "outFields") clone.outFields = value ? [...value] : value;
        else clone[prop] = value;
      },
      { initial: true }
    );
  }
}

/**
 * Wire the exploded-view toggle (#explodeBtn in the nav stack).
 *
 * @param {object} opts
 * @param {import("@arcgis/core/WebScene").default} opts.scene
 * @param {import("@arcgis/core/views/SceneView").default} opts.view
 * @param {{ isRunning: () => boolean, pause: () => void, resume: () => void }} [opts.playback]
 *   The view's timeline/orbit animation, if any. It's paused while the first
 *   use loads the zone layers (per-frame time and camera changes slow that
 *   several-fold), and the camera is left to it while it runs.
 * @returns {{ toggle: () => Promise<void>, isExploded: () => boolean }}
 */
export function createExplode({ scene, view, playback }) {
  const button = document.getElementById("explodeBtn");
  const originals = scene.allLayers.filter(isBimLayer).toArray();
  if (!button || !originals.length) {
    return { toggle: async () => {}, isExploded: () => false };
  }

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let moving = null; // layers that lift: [{ layer, lift }], set once split
  let splitting = null; // first-use split in flight
  let groundZ = 0; // pad height, subtracted from the relative offsets
  let top = null; // highest point of the fully exploded model
  let target = 0; // 0 collapsed, 1 exploded
  let amount = 0; // current explode amount (springs past 1 briefly)
  let frame = 0;
  let fit = null; // { before, after } while revealTop()'s zoom-out applies

  function render() {
    const on = target === 1;
    const busy = !!splitting;
    button.classList.toggle("is-active", on);
    button.classList.toggle("is-busy", busy);
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-busy", String(busy));
    button.title = busy
      ? "Preparing the exploded view…"
      : on
        ? "Collapse the exploded view"
        : "Exploded view: lift the floors apart";
  }

  /** Split every BIM layer into per-zone layers (first use only). */
  async function split() {
    await Promise.allSettled(originals.map((layer) => layer.load()));
    const plans = await Promise.all(
      originals.map(async (layer) => ({ layer, zones: await occupiedZones(layer) }))
    );
    const pad = await sitePadOf(scene);
    const footprint = unionExtent(originals);
    groundZ =
      pad?.elevation ??
      (footprint ? view.groundView?.elevationSampler?.queryElevation(footprint.center)?.z : 0) ??
      0;
    const zmax = Math.max(...originals.map((layer) => layer.fullExtent?.zmax ?? -Infinity));
    if (footprint && Number.isFinite(zmax)) {
      top = new Point({
        x: footprint.center.x,
        y: footprint.center.y,
        z: zmax + (EXPLODE.zones.length - 1) * EXPLODE.gap,
        spatialReference: footprint.spatialReference
      });
    }

    const lifts = [];
    const clones = [];
    const bases = [];
    for (const { layer, zones } of plans) {
      if (!zones.length) continue;
      const [base, ...rest] = zones;
      for (const k of rest) {
        const clone = layer.clone();
        clone.id = `${layer.id}-explode-${k}`;
        clone.listMode = "hide";
        clone.definitionExpression = zoneWhere(EXPLODE.zones[k]);
        mirror(layer, clone);
        clones.push(clone);
        lifts.push({ layer: clone, lift: k * EXPLODE.gap });
      }
      if (base > 0) lifts.push({ layer, lift: base * EXPLODE.gap });
      if (rest.length) {
        // The original keeps everything its clones don't carry (incl. unknown levels).
        const carried = rest.map((k) => zoneWhere(EXPLODE.zones[k])).join(" OR ");
        bases.push({
          layer,
          where: `${EXPLODE.levelField} IS NULL OR NOT (${carried})`
        });
      }
    }

    // Clones first draw in place, exactly over the originals; only then do the
    // originals drop those storeys, so nothing flickers.
    scene.addMany(clones);
    await Promise.all(clones.map((clone) => settle(whenDrawn(view, clone), 8000)));
    for (const { layer, where } of bases) layer.definitionExpression = where;
    moving = lifts;
  }

  function apply(value) {
    // Collapsed layers stay relative (offset −groundZ, exact on the flat pad):
    // returning to absolute placement leaves the SDK's edge lines lifted.
    for (const { layer, lift } of moving) {
      layer.elevationInfo = {
        mode: "relative-to-ground",
        offset: lift * value - groundZ
      };
    }
  }

  function animateTo(next) {
    cancelAnimationFrame(frame);
    const from = amount;
    if (from === next) return;
    if (reduceMotion?.matches) {
      amount = next;
      apply(amount);
      return;
    }
    const exploding = next > from;
    const duration = exploding ? SPRING.ms : COLLAPSE_MS;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = exploding ? spring((t * duration) / 1000) : easeInOutCubic(t);
      amount = t >= 1 ? next : from + (next - from) * eased;
      apply(amount);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  /**
   * If the lifted top would hide under the top bar, ease the zoom out around
   * the same center (heading and tilt kept). Skipped while an orbit owns the
   * camera.
   */
  function revealTop() {
    if (!top || playback?.isRunning()) return;
    const screen = view.toScreen(top);
    if (screen && screen.y >= SAFE_TOP) return;
    const cy = view.height / 2;
    const k =
      screen && screen.y < cy
        ? Math.min(2, (cy - screen.y) / (cy - SAFE_TOP)) * 1.06
        : 1.6;
    const current = { before: view.camera.clone(), after: null };
    fit = current;
    view
      .goTo(
        { zoom: view.zoom - Math.log2(k) },
        { animate: !reduceMotion?.matches, duration: 1200, easing: "in-out-cubic" }
      )
      .then(() => {
        if (fit === current) current.after = view.camera.clone();
      })
      .catch(() => {
        // Interrupted by the user or an orbit: leave the camera to them.
        if (fit === current) fit = null;
      });
  }

  /** Undo revealTop() on collapse, unless the camera has moved since. */
  function restoreCamera() {
    const current = fit;
    fit = null;
    if (!current || playback?.isRunning()) return;
    if (current.after) {
      const { position: p, heading, tilt } = view.camera;
      const q = current.after.position;
      const moved =
        Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) > 0.5 ||
        Math.abs(heading - current.after.heading) > 0.1 ||
        Math.abs(tilt - current.after.tilt) > 0.1;
      if (moved) return;
    }
    view
      .goTo(current.before, { animate: !reduceMotion?.matches, duration: 900, easing: "in-out-cubic" })
      .catch(() => {});
  }

  async function toggle() {
    target = target === 1 ? 0 : 1;
    if (!moving) {
      if (target === 0) {
        render();
        return;
      }
      splitting ??= (async () => {
        const wasRunning = !!playback?.isRunning();
        if (wasRunning) playback.pause();
        try {
          await split();
        } catch (err) {
          console.warn("Exploded view unavailable", err);
        } finally {
          if (wasRunning && !playback.isRunning()) playback.resume();
          splitting = null;
          if (!moving) target = 0;
          render();
        }
      })();
      render();
      await splitting;
      if (!moving) return;
    }
    render();
    animateTo(target);
    if (target === 1) revealTop();
    else restoreCamera();
  }

  button.addEventListener("click", toggle);
  render();

  return { toggle, isExploded: () => target === 1 };
}
