/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export async function hideBasemapLabels(basemap) {
  for (const layer of basemap.referenceLayers) layer.visible = false;
  await Promise.all([...basemap.baseLayers].map(async layer => {
    if (layer.type === "scene" && /Open3D_.*Labels|Places and Labels/i.test(`${layer.url} ${layer.title}`)) {
      layer.visible = false;
    }
    if (layer.type !== "vector-tile") return;
    await layer.load();
    const styles = layer.currentStyleInfo?.style?.layers;
    if (!Array.isArray(styles)) throw new Error("Basemap text styles are unavailable");
    for (const style of styles) {
      if (style.type === "symbol" && style.layout?.["text-field"] !== undefined) {
        layer.setStyleLayerVisibility(style.id, "none");
      }
    }
  }));
}
