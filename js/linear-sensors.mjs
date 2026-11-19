import { createLinearSensorLayout, enableSensorDrag } from "./linear-sensor-layout.mjs?v=5";
import { createOpenMeteoClient, WEATHER_REFRESH_MS } from "./linear-weather.mjs";
import { createWeatherDisplay } from "./linear-weather-view.mjs?v=3";
import { modeledSiteActivity } from "./linear-site-activity.mjs";
import { assessConditions } from "./linear-conditions.mjs?v=3";
import { createRadarPanel } from "./linear-radar-panel.mjs";
import { createLinearInstruments } from "./linear-instruments.mjs?v=8";
import { INSTRUMENT_SOURCE, INSTRUMENT_FEEDS } from "./linear-instrument-config.mjs?v=3";

const clock = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hour12: false });

export function createLinearSensorPanel({ scene, view } = {}) {
  if (document.getElementById("linearIotPanel")) return;
  const layout = createLinearSensorLayout();
  layout.addWeatherReadings();
  const { panel, detail, element, roots, icon } = layout;
  let storage;
  try { storage = window.localStorage; } catch (error) { console.warn("Roadway weather cache unavailable", error); }
  const weather = createOpenMeteoClient({ storage, onChange: () => paint() });
  const paintWeather = createWeatherDisplay(layout);
  let disposed = false;
  let instruments = null;
  let instrumentReadings = [];
  const toggle = document.createElement("button");
  toggle.id = "linearIotToggle";
  toggle.type = "button";
  toggle.className = "nav-btn linear-iot-toggle";
  toggle.title = "Roadway IoT";
  toggle.setAttribute("aria-label", "Roadway IoT");
  toggle.setAttribute("aria-controls", "linearIotPanel");
  toggle.innerHTML = icon("radio");
  document.querySelector(".nav-stack").append(toggle);
  const mobileToggle = toggle.cloneNode(true);
  mobileToggle.id = "linearIotMobileToggle";
  mobileToggle.className = "nav-btn linear-iot-toggle linear-iot-mobile glass";
  document.body.append(mobileToggle);
  const radar = createRadarPanel({ icon, onOpen: () => setOpen(false) });
  if (INSTRUMENT_SOURCE === "simulation") {
    instruments = createLinearInstruments({ scene, view, layout, onReadings: readings => { instrumentReadings = readings; paint(); } });
    instruments.start();
  }

  function setOpen(open) {
    if (open) radar.setOpen(false);
    else instruments?.hidePopup();
    panel.hidden = !open;
    detail.hidden = !open;
    for (const button of [toggle, mobileToggle]) {
      button.classList.toggle("is-active", open);
      button.setAttribute("aria-expanded", String(open));
    }
    document.documentElement.classList.toggle("linear-iot-open", open);
    if (open) requestAnimationFrame(paint);
  }

  function showDetail(open) {
    setOpen(true);
    panel.classList.toggle("is-hidden", open);
    detail.classList.toggle("is-open", open);
    detail.setAttribute("aria-hidden", String(!open));
    paint();
  }

  function paint() {
    if (disposed) return;
    const activity = modeledSiteActivity();
    const snapshot = weather.snapshot();
    const levels = INSTRUMENT_SOURCE === "simulation" ? Object.entries(INSTRUMENT_FEEDS).flatMap(([feedId, config]) => {
      const readings = instrumentReadings.filter(entry => entry.feedId === feedId);
      return (readings.length ? readings.map(entry => entry.reading.level) : [null])
        .map(level => ({ label: config.label.toLowerCase(), level, message: config.alertText }));
    }) : [];
    const assessment = assessConditions(snapshot, levels);
    for (const root of roots) {
      root.querySelector('[data-liot-count="workers"]').textContent = String(activity.workers);
      root.querySelector('[data-liot-count="vehicles"]').textContent = String(activity.vehicles);
      root.querySelector(".sensor-panel__meta span:last-child").textContent = `${clock.format(Date.now())} local`;
      root.querySelector(".sensor-summary__text strong").textContent = assessment.head;
      root.querySelector(".sensor-summary__text span").textContent = assessment.detail;
      root.querySelector(".sensor-summary__dot").style.background = assessment.color;
      root.querySelector(".sensor-summary__dot").style.boxShadow = `0 0 9px -1px ${assessment.color}`;
      root.querySelector(".sensor-summary__text strong").style.color = assessment.color;
    }
    paintWeather(snapshot);
  }

  toggle.addEventListener("click", () => setOpen(panel.hidden));
  mobileToggle.addEventListener("click", () => setOpen(panel.hidden));
  element("liot-sensorExpand").addEventListener("click", () => showDetail(true));
  element("liot-sensorDetailClose").addEventListener("click", () => showDetail(false));
  element("liot-sensorCollapse").addEventListener("click", event => {
    const collapsed = panel.classList.toggle("is-collapsed");
    event.currentTarget.textContent = collapsed ? "+" : "\u2013";
    event.currentTarget.setAttribute("aria-label", collapsed ? "Expand sensor panel" : "Collapse sensor panel");
  });
  const stopDragging = roots.map(root => enableSensorDrag(root, root.querySelector(".sensor-panel__head")));
  for (const root of roots) {
    root.addEventListener("keydown", event => { if (event.key === "Escape") { setOpen(false); toggle.focus(); } });
  }
  const freshnessTimer = setInterval(paint, 15000);
  weather.refresh();
  const weatherTimer = setInterval(() => weather.refresh(), WEATHER_REFRESH_MS);
  setOpen(matchMedia("(min-width: 901px)").matches);
  paint();
  window.addEventListener("resize", paint);
  const destroy = () => {
    disposed = true;
    clearInterval(freshnessTimer);
    clearInterval(weatherTimer);
    weather.destroy();
    radar.destroy();
    instruments?.destroy();
    stopDragging.forEach(stop => stop());
    window.removeEventListener("resize", paint);
    document.documentElement.classList.remove("linear-iot-open");
    panel.remove();
    detail.remove();
    toggle.remove();
    mobileToggle.remove();
  };
  window.addEventListener("pagehide", destroy, { once: true });
  return { destroy };
}