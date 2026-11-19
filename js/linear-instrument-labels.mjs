/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

export function createInstrumentLabels({ view, onSelect }) {
  const root = document.createElement("div");
  root.className = "linstr-label-overlay";
  root.hidden = true;
  view.container.append(root);
  const records = new Map();
  let visible = false;
  let typeFilter = "all";
  let frame = 0;
  let sampler = null;
  let samplerHandle = null;

  function position(record) {
    const { element, data } = record;
    if (!visible || (typeFilter !== "all" && typeFilter !== data.feedId)) {
      element.hidden = true;
      return;
    }
    const geometry = data.geometry.clone();
    if (data.onGround) {
      if (!sampler) { element.hidden = true; return; }
      // The view's sampler follows the rendered terrain and mutates its input.
      sampler.queryElevation(geometry);
      if (!Number.isFinite(geometry.z) || geometry.z === sampler.noDataValue) { element.hidden = true; return; }
    }
    const point = view.toScreen(geometry);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
        point.x < 0 || point.y < 0 || point.x > view.width || point.y > view.height) {
      element.hidden = true;
      return;
    }
    const raised = geometry.clone();
    raised.z += 16;
    const above = view.toScreen(raised);
    const offset = above ? Math.max(22, Math.hypot(above.x - point.x, above.y - point.y)) : 22;
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
    element.style.setProperty("--label-offset", `${offset}px`);
    element.hidden = false;
  }

  function positionAll() {
    for (const record of records.values()) position(record);
  }

  function schedule() {
    if (visible && !frame) frame = requestAnimationFrame(() => { frame = 0; positionAll(); });
  }

  const watch = reactiveUtils.watch(() => [
    view.camera.position.x, view.camera.position.y, view.camera.position.z,
    view.camera.heading, view.camera.tilt, view.camera.fov, view.width, view.height,
    view.groundView?.elevationSampler
  ], () => {
    const nextSampler = view.groundView?.elevationSampler;
    if (sampler !== nextSampler) {
      samplerHandle?.remove();
      sampler = nextSampler;
      samplerHandle = sampler?.on("changed", schedule);
    }
    schedule();
  }, { initial: true });

  return {
    update(key, data) {
      let record = records.get(key);
      if (!record) {
        const element = document.createElement("div");
        element.className = "linstr-map-label";
        element.dataset.instrumentKey = key;
        element.hidden = true;
        const line = document.createElement("span");
        line.className = "linstr-map-label__line";
        line.setAttribute("aria-hidden", "true");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "linstr-map-label__text";
        const title = document.createElement("span");
        const value = document.createElement("span");
        button.append(title, value);
        element.append(line, button);
        root.append(element);
        button.addEventListener("pointerdown", event => event.stopPropagation());
        button.addEventListener("click", event => {
          event.stopPropagation();
          const box = button.getBoundingClientRect();
          onSelect(key, { x: box.left + box.width / 2, y: box.bottom });
        });
        record = { element, title, value, data };
        records.set(key, record);
      }
      record.data = data;
      if (record.title.textContent !== data.title) record.title.textContent = data.title;
      if (record.value.textContent !== data.value) record.value.textContent = data.value;
      record.element.style.setProperty("--instrument-color", data.color);
      position(record);
    },
    remove(key) {
      records.get(key)?.element.remove();
      records.delete(key);
    },
    setVisible(value) { visible = value; root.hidden = !value; positionAll(); },
    setTypeFilter(value) { typeFilter = value; positionAll(); },
    destroy() {
      cancelAnimationFrame(frame);
      watch.remove();
      samplerHandle?.remove();
      root.remove();
      records.clear();
    }
  };
}
