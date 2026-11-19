const clock = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const number = new Intl.NumberFormat("en-SG", { maximumFractionDigits: 3 });

export function createInstrumentReadout(container) {
  container.innerHTML = '<div class="sensor-pop__tag">Instrument</div><div class="sensor-pop__name"></div>' +
    '<div class="sensor-pop__status"><span class="sensor-pop__dot"></span><span class="sensor-pop__cat"></span></div>' +
    '<div class="sensor-pop__hero"><strong>--</strong><span class="sensor-pop__unit"></span></div>' +
    '<ul class="sensor-pop__rows"></ul><div class="sensor-pop__foot"></div>';
  let rowSignature = "";
  const rowValues = new Map();
  return (entry, state) => {
    if (!entry) { container.hidden = true; return; }
    container.hidden = false;
    const { attributes } = entry.feature;
    const { reading } = entry;
    container.dataset.trackId = attributes.TrackID;
    container.querySelector(".sensor-pop__name").textContent = `${reading.config.label ?? reading.config.title} - ${attributes.WorkFront}`;
    const category = container.querySelector(".sensor-pop__cat");
    category.textContent = reading.state;
    category.style.color = reading.color;
    category.title = "Illustrative display bands, not engineering alarm or acceptance thresholds";
    const dot = container.querySelector(".sensor-pop__dot");
    dot.style.background = reading.color;
    dot.style.boxShadow = `0 0 9px ${reading.color}`;
    container.querySelector(".sensor-pop__hero strong").textContent = reading.text;
    container.querySelector(".sensor-pop__unit").textContent = reading.config.unit;
    const metrics = [["SensorID", "Instrument", ""], ["Chainage_m", "From start of road", "m"], ...reading.config.metrics];
    const signature = metrics.map(metric => metric[0]).join("|");
    if (signature !== rowSignature) {
      rowSignature = signature;
      rowValues.clear();
      container.querySelector(".sensor-pop__rows").replaceChildren(...metrics.map(([key, label]) => {
        const row = document.createElement("li");
        const caption = document.createElement("span");
        const value = document.createElement("b");
        caption.textContent = label;
        row.append(caption, value);
        rowValues.set(key, value);
        return row;
      }));
    }
    for (const [key, , unit] of metrics) {
      const value = attributes[key];
      rowValues.get(key).textContent = value == null ? "--"
        : key === "CompactionValid" ? value === 1 ? "Yes" : "Not assessed"
        : `${typeof value === "number" ? number.format(value) : value}${unit ? ` ${unit}` : ""}`;
    }
    container.querySelector(".sensor-pop__foot").textContent = `${state.running ? "Updated" : "Paused"} ${clock.format(attributes.Timestamp)} SGT`;
  };
}