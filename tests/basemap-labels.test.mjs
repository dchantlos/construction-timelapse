/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import test from "node:test";
import assert from "node:assert/strict";
import { hideBasemapLabels } from "../js/basemap-labels.mjs";

test("hides 3D place labels and vector text without changing buildings, roads, or icon-only styles", async () => {
  const hidden = [];
  const buildings = { type: "scene", title: "Buildings", visible: true };
  const places = { type: "scene", title: "Places and Labels", visible: true };
  const reference = { visible: true };
  const vector = { type: "vector-tile", visible: true, async load() {},
    currentStyleInfo: { style: { layers: [
      { id: "places", type: "symbol", layout: { "text-field": "{name}" } },
      { id: "road-labels", type: "symbol", layout: { "text-field": ["get", "name"] } },
      { id: "road-lines", type: "line" },
      { id: "land", type: "fill" },
      { id: "icons", type: "symbol", layout: { "icon-image": "park" } }
    ] } },
    setStyleLayerVisibility(id, visibility) { hidden.push([id, visibility]); }
  };
  await hideBasemapLabels({ baseLayers: [vector, buildings, places], referenceLayers: [reference] });
  assert.deepEqual(hidden, [["places", "none"], ["road-labels", "none"]]);
  assert.equal(places.visible, false);
  assert.equal(reference.visible, false);
  assert.equal(buildings.visible, true);
  assert.equal(vector.visible, true);
});

test("reports missing style data instead of claiming that labels were hidden", async () => {
  const vector = { type: "vector-tile", async load() {}, currentStyleInfo: null };
  await assert.rejects(hideBasemapLabels({ baseLayers: [vector], referenceLayers: [] }), /styles are unavailable/);
});
