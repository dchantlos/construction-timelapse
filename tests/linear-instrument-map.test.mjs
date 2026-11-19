/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { INSTRUMENT_FEEDS } from "../js/linear-instrument-config.mjs";

class Graphic {
  geometryWrites = 0;
  symbolWrites = 0;
  attributeWrites = 0;
  set geometry(value) { this.point = value; this.geometryWrites++; }
  get geometry() { return this.point; }
  set symbol(value) {
    this.style = { ...value, symbolLayers: { getItemAt: index => value.symbolLayers[index] } };
    this.symbolWrites++;
  }
  get symbol() { return this.style; }
  set attributes(value) { this.data = value; this.attributeWrites++; }
}

class GraphicsLayer {
  graphics = [];
  opacityWrites = 0;
  constructor(options) { Object.assign(this, options); }
  set opacity(value) { this.alpha = value; this.opacityWrites++; }
  add(graphic) { this.graphics.push(graphic); }
  remove(graphic) { this.graphics.splice(this.graphics.indexOf(graphic), 1); }
  destroy() {}
}

function createInstrumentLabels({ view }) {
  const labels = {
    entries: new Map(), visible: false, typeFilter: "all",
    update(key, data) { this.entries.set(key, data); },
    remove(key) { this.entries.delete(key); },
    setVisible(value) { this.visible = value; },
    setTypeFilter(value) { this.typeFilter = value; },
    destroy() { this.entries.clear(); }
  };
  view.labels = labels;
  return labels;
}

const modules = new Map([
  ["layers/GraphicsLayer", GraphicsLayer], ["Graphic", Graphic],
  ["Color", class {
    constructor(value) { this.value = value; }
    toRgb() { return this.value.slice(1).match(/.{2}/g).map(channel => parseInt(channel, 16)); }
  }],
  ["webscene/Glow", class { constructor(options) { Object.assign(this, options); } }]
].map(([name, implementation]) => [`@arcgis/core/${name}.js`,
  `data:text/javascript,${encodeURIComponent(`export default ${implementation.toString()}`)}`]));

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./linear-instrument-labels.mjs") {
      return { url: `data:text/javascript,${encodeURIComponent(`export ${createInstrumentLabels.toString()}`)}`, shortCircuit: true };
    }
    if (modules.has(specifier)) return { url: modules.get(specifier), shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { createInstrumentMarkers } = await import("../js/linear-instrument-map.mjs");
hooks.deregister();

function entry({ x = 100, z = 25, text = "6.00", timestamp = 1, color = "#4ade80" } = {}) {
  return { key: "paving:west", feedId: "paving",
    feature: { geometry: { x, y: 200, z, spatialReference: { wkid: 102100 } },
      attributes: { WorkFront: "West", Timestamp: timestamp } },
    reading: { color, text, config: { title: "Paving", unit: "C", mapColor: INSTRUMENT_FEEDS.paving.mapColor } } };
}

function setup(t, reducedMotion = false) {
  const globals = ["document", "matchMedia", "requestAnimationFrame", "cancelAnimationFrame"];
  const originals = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  const frames = new Map();
  let frameId = 0;
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.matchMedia = () => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} });
  globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const layers = [];
  const initialVisibility = [];
  const scene = { addMany(items) { layers.push(...items); initialVisibility.push(...items.map(layer => layer.visible)); }, removeMany() {} };
  const view = { environment: { lighting: {} }, on() { return { remove() {} }; } };
  const markers = createInstrumentMarkers({ scene, view });
  t.after(() => {
    markers.destroy();
    globals.forEach((key, index) => {
      if (originals[index]) Object.defineProperty(globalThis, key, originals[index]);
      else delete globalThis[key];
    });
  });
  return { markers, layers, initialVisibility, labels: view.labels,
    tick(time) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(time));
    },
    get orb() { return layers.find(layer => layer.id === "linstr-orbs-elevated").graphics[0]; },
    get label() { return view.labels.entries.get("paving:west"); }
  };
}

test("stationary telemetry does not redraw graphics for timestamp-only changes", t => {
  const harness = setup(t);
  harness.markers.setLocationsVisible(true);
  harness.markers.update([entry()]);
  harness.tick(0);
  harness.markers.update([entry({ timestamp: 2 })]);
  harness.tick(1400);
  assert.equal(harness.orb.geometryWrites, 1);
  assert.equal(harness.orb.symbolWrites, 1);
  assert.equal(harness.orb.attributeWrites, 0);
  assert.equal(harness.label.geometry, harness.orb.geometry);
  assert.equal(harness.orb.symbol.symbolLayers.getItemAt(0).width, 2);
});

