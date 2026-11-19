/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { escHtml, miniRow } from "./iot-panel-template.mjs";

const icon = (name, size = 16) => `<img class="liot-icon" src="https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/${name}.svg" width="${size}" height="${size}" alt="" />`;
const WEATHER_READINGS = [
  ["temperature_2m", "Temperature", "\u00b0C", "thermometer"],
  ["relative_humidity_2m", "Humidity", "%", "droplets"],
  ["wind_speed_10m", "Wind", "m/s", "wind", "10 m height"],
  ["us_aqi", "Air Quality", "US AQI", "gauge"],
  ["wind_gusts_10m", "Wind gust", "m/s", "wind"],
  ["precipitation", "Rain", "mm", "cloud-rain"],
  ["pm2_5", "Fine dust", "\u00b5g/m\u00b3", "cloud", "PM2.5"],
  ["pm10", "Dust", "\u00b5g/m\u00b3", "cloud", "PM10"],
  ["nitrogen_dioxide", "NO2", "\u00b5g/m\u00b3", "cloud"],
  ["ozone", "Ozone", "\u00b5g/m\u00b3", "cloud"]
];

function clonePanel(sourceId) {
  const panel = document.getElementById(sourceId).cloneNode(true);
  for (const node of [panel, ...panel.querySelectorAll("[id]")]) node.id = `liot-${node.id}`;
  panel.classList.remove("vertical-only");
  panel.classList.add("linear-only", "linear-iot");
  panel.querySelectorAll("[data-loc-toggle]").forEach(node => node.removeAttribute("data-loc-toggle"));
  return panel;
}

function cloneReading(source) {
  const node = source.cloneNode(true);
  for (const element of [node, ...node.querySelectorAll("[id]")]) element.removeAttribute("id");
  return node;
}

export function createLinearSensorLayout() {
  const panel = clonePanel("sensorPanel");
  const detail = clonePanel("sensorDetailPanel");
  panel.id = "linearIotPanel";
  detail.id = "linearIotDetail";
  panel.setAttribute("aria-label", "Roadway IoT feeds");
  detail.setAttribute("aria-label", "Roadway IoT overview");
  for (const root of [panel, detail]) {
    root.querySelector(".sensor-panel__meta span").textContent = "Marina Bay, SG";
    const counters = root.querySelectorAll(".sensor-activity__val strong");
    counters[0].dataset.liotCount = "workers";
    counters[1].dataset.liotCount = "vehicles";
  }
  const list = panel.querySelector(".sensor-list");
  const grid = detail.querySelector(".metric-grid");
  const details = detail.querySelector(".sensor-detail");
  const rowTemplate = list.querySelector(".sensor-row:not(.sensor-row--gas)");
  const tileTemplate = grid.querySelector(".metric-tile");
  const groupTemplate = details.querySelector(".sensor-detail__group");
  const sources = details.querySelector(".sensor-detail__sources");
  const footer = details.querySelector(".sensor-detail__foot");
  const summaryRows = new Map();
  const tileNodes = new Map();
  const weatherDetails = new Map();
  list.replaceChildren();
  grid.replaceChildren();
  sources.replaceChildren();
  footer.innerHTML = 'Weather and air quality from <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> / <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noopener noreferrer">CAMS</a>. Worker and vehicle counts are modeled.';
  details.replaceChildren(sources, footer);

  function addGroup(title, qualifier = "") {
    const group = cloneReading(groupTemplate);
    const heading = group.querySelector(".sensor-detail__title");
    heading.textContent = title;
    if (qualifier) {
      const small = document.createElement("small");
      small.textContent = qualifier;
      heading.append(small);
    }
    const readings = group.querySelector(".sensor-mini");
    readings.replaceChildren();
    details.insertBefore(group, footer);
    return { group, list: readings };
  }

  const weatherGroup = addGroup("Weather and air quality", "Open-Meteo / CAMS");
  for (const [key, label, unit, , qualifier = ""] of WEATHER_READINGS) {
    weatherGroup.list.insertAdjacentHTML("beforeend", miniRow(escHtml(label), escHtml(qualifier), "\u2014", escHtml(unit), null));
    const row = weatherGroup.list.lastElementChild;
    row.dataset.reading = key;
    weatherDetails.set(key, row);
  }

  function addReading(key, { title, unit, glyph, qualifier = "" }) {
    const row = cloneReading(rowTemplate);
    row.dataset.reading = key;
    row.querySelector(".sensor-row__label").textContent = title;
    const note = document.createElement("span");
    note.className = "sensor-row__q";
    note.textContent = qualifier;
    note.hidden = !qualifier;
    row.querySelector(".sensor-row__label").append(note);
    row.querySelector(".sensor-row__read small").textContent = unit;
    list.append(row);
    const tile = cloneReading(tileTemplate);
    tile.dataset.reading = key;
    tile.querySelector(".metric-tile__icon").innerHTML = icon(glyph, 20);
    tile.querySelector(".metric-tile__label").textContent = qualifier ? `${title} - ${qualifier}` : title;
    tile.querySelector(".metric-tile__top small").textContent = unit;
    grid.lastElementChild?.classList.remove("metric-tile--wide");
    grid.append(tile);
    tile.classList.toggle("metric-tile--wide", grid.children.length % 2 === 1);
    summaryRows.set(key, row);
    tileNodes.set(key, tile);
    return { row, tile };
  }

  document.body.append(panel, detail);
  return { panel, detail, summaryRows, tileNodes, weatherDetails, sources, icon, addReading,
    addGroup(title, qualifier) {
      const result = addGroup(title, qualifier);
      details.insertBefore(result.group, weatherGroup.group);
      return result;
    },
    addWeatherReadings() {
      for (const key of ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "us_aqi", "pm2_5", "pm10", "precipitation"]) {
        const [, title, unit, glyph, qualifier] = WEATHER_READINGS.find(reading => reading[0] === key);
        addReading(key, { title, unit, glyph, qualifier });
      }
    },
    element: id => document.getElementById(id), roots: [panel, detail] };
}

export function enableSensorDrag(panel, handle) {
  let offset;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  handle.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;
    const rectangle = panel.getBoundingClientRect();
    offset = { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
    handle.setPointerCapture(event.pointerId);
    panel.classList.add("is-dragging");
  }, options);
  handle.addEventListener("pointermove", event => {
    if (!offset) return;
    panel.style.left = `${Math.max(8, Math.min(event.clientX - offset.x, innerWidth - panel.offsetWidth - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(event.clientY - offset.y, innerHeight - panel.offsetHeight - 8))}px`;
    panel.style.right = "auto";
  }, options);
  const finish = () => { offset = null; panel.classList.remove("is-dragging"); };
  handle.addEventListener("pointerup", finish, options);
  handle.addEventListener("pointercancel", finish, options);
  return () => controller.abort();
}
