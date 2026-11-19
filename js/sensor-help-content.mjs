/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { INSTRUMENT_FEEDS } from "./linear-instrument-config.mjs?v=3";

const weather = {
  q: "Weather, air quality and rain",
  a: "<ul><li><strong>Temperature</strong> is in degrees Celsius; <strong>humidity</strong> is a percentage.</li>" +
    "<li><strong>Wind</strong> is air speed in metres per second. The caption identifies its height or averaging period.</li>" +
    "<li><strong>AQI</strong> is an air-pollution index. The roadway uses US AQI, not Singapore PSI.</li>" +
    "<li><strong>PM10 / PM2.5</strong> are airborne particle sizes. Their readings show dust concentration in micrograms per cubic metre, not a particle count.</li>" +
    "<li><strong>Rain</strong> is accumulated depth in millimetres over the displayed period.</li></ul>" +
    "These readings provide useful site context; they are not required to run the construction animation."
};

const sources = {
  q: "Data sources and connection status",
  a: "<p>The small source boxes are diagnostic badges, not extra sensor measurements. " +
    "<strong>Live</strong> means updates are arriving; it does not establish that a value is a verified site measurement. " +
    "<strong>Open-Meteo</strong> identifies the weather/air-quality provider.</p>" +
    "<p>Status when Help was opened:</p><div class=\"sensor-detail__sources\" data-help-source-status></div>"
};

export const SENSOR_HELP_CONTENT = {
  vertical: {
    title: "Help - IoT readings",
    intro: "What the panel readings mean.",
    sections: [
      weather,
      { q: "Tower wind", a: "The tower panel shows a 10-minute average at the crane-top sensor. Gusts and direction are listed in the expanded detail." },
      { q: "Noise", a: "dBA is an A-weighted sound level, adjusted to reflect human hearing. Higher numbers mean louder sound." },
      { q: "Gas readings", a: "Each gas has its own units and display bands. ppm and ppb mean parts per million and parts per billion; they are not interchangeable with dust concentration." },
      { q: "Reading colors", a: "Green, yellow, orange and red indicate increasing display severity. Inspect the individual reading and its context rather than treating a color alone as an engineering approval." },
      sources
    ]
  },
  linear: {
    title: "Help - Roadway readings",
    intro: "Definitions and assumptions for the roadway demonstration.",
    sections: [
      weather,
      ...Object.values(INSTRUMENT_FEEDS).map(config => ({ q: `${config.label} (${config.unit})`, a: config.description })),
      { q: "Are these realistic site measurements?", a: "The roadway instruments replay authored demonstration data. They are not calibrated measurements from this Singapore site. Real validation requires traffic counts, survey and groundwater baselines, receptor locations and concrete/paving specifications. Weather and air quality come from Open-Meteo model data." },
      { q: "Why these traffic numbers?", a: "The quiet access-road scenario normally has no queue or a short queue of up to 12 m, with brief holds up to 30 m. It assumes about 6 m per waiting vehicle including its gap, and light arrivals of 1-5 vehicles per minute. These are presentation assumptions, not Singapore traffic statistics." },
      { q: "Map colors versus reading colors", a: "Each of the seven sensor types has its own fixed map and filter-chip color, shared by its West/East pair. Reading values and dots use green/yellow/orange/red display bands. Those bands are illustrative settings, not engineering acceptance limits." },
      sources
    ]
  }
};
