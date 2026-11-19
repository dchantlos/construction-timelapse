/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createLinearSensorLayout } from "../js/linear-sensor-layout.mjs?v=5";
import { createInstrumentPanel } from "../js/linear-instrument-panel.mjs?v=6";
import { createWeatherDisplay } from "../js/linear-weather-view.mjs?v=3";
import { describeInstrument, INSTRUMENT_FEEDS } from "../js/linear-instrument-config.mjs?v=3";

export function runInstrumentPanelChecks() {
  const layout = createLinearSensorLayout();
  layout.addWeatherReadings();
  layout.roots.forEach(root => { root.hidden = true; });
  let panel;
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const entry = (front, rate) => {
    const feature = { attributes: { TrackID: `SET-${front}`, SensorID: `SET-${front}`, WorkFront: front,
      Timestamp: Date.now(), Settlement_mm: 6, SettlementRate_mm_h: rate, Quality: "Good" } };
    return { key: `settlement:SET-${front}`, feedId: "settlement", feature, reading: describeInstrument("settlement", feature) };
  };
  const state = { running: true, feeds: { settlement: "ready" } };
  const calls = [];
  try {
    const weather = createWeatherDisplay(layout);
    panel = createInstrumentPanel(layout, {
      locations: value => calls.push(["locations", value]),
      filter: value => calls.push(["filter", value])
    });
    panel.render([entry("West", 0.25), entry("East", 0.05)], state);
    const signature = root => [...root.children].map(node => `${node.tagName}.${node.className}`).join("|");
    for (const [root, id] of [[layout.panel, "sensorPanel"], [layout.detail, "sensorDetailPanel"]]) {
      const original = document.getElementById(id);
      check(signature(root) === signature(original), `${id} must use the vertical template's sections and order`);
      check(root.querySelector(".kicker").textContent === original.querySelector(".kicker").textContent, "Panel titles share one template");
      for (const property of ["width", "padding", "gap", "borderRadius"]) {
        check(getComputedStyle(root)[property] === getComputedStyle(original)[property], `Shared panel style drift: ${property}`);
      }
      check(!root.querySelector("select, .linstr-tabs, .linstr-transport, .linstr-inspector"), "No linear-only panel controls");
      check(root.lastElementChild.matches("[data-sensor-help]"), "Help belongs at the bottom of both shared panels");
      check(!/feeds available|\d+ tracks|Instrument feeds/.test(root.textContent), "No feed counters or redundant heading");
      check([...root.querySelectorAll(".loc-chip:not(.loc-chip--all)")].every(chip => chip.disabled), "Map filters start disabled");
      const colors = [...root.querySelectorAll(".loc-chip:not(.loc-chip--all)")].map(chip => chip.style.getPropertyValue("--chip"));
      check(colors.length === 7 && new Set(colors).size === 7, "Seven types require seven different colors");
      check(root.querySelector('.loc-chip[data-type="settlement"]').style.getPropertyValue("--chip") === INSTRUMENT_FEEDS.settlement.mapColor,
        "Type color must not follow severity");
    }
    check(layout.panel.querySelector(".sensor-list").children.length === 14, "Weather and engineering readings share the main panel");
    check(layout.detail.querySelector(".metric-grid").children.length === 14, "Expanded view includes weather and engineering tiles");
    check(!layout.detail.querySelector(".metric-grid").lastElementChild.classList.contains("metric-tile--wide"), "Even tile count keeps two balanced columns");
    check(!layout.panel.querySelector(".sensor-list button") && !layout.detail.querySelector(".metric-grid button"), "Readings behave like the vertical template");
    check(layout.detail.querySelector(".sensor-detail__group .sensor-mini").children.length === 2, "Both work fronts appear in per-sensor detail");

    panel.render([entry("East", 0.35)], state);
    check(layout.panel.querySelector('.loc-chip[data-type="settlement"]').style.getPropertyValue("--chip") === INSTRUMENT_FEEDS.settlement.mapColor,
      "Severity changes must not change legend identity");
    layout.panel.querySelector(".loc-toggle").click();
    check(layout.detail.querySelector(".loc-toggle").getAttribute("aria-pressed") === "true", "Expanded visibility stays synchronized");
    layout.detail.querySelector('.loc-chip[data-type="settlement"]').click();
    check(layout.panel.querySelector('.loc-chip[data-type="settlement"]').getAttribute("aria-pressed") === "true", "Compact filter stays synchronized");
    check(JSON.stringify(calls) === JSON.stringify([["locations", true], ["filter", "settlement"]]), "Controls operate the map");

    panel.render([], { ...state, feeds: { settlement: "unavailable" } });
    check(layout.detail.querySelector(".src-chip__state").textContent === "offline", "Source failures remain explicit");
    weather({
      weather: { status: "current", timestamp: Date.now(), intervalSeconds: 900, values: { temperature_2m: 21.5, relative_humidity_2m: 65, wind_speed_10m: 4, wind_gusts_10m: 6, precipitation: 0 } },
      air: { status: "current", timestamp: Date.now(), values: { us_aqi: 30 } }
    });
    check(layout.weatherDetails.get("temperature_2m").querySelector(".sensor-mini__read").textContent.includes("21.5"),
      "Weather readings remain available in shared detail rows");
    for (const key of ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "us_aqi", "pm2_5", "pm10", "precipitation"]) {
      check(layout.summaryRows.has(key) && layout.tileNodes.has(key), `${key} must appear in both panel sizes`);
    }
    check(layout.summaryRows.get("precipitation").querySelector("strong").textContent === "0.0", "Zero rain is a valid main-panel reading");
    check(layout.summaryRows.get("precipitation").querySelector(".sensor-row__q").textContent === "15 min total", "Rain shows its actual accumulation interval");
    check(layout.summaryRows.get("us_aqi").querySelector(".sensor-row__read small").textContent === "Good", "AQI has a plain-language category");
    check(!layout.detail.querySelector(".sensor-detail__group .sensor-detail__foot"), "Long sensor explanations stay out of the default view");
    check(layout.sources.hidden, "Source-status badges are optional diagnostics, hidden by default");
    const trafficFeature = { attributes: { TrackID: "TRAFFIC-East", SensorID: "TRAFFIC-East", WorkFront: "East",
      Timestamp: Date.now(), QueueLength_m: 12, MeanSpeed_kmh: 40, Quality: "Good", TrafficState: "Free_Flow" } };
    const traffic = { key: "traffic:TRAFFIC-East", feedId: "traffic", feature: trafficFeature, reading: describeInstrument("traffic", trafficFeature) };
    panel.render([traffic], { ...state, feeds: { traffic: "ready" } });
    check(layout.summaryRows.get("traffic").querySelector(".sensor-row__label").textContent === "Traffic queue", "Traffic is explicitly labeled as a queue");
    panel.inspect(traffic.key, { x: 20, y: 20 });
    const popup = [...document.querySelectorAll("#linearInstrumentPopup")].at(-1);
    check(popup.querySelector(".sensor-pop__hero strong").textContent === "12", "Queue length must not be confused with vehicle speed");
    check(!popup.querySelector(".sensor-pop__note"), "Long explanations belong in Help, not every sensor popup");
    const pavingFeature = { attributes: { ...trafficFeature.attributes, SurfaceTemp_C: 25, CompactionValid: 0, OperatingState: "Idle" } };
    const paving = { key: "paving:test", feedId: "paving", feature: pavingFeature, reading: describeInstrument("paving", pavingFeature) };
    panel.render([paving], { ...state, feeds: { paving: "ready" } });
    panel.inspect(paving.key, { x: 20, y: 20 });
    check(popup.textContent.includes("Not assessed"), "Inactive compaction is explained instead of showing a bare zero");
    return { passed: ["compact and expanded template parity", "shared dimensions and spacing", "seven unique fixed colors",
      "no custom controls or counters", "synchronized map controls", "per-sensor details", "main-panel weather and rain",
      "AQI category", "default-hidden explanations and diagnostics", "explicit failures"] };
  } finally {
    panel?.destroy();
    layout.roots.forEach(root => root.remove());
  }
}

