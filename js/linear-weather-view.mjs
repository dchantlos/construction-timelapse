import { WEATHER_FIELDS, airQualityCategory } from "./linear-weather.mjs";
import { CONDITION_COLORS, NO_DATA_COLOR, conditionLevel } from "./linear-conditions.mjs?v=3";

const dateTime = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export function createWeatherDisplay(layout) {
  const chips = {};
  for (const [key, title] of [["weather", "Weather"], ["air", "Air quality"]]) {
    const chip = document.createElement("span");
    chip.className = "src-chip";
    chip.dataset.source = key;
    chip.innerHTML = '<span class="src-chip__dot"></span><span class="src-chip__name"></span><span class="src-chip__state"></span>';
    chip.querySelector(".src-chip__name").textContent = title;
    if (key === "air") chip.style.gridColumn = "1 / -1";
    layout.sources.append(chip);
    chips[key] = chip;
  }
  return snapshot => {
    for (const [kind, fields] of Object.entries(WEATHER_FIELDS)) {
      const source = snapshot[kind];
      const current = source.status === "current" || source.status === "cached";
      const sourceColor = source.status === "current" ? "#34d399" : source.status === "cached" ? "#facc15" : "#94a3b8";
      const label = `${source.status}${source.timestamp ? ` | ${dateTime.format(source.timestamp)} SGT` : ""}`;
      chips[kind].querySelector(".src-chip__dot").style.background = sourceColor;
      chips[kind].querySelector(".src-chip__state").textContent = current ? "Open-Meteo" : source.status;
      chips[kind].title = source.error ? `Last request failed: ${source.error}` : "Atmospheric model data, not a local instrument measurement";
      for (const [key, field] of Object.entries(fields)) {
        const value = source.values[key];
        const available = current && Number.isFinite(value);
        const level = conditionLevel(key, snapshot);
        const color = available && level !== null ? CONDITION_COLORS[level] : NO_DATA_COLOR;
        for (const node of [layout.summaryRows.get(key), layout.tileNodes.get(key), layout.weatherDetails.get(key)].filter(Boolean)) {
          const text = available ? value.toFixed(field.decimals) : "\u2014";
          const valueNode = node.querySelector("strong") ?? node.querySelector(".sensor-mini__read");
          if (valueNode.matches(".sensor-mini__read")) valueNode.firstChild.textContent = text;
          else valueNode.textContent = text;
          valueNode.style.color = color;
          node.querySelector('[class$="__dot"]').style.background = color;
          node.querySelector('[class$="__dot"]').style.boxShadow = available ? `0 0 8px -1px ${color}` : "none";
          node.dataset.sourceState = available ? source.status : source.status === "current" ? "missing" : source.status;
          node.title = `${kind === "air" ? "Open-Meteo / CAMS" : "Open-Meteo"} model | ${label}${key === "us_aqi" && available ? ` | ${airQualityCategory(value).label} (US AQI, not Singapore PSI)` : ""}`;
          if (key === "us_aqi") {
            const category = node.querySelector(".sensor-row__read small, .metric-tile__top small");
            if (category) category.textContent = available ? airQualityCategory(value).label : "US AQI";
          }
          if (key === "precipitation") {
            const period = source.intervalSeconds ? `${source.intervalSeconds / 60} min total` : "";
            const note = node.querySelector(".sensor-row__q");
            if (note) { note.textContent = period; note.hidden = !period; }
            const caption = node.querySelector(".metric-tile__label");
            if (caption) caption.textContent = period ? `Rain - ${period}` : "Rain";
          }
          if (key === "precipitation" && source.intervalSeconds) node.title += ` | accumulation interval ${source.intervalSeconds / 60} min`;
        }
      }
    }
  };
}