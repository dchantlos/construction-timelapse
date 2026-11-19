import { createLinearSensorLayout, enableSensorDrag } from "./linear-sensor-layout.mjs";
import { createOpenMeteoClient, WEATHER_REFRESH_MS } from "./linear-weather.mjs";
import { createWeatherDisplay } from "./linear-weather-view.mjs";
import { modeledSiteActivity } from "./linear-site-activity.mjs";
import { assessConditions } from "./linear-conditions.mjs";
import { createRadarPanel } from "./linear-radar-panel.mjs";

const clock = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export function createLinearSensorPanel() {
  if (document.getElementById("linearIotPanel")) return;
  const layout = createLinearSensorLayout();
  const { panel, detail, element, roots, icon } = layout;
  let storage;
  try { storage = window.localStorage; } catch (error) { console.warn("Roadway weather cache unavailable", error); }
  const weather = createOpenMeteoClient({ storage, onChange: () => paint() });
  const paintWeather = createWeatherDisplay(layout);
  let disposed = false;
  const toggle = document.createElement("button");
  toggle.id = "linearIotToggle";
  toggle.type = "button";
  toggle.className = "nav-btn linear-iot-toggle";
  toggle.title = "Roadway IoT";
  toggle.setAttribute("aria-label", "Roadway IoT");
  toggle.setAttribute("aria-controls", "linearIotPanel");
  toggle.innerHTML = icon("radio");
  document.querySelector(".nav-stack").append(toggle);
  const radar = createRadarPanel({ icon, onOpen: () => setOpen(false) });

  function setOpen(open) {
    if (open) radar.setOpen(false);
    panel.hidden = !open;
    detail.hidden = !open;
    toggle.classList.toggle("is-active", open);
    toggle.setAttribute("aria-expanded", String(open));
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
    const assessment = assessConditions(snapshot);
    for (const root of roots) {
      root.querySelector('[data-liot-count="workers"]').textContent = String(activity.workers);
      root.querySelector('[data-liot-count="vehicles"]').textContent = String(activity.vehicles);
      root.querySelector(".sensor-panel__meta span:last-child").textContent = `${clock.format(Date.now())} SGT`;
      root.querySelector(".sensor-summary__text strong").textContent = assessment.head;
      root.querySelector(".sensor-summary__text span").textContent = assessment.detail;
      root.querySelector(".sensor-summary__dot").style.background = assessment.color;
      root.querySelector(".sensor-summary__dot").style.boxShadow = `0 0 9px -1px ${assessment.color}`;
      root.querySelector(".sensor-summary__text strong").style.color = assessment.color;
    }
    paintWeather(snapshot);
  }

  toggle.addEventListener("click", () => setOpen(panel.hidden));
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
    stopDragging.forEach(stop => stop());
    window.removeEventListener("resize", paint);
    document.documentElement.classList.remove("linear-iot-open");
    panel.remove();
    detail.remove();
    toggle.remove();
  };
  window.addEventListener("pagehide", destroy, { once: true });
  return { destroy };
}