export function runSensorHelpChecks() {
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const guide = document.getElementById("help-sensors");
  const root = [document.getElementById("linearIotPanel"), document.getElementById("linearIotDetail")]
    .find(node => node?.checkVisibility());
  const button = root.querySelector("[data-sensor-help]");
  check(guide.hidden, "Sensor explanations must start hidden");
  try {
    button.click();
    check(!guide.hidden && guide.classList.contains("is-open"), "Panel Help button opens the existing help widget");
    for (const config of Object.values(INSTRUMENT_FEEDS)) {
      check(guide.textContent.includes(config.description), `${config.title} must be explained in Help`);
    }
    check(guide.textContent.includes("not calibrated measurements"), "Help distinguishes demo data from verified site measurements");
    const status = guide.querySelector("[data-help-source-status]");
    check(status.children.length === document.querySelector("#linearIotDetail .sensor-detail__sources").children.length,
      "Optional source badges are available inside Help");
    check(document.activeElement === guide.querySelector(".help-panel__close"), "Help receives keyboard focus");
  } finally {
    guide.querySelector(".help-panel__close").click();
  }
  check(guide.hidden && document.activeElement === button, "Closing Help hides explanations and returns focus");
  return { passed: ["Help closed by default", "all sensor explanations", "data-source diagnostics on demand", "focus restoration"] };
}
