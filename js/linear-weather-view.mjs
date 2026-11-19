import { WEATHER_FIELDS, airQualityCategory } from "./linear-weather.mjs";
import { CONDITION_COLORS, NO_DATA_COLOR, conditionLevel } from "./linear-conditions.mjs";

const dateTime = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export function createWeatherDisplay(layout) {
  const chips = {};
  for (const [key, title] of [["weather", "Open-Meteo weather"], ["air", "Open-Meteo / CAMS air"]]) {
    const chip = document.createElement("span");
    chip.className = "src-chip";
    chip.dataset.source = key;
    chip.innerHTML = '<span class="src-chip__dot"></span><span class="src-chip__name"></span><span class="src-chip__state"></span>';
    chip.querySelector(".src-chip__name").textContent = title;
    layout.element("liotSources").append(chip);
    chips[key] = chip;
  }
  return snapshot => {
    for (const [kind, fields] of Object.entries(WEATHER_FIELDS)) {
      const source = snapshot[kind];
      const current = source.status === "current" || source.status === "cached";
      const sourceColor = source.status === "current" ? "#34d399" : source.status === "cached" ? "#facc15" : "#94a3b8";
      const label = `${source.status}${source.timestamp ? ` | ${dateTime.format(source.timestamp)} SGT` : ""}`;
      chips[kind].querySelector(".src-chip__dot").style.background = sourceColor;
      chips[kind].querySelector(".src-chip__state").textContent = label;
      chips[kind].title = source.error ? `Last request failed: ${source.error}` : "Atmospheric model data, not a local instrument measurement";
      for (const [key, field] of Object.entries(fields)) {
        const value = source.values[key];
        const available = current && Number.isFinite(value);
        const level = conditionLevel(key, snapshot);
        const color = available && level !== null ? CONDITION_COLORS[level] : NO_DATA_COLOR;
        for (const node of [layout.summaryRows.get(key), layout.tileNodes.get(key)].filter(Boolean)) {
          node.querySelector("strong").textContent = available ? value.toFixed(field.decimals) : "--";
          node.querySelector("strong").style.color = color;
          node.querySelector('[class$="__dot"]').style.background = color;
          node.querySelector('[class$="__dot"]').style.boxShadow = available ? `0 0 8px -1px ${color}` : "none";
          node.dataset.sourceState = available ? source.status : source.status === "current" ? "missing" : source.status;
          node.title = `${kind === "air" ? "Open-Meteo / CAMS" : "Open-Meteo"} model | ${label}${key === "us_aqi" && available ? ` | ${airQualityCategory(value).label} (US AQI, not Singapore PSI)` : ""}`;
          if (key === "precipitation" && source.intervalSeconds) node.title += ` | accumulation interval ${source.intervalSeconds / 60} min`;
        }
      }
    }
  };
}