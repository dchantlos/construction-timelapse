import { RADAR_DATASET, RADAR_LEGEND } from "./linear-radar-data.mjs";

export function createRadarLayout(icon) {
  const button = (action, glyph, label) => `<button type="button" class="radar-icon-button" data-radar-action="${action}" title="${label}" aria-label="${label}">${icon(glyph)}</button>`;
  const panel = document.createElement("aside");
  panel.id = "linearRadarPanel";
  panel.className = "linear-radar-panel glass";
  panel.hidden = true;
  panel.setAttribute("aria-labelledby", "linearRadarTitle");
  panel.innerHTML = `
    <header class="radar-header">
      <div><span class="radar-eyebrow">RAIN RADAR</span><h2 id="linearRadarTitle">Marina Bay East Roadway</h2></div>
      <div class="radar-actions">${button("refresh", "refresh-cw", "Refresh radar imagery")}${button("close", "x", "Close rain radar")}</div>
    </header>
    <div class="radar-scroll">
      <div class="radar-source"><span>NEA &middot; 70 km range</span><span class="radar-status" data-radar="status" role="status">Loading</span></div>
      <div class="radar-map-frame">
        <div class="radar-map" data-radar="map" aria-label="Singapore rain radar and roadway project"></div>
        <div class="radar-map-message" data-radar="map-message" role="status">Loading radar map</div>
        <div class="radar-map-tools">${button("home", "map", "Show Singapore")}${button("locate", "locate-fixed", "Locate roadway project")}${button("coverage", "scan", "Show full radar coverage")}${button("zoom-in", "plus", "Zoom in")}${button("zoom-out", "minus", "Zoom out")}</div>
        <div class="radar-map-attribution" data-radar="attribution" aria-label="Basemap attribution" tabindex="0"></div>
      </div>
      <div class="radar-timestamp"><strong data-radar="time">--:-- SGT</strong><span data-radar="frame-state">Awaiting imagery</span></div>
      <div class="radar-playback">
        ${button("previous", "skip-back", "Previous radar frame")}${button("play", "play", "Play radar history")}${button("next", "skip-forward", "Next radar frame")}
        <input data-radar="timeline" type="range" min="0" max="0" value="0" step="1" aria-label="Radar observation time" disabled />
        <button type="button" class="radar-latest" data-radar-action="latest" title="Return to the newest radar image">Latest</button>
      </div>
      <div class="radar-timeline-meta"><span data-radar="start">--:--</span><span data-radar="count">0 frames</span><span data-radar="end">--:--</span></div>
      <div class="radar-options"><span>Rain intensity</span><label>Opacity <input data-radar="opacity" type="range" min="20" max="100" value="80" step="5" /><output data-radar="opacity-value">80%</output></label></div>
      <div class="radar-legend" aria-label="NEA rain intensity legend">${RADAR_LEGEND.map(band =>
        `<div class="radar-legend-band"><span class="radar-legend-colors">${band.colors.map(color => `<i style="background:${color}"></i>`).join("")}</span><span>${band.label}</span></div>`).join("")}</div>
      <div class="radar-project-legend"><i aria-hidden="true"></i><span>Roadway project area</span><span>Conceptual deck footprint</span></div>
      <p class="radar-notice" data-radar="notice" hidden></p>
      <footer class="radar-footer"><span>Observed radar &middot; Beta dataset</span><span><a href="${RADAR_DATASET}" target="_blank" rel="noopener noreferrer">NEA / data.gov.sg</a> &middot; <a href="https://data.gov.sg/open-data-licence" target="_blank" rel="noopener noreferrer">Open Data Licence</a></span></footer>
    </div>`;
  const toggle = document.createElement("button");
  toggle.id = "linearRadarToggle";
  toggle.type = "button";
  toggle.className = "nav-btn linear-radar-toggle";
  toggle.title = "Rain radar";
  toggle.setAttribute("aria-label", "Rain radar");
  toggle.setAttribute("aria-controls", panel.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = icon("radar");
  document.querySelector(".nav-stack").append(toggle);
  const mobileToggle = toggle.cloneNode(true);
  mobileToggle.id = "linearRadarMobileToggle";
  mobileToggle.className = "nav-btn linear-radar-toggle linear-radar-mobile glass";
  document.body.append(panel, mobileToggle);
  const nodes = Object.fromEntries([...panel.querySelectorAll("[data-radar]")].map(node => [node.dataset.radar, node]));
  const actions = Object.fromEntries([...panel.querySelectorAll("[data-radar-action]")].map(node => [node.dataset.radarAction, node]));
  return { panel, toggles: [toggle, mobileToggle], nodes, actions };
}