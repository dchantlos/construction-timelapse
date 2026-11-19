/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { INSTRUMENT_FEEDS, INSTRUMENT_NO_DATA } from "./linear-instrument-config.mjs?v=3";
import { createInstrumentReadout } from "./linear-instrument-detail.mjs?v=4";
import { enableSensorDrag } from "./linear-sensor-layout.mjs?v=5";
import { escHtml, miniRow, srcChipElement } from "./iot-panel-template.mjs";

export function createInstrumentPanel(layout, controls) {
  const { panel, roots, icon } = layout;
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const groups = new Map();
  const locationControls = roots.map(root => root.querySelector(".loc-controls"));
  let locationsVisible = false;
  let activeType = "all";
  let entries = [];
  let state = { running: true, feeds: {} };
  let popupKey = null;
  const firstWeatherSource = layout.sources.firstElementChild;

  for (const [feedId, config] of Object.entries(INSTRUMENT_FEEDS)) {
    const { row, tile } = layout.addReading(feedId, { ...config, title: config.label });
    const detail = layout.addGroup(config.label, config.unit);
    const source = srcChipElement(config.title, "connecting");
    layout.sources.insertBefore(source, firstWeatherSource);
    groups.set(feedId, { row, tile, ...detail, source, connection: "connecting" });
  }
  for (const group of locationControls) {
    group.querySelector(".loc-toggle").addEventListener("click", () => {
      locationsVisible = !locationsVisible;
      controls.locations(locationsVisible);
      if (!locationsVisible) hidePopup();
      renderLocationControls();
    }, options);
    group.querySelector(".loc-chips").replaceChildren(...[
      ["all", { title: "All" }], ...Object.entries(INSTRUMENT_FEEDS)
    ].map(([key, config]) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `loc-chip${key === "all" ? " loc-chip--all" : ""}`;
      chip.dataset.type = key;
      chip.textContent = config.title;
      if (config.mapColor) chip.style.setProperty("--chip", config.mapColor);
      chip.addEventListener("click", () => {
        if (!locationsVisible) return;
        activeType = key;
        controls.filter(key);
        hidePopup();
        renderLocationControls();
      }, options);
      return chip;
    }));
  }

  const popup = document.createElement("div");
  popup.id = "linearInstrumentPopup";
  popup.className = "sensor-pop glass linstr-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", "Instrument details");
  popup.setAttribute("aria-hidden", "true");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "sensor-pop__close";
  close.setAttribute("aria-label", "Close instrument details");
  close.innerHTML = icon("x");
  const popupBody = document.createElement("div");
  popup.append(close, popupBody);
  document.body.append(popup);
  const popupReadout = createInstrumentReadout(popupBody);
  const stopDragging = enableSensorDrag(popup, popup.querySelector(".sensor-pop__name"));
  const hidePopup = () => { popupKey = null; popup.classList.remove("is-visible"); popup.setAttribute("aria-hidden", "true"); };
  close.addEventListener("click", hidePopup, options);
  popup.addEventListener("keydown", event => { if (event.key === "Escape") hidePopup(); }, options);

  function renderLocationControls() {
    for (const group of locationControls) {
      const toggle = group.querySelector(".loc-toggle");
      toggle.setAttribute("aria-pressed", String(locationsVisible));
      toggle.classList.toggle("is-on", locationsVisible);
      toggle.querySelector(".loc-toggle__txt").textContent = locationsVisible ? "Hide Sensor Locations" : "Show Sensor Locations";
      group.querySelector(".loc-chips").classList.toggle("is-disabled", !locationsVisible);
      for (const chip of group.querySelectorAll(".loc-chip")) {
        const active = chip.dataset.type === activeType;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", String(active));
        chip.disabled = !locationsVisible;
      }
    }
  }

  function render(nextEntries, nextState) {
    entries = nextEntries;
    state = nextState;
    panel.dataset.simulatedTracks = String(entries.length);
    for (const [feedId, group] of groups) {
      const readings = entries.filter(entry => entry.feedId === feedId);
      const highest = [...readings].sort((first, second) =>
        (second.reading.level ?? -1) - (first.reading.level ?? -1) || (second.reading.value ?? -Infinity) - (first.reading.value ?? -Infinity))[0];
      const reading = highest?.reading;
      const color = reading?.color ?? INSTRUMENT_NO_DATA;
      for (const node of [group.row, group.tile]) {
        node.querySelector("strong").textContent = reading?.text ?? "\u2014";
        node.querySelector("strong").style.color = color;
        const dot = node.querySelector('[class$="__dot"]');
        dot.style.background = color;
        dot.style.boxShadow = `0 0 8px -1px ${color}`;
        node.title = highest ? `${reading.config.label} - ${highest.feature.attributes.WorkFront} | ${reading.state}` : "Reading unavailable";
      }
      group.list.innerHTML = readings.length
        ? readings.map(entry => miniRow(escHtml(entry.feature.attributes.WorkFront), escHtml(entry.feature.attributes.SensorID),
          escHtml(entry.reading.text), escHtml(entry.reading.config.unit), entry.reading.color)).join("")
        : miniRow("Reading unavailable", "", "\u2014", INSTRUMENT_FEEDS[feedId].unit, INSTRUMENT_NO_DATA);
      const connection = state.feeds[feedId] === "ready"
        ? state.running ? "streaming" : "paused"
        : state.feeds[feedId] === "unavailable" ? "offline" : "connecting";
      if (group.connection !== connection) {
        const source = srcChipElement(INSTRUMENT_FEEDS[feedId].title, connection);
        group.source.replaceWith(source);
        group.source = source;
        group.connection = connection;
      }
    }
    if (popupKey) {
      const entry = entries.find(candidate => candidate.key === popupKey);
      if (entry) popupReadout(entry, state);
      else hidePopup();
    }
  }

  renderLocationControls();
  render([], state);
  return { render, hidePopup,
    inspect(key, point) {
      popupKey = key;
      popupReadout(entries.find(entry => entry.key === key), state);
      popup.classList.add("is-visible");
      popup.setAttribute("aria-hidden", "false");
      const box = popup.getBoundingClientRect();
      const x = point.x + 16 + box.width > innerWidth ? point.x - box.width - 16 : point.x + 16;
      const y = point.y + 16 + box.height > innerHeight ? point.y - box.height - 16 : point.y + 16;
      popup.style.left = `${Math.max(8, Math.min(x, innerWidth - box.width - 8))}px`;
      popup.style.top = `${Math.max(8, Math.min(y, innerHeight - box.height - 8))}px`;
    },
    destroy() { abort.abort(); stopDragging(); popup.remove(); }
  };
}
