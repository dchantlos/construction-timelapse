const icon = name => `<img class="liot-icon" src="https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/${name}.svg" width="16" height="16" alt="" />`;

function clonePanel(sourceId) {
  const panel = document.getElementById(sourceId).cloneNode(true);
  for (const node of [panel, ...panel.querySelectorAll("[id]")]) node.id = `liot-${node.id}`;
  panel.classList.remove("vertical-only");
  panel.classList.add("linear-only", "linear-iot");
  panel.querySelectorAll("[data-loc-toggle]").forEach(node => node.removeAttribute("data-loc-toggle"));
  return panel;
}

export function createLinearSensorLayout() {
  const panel = clonePanel("sensorPanel");
  const detail = clonePanel("sensorDetailPanel");
  panel.id = "linearIotPanel";
  detail.id = "linearIotDetail";
  panel.setAttribute("aria-label", "Roadway IoT feeds");
  detail.setAttribute("aria-label", "Roadway IoT overview");
  panel.querySelector(".kicker").textContent = "Progress IoT Feeds";
  detail.querySelector(".kicker").textContent = "Progress IoT Feeds | Overview";
  for (const root of [panel, detail]) {
    root.querySelector(".sensor-panel__meta span").textContent = "Marina Bay, SG";
    const counters = root.querySelectorAll(".sensor-activity__val strong");
    counters[0].dataset.liotCount = "workers";
    counters[1].dataset.liotCount = "vehicles";
    root.querySelector(".loc-controls").remove();
  }
  panel.querySelector(".sensor-list").replaceChildren();
  detail.querySelector(".metric-grid").replaceChildren();
  detail.querySelector(".sensor-detail").innerHTML = `
    <div class="sensor-detail__sources" id="liotSources"></div>
    <p class="sensor-detail__foot">Weather and air quality from Open-Meteo. Worker and vehicle counts are modeled.</p>
    <p class="sensor-detail__foot"><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> | <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noopener noreferrer">CAMS atmospheric data</a> | <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener noreferrer">Air-quality sources</a></p>`;
  detail.querySelectorAll(".dp-label")[1].textContent = "Data sources";
  document.body.append(panel, detail);
  const summaryRows = new Map();
  for (const [key, label, unit, qualifier] of [
    ["temperature_2m", "Temperature", "&deg;C", ""], ["relative_humidity_2m", "Humidity", "%", ""],
    ["wind_speed_10m", "Wind", "m/s", "10 m model"], ["us_aqi", "Air Quality", "US AQI", ""],
    ["pm2_5", "Particles", "&micro;g/m&sup3;", "PM2.5"], ["pm10", "Particles", "&micro;g/m&sup3;", "PM10"],
    ["precipitation", "Rain", "mm", ""]
  ]) {
    const row = document.createElement("li");
    row.className = "sensor-row";
    row.dataset.reading = key;
    row.innerHTML = `<span class="sensor-row__label">${label}${qualifier ? `<span class="sensor-row__q">${qualifier}</span>` : ""}</span>
      <span class="sensor-row__read"><strong>--</strong><small>${unit}</small></span><span class="sensor-row__dot"></span>`;
    panel.querySelector(".sensor-list").append(row);
    summaryRows.set(key, row);
  }
  const tileNodes = new Map();
  for (const [key, label, unit, glyph] of [
    ["temperature_2m", "Temperature", "&deg;C", "thermometer"], ["relative_humidity_2m", "Humidity", "%", "droplets"],
    ["wind_speed_10m", "Wind at 10 m | model", "m/s", "wind"], ["wind_gusts_10m", "Gust at 10 m | model", "m/s", "wind"],
    ["us_aqi", "US Air Quality Index", "US AQI", "gauge"], ["precipitation", "Precipitation", "mm", "cloud-rain"],
    ["pm2_5", "PM2.5 | model", "&micro;g/m&sup3;", "cloud"], ["pm10", "PM10 | model", "&micro;g/m&sup3;", "cloud"],
    ["nitrogen_dioxide", "NO2 | model", "&micro;g/m&sup3;", "cloud"], ["ozone", "Ozone | model", "&micro;g/m&sup3;", "cloud"]
  ]) {
    const tile = document.createElement("div");
    tile.className = "metric-tile";
    tile.dataset.reading = key;
    tile.innerHTML = `<span class="metric-tile__icon">${icon(glyph)}</span><div class="metric-tile__text">
      <span class="metric-tile__top"><strong>--</strong><small>${unit}</small></span><span class="metric-tile__label">${label}</span></div><span class="metric-tile__dot"></span>`;
    detail.querySelector(".metric-grid").append(tile);
    tileNodes.set(key, tile);
  }
  return { panel, detail, summaryRows, tileNodes, icon, element: id => document.getElementById(id), roots: [panel, detail] };
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