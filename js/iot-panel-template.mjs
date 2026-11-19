/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const CONN_STATE = {
  streaming: { text: "live", color: "#34d399" },
  connecting: { text: "connecting", color: "#facc15" },
  reconnecting: { text: "reconnecting", color: "#fb923c" },
  paused: { text: "paused", color: "#facc15" },
  offline: { text: "offline", color: "#f87171" }
};

export const escHtml = value => String(value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

export function srcChip(name, state, full = false) {
  const color = CONN_STATE[state] || CONN_STATE.offline;
  return (
    `<span class="src-chip"${full ? ' style="grid-column:1 / -1"' : ""}>` +
    `<span class="src-chip__dot" style="background:${color.color};box-shadow:0 0 8px -1px ${color.color}"></span>` +
    `<span class="src-chip__name">${name}</span><span class="src-chip__state">${color.text}</span></span>`
  );
}

export function srcChipElement(name, state, full = false) {
  const template = document.createElement("template");
  template.innerHTML = srcChip(name, state, full);
  return template.content.firstElementChild;
}

export function miniRow(label, sub, value, unit, color, offsite = false) {
  const dot = color ? `background:${color};box-shadow:0 0 7px -1px ${color}` : "opacity:0";
  return (
    `<li class="${offsite ? "is-offsite" : ""}">` +
    `<span class="sensor-mini__label">${label}${sub ? `<small>${sub}</small>` : ""}</span>` +
    `<span class="sensor-mini__read">${value}${unit ? `<small>${unit}</small>` : ""}</span>` +
    `<span class="sensor-mini__dot" style="${dot}"></span></li>`
  );
}