test("moving tracks retain XY and altitude updates but flush only once per pulse trough", t => {
  const harness = setup(t);
  harness.markers.setLocationsVisible(true);
  harness.markers.update([entry()]);
  harness.tick(0);
  harness.markers.update([entry({ x: 101, z: 26, text: "7.00" })]);
  harness.tick(1300);
  assert.equal(harness.orb.geometry.x, 101);
  assert.equal(harness.orb.geometry.z, 26);
  harness.markers.update([entry({ x: 102, z: 27, text: "8.00" })]);
  harness.tick(1400);
  assert.equal(harness.orb.geometry.x, 101);
  harness.tick(2800);
  harness.tick(4200);
  assert.equal(harness.orb.geometry.x, 102);
  assert.equal(harness.label.geometry.z, 27);
  assert.equal(harness.orb.geometryWrites, 3);
  assert.equal(harness.orb.symbolWrites, 1);
});

test("severity changes update readings without changing the sensor type's map color", t => {
  const harness = setup(t);
  harness.markers.setLocationsVisible(true);
  harness.markers.update([entry()]);
  harness.tick(0);
  harness.markers.update([entry({ text: "7.00", color: "#facc15" })]);
  harness.tick(1400);
  assert.equal(harness.label.title, "Paving - West");
  assert.equal(harness.label.value, "7.00 C");
  assert.equal(harness.label.color, INSTRUMENT_FEEDS.paving.mapColor);
  assert.equal(harness.orb.geometryWrites, 1);
  assert.equal(harness.orb.symbolWrites, 1);
});

test("all seven sensor types render distinct colors shared by their West and East tracks", t => {
  const harness = setup(t, true);
  const entries = Object.entries(INSTRUMENT_FEEDS).flatMap(([feedId, config]) =>
    ["West", "East"].map(front => ({ ...entry(), key: `${feedId}:${front}`, feedId,
      reading: { ...entry().reading, config } })));
  harness.markers.update(entries);
  const colors = harness.layers.flatMap(layer => layer.graphics.map(graphic =>
    graphic.symbol.symbolLayers.getItemAt(0).material.color.join(",")));
  assert.equal(colors.length, 14);
  assert.equal(new Set(colors).size, 7);
  for (const color of new Set(colors)) assert.equal(colors.filter(value => value === color).length, 2);
  for (const [feedId, config] of Object.entries(INSTRUMENT_FEEDS)) {
    assert.equal(harness.labels.entries.get(`${feedId}:West`).color, config.mapColor);
    assert.equal(harness.labels.entries.get(`${feedId}:East`).color, config.mapColor);
  }
});

test("markers start hidden and visibility and type filters survive telemetry refreshes", t => {
  const harness = setup(t);
  const entries = [entry(), { ...entry(), key: "settlement:east", feedId: "settlement" }];
  harness.markers.update(entries);
  assert.ok(harness.initialVisibility.every(visible => visible === false));
  assert.ok(harness.layers.every(layer => layer.visible === false));
  assert.equal(harness.labels.visible, false);
  harness.tick(0);
  assert.ok(harness.layers.every(layer => layer.opacityWrites === 0));

  harness.markers.setLocationsVisible(true);
  assert.ok(harness.layers.every(layer => layer.visible));
  assert.equal(harness.labels.visible, true);
  harness.markers.setTypeFilter("paving");
  harness.markers.setLabelsVisible(false);
  harness.markers.update(entries);
  assert.ok(harness.layers.filter(layer => layer.id.includes("ground")).every(layer => !layer.graphics[0].visible));
  assert.equal(harness.labels.visible, false);
  assert.equal(harness.labels.typeFilter, "paving");
  assert.equal(harness.orb.visible, true);

  harness.markers.setLocationsVisible(false);
  harness.markers.update(entries);
  assert.ok(harness.layers.every(layer => !layer.visible));
  harness.markers.setLocationsVisible(true);
  assert.equal(harness.labels.visible, false);
});

test("reduced motion and hidden markers apply moving observations without waiting for animation", t => {
  const harness = setup(t, true);
  harness.markers.update([entry()]);
  harness.markers.update([entry({ x: 101, z: 26 })]);
  assert.equal(harness.orb.geometry.x, 101);
  harness.markers.setLocationsVisible(false);
  harness.markers.update([entry({ x: 102, z: 27 })]);
  assert.equal(harness.orb.geometry.x, 102);
});
