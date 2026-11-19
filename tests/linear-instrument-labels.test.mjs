/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const reactiveModule = `data:text/javascript,${encodeURIComponent(`
  const callbacks = new Set();
  export function watch(expression, callback, options) {
    callbacks.add(callback);
    if (options.initial) callback();
    return { remove() { callbacks.delete(callback); } };
  }
  export function notify() { for (const callback of callbacks) callback(); }
`)}`;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@arcgis/core/core/reactiveUtils.js") return { url: reactiveModule, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});
const { createInstrumentLabels } = await import("../js/linear-instrument-labels.mjs");
const { notify } = await import("@arcgis/core/core/reactiveUtils.js");
hooks.deregister();

class Element {
  children = [];
  dataset = {};
  style = { setProperty(key, value) { this[key] = value; } };
  events = new Map();
  textWrites = [];
  set textContent(value) { this.text = value; this.textWrites.push(value); }
  get textContent() { return this.text ?? ""; }
  append(...children) {
    children.forEach(child => { child.parent = this; this.children.push(child); });
  }
  remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(type, callback) { this.events.set(type, callback); }
  getBoundingClientRect() { return { left: 100, width: 80, bottom: 120 }; }
}

class Point {
  constructor(x = 0, y = 0, z = 10) { Object.assign(this, { x, y, z }); }
  clone() { return new Point(this.x, this.y, this.z); }
}

function setup(t) {
  const keys = ["document", "requestAnimationFrame", "cancelAnimationFrame"];
  const originals = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  let frameId = 0;
  const frames = new Map();
  globalThis.document = { createElement: () => new Element() };
  globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const selected = [];
  const view = { container: new Element(), width: 640, height: 480,
    camera: { position: new Point(0, 0, 100), heading: 0, tilt: 0, fov: 55 },
    groundView: { elevationSampler: { noDataValue: -9999, height: 25,
      queryElevation(point) { point.z = this.height; return point; },
      on() { return { remove() {} }; }
    } },
    toScreen(point) { return { x: 320 + point.x, y: 240 + point.y - point.z }; }
  };
  const labels = createInstrumentLabels({ view, onSelect: (...args) => selected.push(args) });
  const root = view.container.children[0];
  t.after(() => {
    labels.destroy();
    keys.forEach((key, index) => {
      if (originals[index]) Object.defineProperty(globalThis, key, originals[index]);
      else delete globalThis[key];
    });
  });
  return { labels, root, view, selected,
    update(value = "50.0 C", geometry = new Point(), onGround = false) {
      labels.update("concrete:east", { feedId: "concrete", title: "Concrete - East", value,
        color: "#4ade80", geometry, onGround });
    },
    cameraChanged() {
      notify();
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback());
    }
  };
}

test("live readings change persistent label nodes directly without an empty intermediate value", t => {
  const h = setup(t);
  h.update();
  assert.equal(h.root.hidden, true);
  h.labels.setVisible(true);
  const element = h.root.children[0];
  const button = element.children[1];
  const title = button.children[0];
  const value = button.children[1];
  h.update("50.1 C");
  h.update("50.2 C");
  assert.equal(h.root.children[0], element);
  assert.equal(element.children[1], button);
  assert.equal(button.children[0], title);
  assert.equal(button.children[1], value);
  assert.deepEqual(value.textWrites, ["50.0 C", "50.1 C", "50.2 C"]);
  assert.equal(element.hidden, false);
  button.events.get("click")({ stopPropagation() {} });
  assert.deepEqual(h.selected, [["concrete:east", { x: 140, y: 120 }]]);
});

test("labels follow camera and sensor movement and honor visibility, filters, and removal", t => {
  const h = setup(t);
  h.update();
  h.labels.setVisible(true);
  const element = h.root.children[0];
  assert.equal(element.style.top, "230px");
  h.update("50.1 C", new Point(40, 0, 20));
  assert.equal(element.style.left, "360px");
  assert.equal(element.style.top, "220px");
  h.view.toScreen = point => ({ x: 300 + point.x, y: 200 + point.y - point.z });
  h.cameraChanged();
  assert.equal(element.style.left, "340px");
  h.labels.setTypeFilter("settlement");
  assert.equal(element.hidden, true);
  h.labels.setTypeFilter("all");
  assert.equal(element.hidden, false);
  h.labels.setVisible(false);
  h.update("50.2 C");
  assert.equal(h.root.hidden, true);
  h.labels.setVisible(true);
  h.view.toScreen = () => ({ x: -100, y: 200 });
  h.cameraChanged();
  assert.equal(element.hidden, true);
  h.labels.remove("concrete:east");
  assert.equal(h.root.children.length, 0);
});

test("ground labels sample the rendered terrain without mutating source coordinates or inventing missing heights", t => {
  const h = setup(t);
  const geometry = new Point(0, 0, 0);
  h.update("50.0 C", geometry, true);
  h.labels.setVisible(true);
  const element = h.root.children[0];
  assert.equal(element.style.top, "215px");
  assert.equal(geometry.z, 0);
  h.view.groundView.elevationSampler.height = 35;
  h.cameraChanged();
  assert.equal(element.style.top, "205px");
  h.view.groundView.elevationSampler.height = -9999;
  h.cameraChanged();
  assert.equal(element.hidden, true);
  assert.equal(geometry.z, 0);
});
