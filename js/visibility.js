// =============================================================================
// visibility.js — sleek per-layer visibility toggles for the scene-service layers
// =============================================================================

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import { PROJECT, layerLabel } from "./config.js?v=15";

/**
 * Build a compact, glassy layer list on the right that toggles each 3D
 * building / context layer on and off. Mirrors the SceneView TOC but styled to
 * match the AEONIS UI. Construction_Objects (and any future context layers)
 * show up automatically because we enumerate the scene's SceneServer layers.
 * The list is rebuilt when the basemap (and so its context layers) changes.
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 */
export function createLayerVisibility(scene) {
  const list = document.getElementById("visibilityList");
  if (!list) return;

  let watchers = [];

  function render() {
    for (const handle of watchers) handle.remove();
    watchers = [];
    list.replaceChildren();

    // Only 3D object layers — skip vector basemaps, elevation, meshes, and the
    // exploded view's zone clones (explode.js), which mirror their originals.
    const layers = scene.allLayers
      .filter((layer) => layer.type === "scene" && !String(layer.id).includes("-explode-"))
      .toArray();

    for (const layer of layers) {
      const li = document.createElement("li");
      li.className = "toggle-row";

      const title = PROJECT.relabelLayers ? layerLabel(layer.title) : layer.title;
      const name = document.createElement("span");
      name.className = "toggle-name";
      name.textContent = title;

      const label = document.createElement("label");
      label.className = "switch";
      label.title = `Toggle ${title}`;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = layer.visible;
      input.setAttribute("aria-label", `Show ${title}`);
      input.addEventListener("change", () => {
        layer.visible = input.checked;
        // Static (non-time-aware) layers must ignore the TimeSlider so they stay
        // visible while scrubbing/playing the timeline.
        if (!layer.timeInfo?.fullTimeExtent && "useViewTime" in layer) {
          layer.useViewTime = false;
        }
      });

      // Reflect visibility changes made elsewhere (e.g. the isolate control) so
      // this toggle never drifts out of sync with the actual layer state.
      watchers.push(
        reactiveUtils.watch(
          () => layer.visible,
          (visible) => {
            input.checked = visible;
          }
        )
      );

      const track = document.createElement("span");
      track.className = "track";

      label.append(input, track);
      li.append(name, label);
      list.appendChild(li);
    }
  }

  render();
  reactiveUtils.watch(() => scene.basemap, render);

  // Collapse / expand the panel so it never fights the zoom controls.
  const panel = list.closest(".layers-panel");
  const toggle = document.getElementById("layersToggle");
  if (panel && toggle) {
    toggle.addEventListener("click", () => {
      const collapsed = panel.classList.toggle("is-collapsed");
      toggle.textContent = collapsed ? "+" : "\u2013";
      toggle.title = collapsed ? "Expand layers" : "Minimize layers";
    });
  }
}
