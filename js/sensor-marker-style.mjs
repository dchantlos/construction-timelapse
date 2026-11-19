export const SENSOR_GLOW_INTENSITY = 0.7;
export const SENSOR_PULSE_PERIOD_MS = 2800;

export function orbSymbol(rgb, diameter = 6) {
  return {
    type: "point-3d",
    symbolLayers: [{ type: "object", resource: { primitive: "sphere" },
      material: { color: rgb, emissive: { strength: 2, source: "color" } },
      anchor: "bottom", width: diameter, depth: diameter, height: diameter }]
  };
}

export function labelSymbol(text, rgb) {
  return {
    type: "point-3d",
    symbolLayers: [{ type: "text", text, material: { color: "#ffffff" },
      halo: { color: [4, 8, 20, 0.85], size: 1.1 }, size: 11.5,
      font: { weight: "bold", family: "Inter, system-ui, sans-serif" } }],
    verticalOffset: { screenLength: 22, minWorldLength: 16 },
    callout: { type: "line", size: 1.1, color: [...rgb, 0.85], border: { color: [4, 8, 20, 0.6] } }
  };
}

export function sensorPulseAt(elapsedMs, reducedMotion = false) {
  const wave = reducedMotion ? 1 : 0.5 + 0.5 * Math.sin(elapsedMs / SENSOR_PULSE_PERIOD_MS * Math.PI * 2 + Math.PI / 2);
  return { orbs: 0.55 + 0.45 * wave, labels: 0.5 + 0.5 * wave, trough: wave <= 0.05 };
}