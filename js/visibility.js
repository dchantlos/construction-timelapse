// =============================================================================
// visibility.js — sleek per-layer visibility toggles for the scene-service layers
// =============================================================================

/**
 * Build a compact, glassy layer list on the right that toggles each 3D
 * building / context layer on and off. Mirrors the SceneView TOC but styled to
 * match the AEONIS UI. Construction_Objects (and any future context layers)
 * show up automatically because we enumerate the scene's SceneServer layers.
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 */
export function createLayerVisibility(scene) {
  const list = document.getElementById("visibilityList");
  if (!list) return;

  // Only operational 3D object layers — skip basemap, elevation, labels.
  const layers = scene.allLayers
    .filter((layer) => layer.type === "scene")
    .toArray();

  for (const layer of layers) {
    const li = document.createElement("li");
    li.className = "toggle-row";

    const name = document.createElement("span");
    name.className = "toggle-name";
    name.textContent = layer.title;

    const label = document.createElement("label");
    label.className = "switch";
    label.title = `Toggle ${layer.title}`;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = layer.visible;
    input.addEventListener("change", () => {
      layer.visible = input.checked;
      // Static (non-time-aware) layers must ignore the TimeSlider so they stay
      // visible while scrubbing/playing the timeline.
      if (!layer.timeInfo?.fullTimeExtent && "useViewTime" in layer) {
        layer.useViewTime = false;
      }
    });

    const track = document.createElement("span");
    track.className = "track";

    label.append(input, track);
    li.append(name, label);
    list.appendChild(li);
  }

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
