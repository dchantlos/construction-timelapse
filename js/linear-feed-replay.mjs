export const REPLAY_SOURCE_STEP_MS = 60000;

export function compileReplayFeed(descriptor, rows) {
  const fields = descriptor.fields;
  if (!Array.isArray(rows) || !Array.isArray(fields) || rows.length < 2 ||
      rows[0].length !== fields.length || fields.some((field, index) => rows[0][index] !== field.name)) {
    throw new Error(`Unexpected CSV schema for ${descriptor.filename}`);
  }
  const identities = new Map(descriptor.sensors.map(sensor => [sensor.TrackID, sensor.SensorID]));
  const groups = new Map();
  for (const values of rows.slice(1)) {
    if (values.length !== fields.length) throw new Error(`Incomplete observation in ${descriptor.filename}`);
    const attributes = Object.fromEntries(fields.map((field, index) => {
      const text = values[index];
      if (field.type === "String") return [field.name, text];
      const value = typeof text === "string" && text.trim() ? Number(text) : NaN;
      if (!Number.isFinite(value) || (field.type.startsWith("Int") && !Number.isSafeInteger(value))) {
        throw new Error(`Invalid ${field.name} in ${descriptor.filename}`);
      }
      return [field.name, value];
    }));
    if (identities.get(attributes.TrackID) !== attributes.SensorID || attributes.IsSimulated !== 1 ||
        attributes.Timestamp <= 0 || attributes.ScenarioTimestamp !== attributes.Timestamp ||
        Math.abs(attributes.Longitude) > 20037509 || Math.abs(attributes.Latitude) > 20048967) {
      throw new Error(`Invalid simulated track in ${descriptor.filename}`);
    }
    if (descriptor.zField && !Number.isFinite(attributes[descriptor.zField])) throw new Error("Missing instrument elevation");
    const group = groups.get(attributes.Timestamp) ?? new Map();
    if (group.has(attributes.TrackID)) throw new Error(`Duplicate track at observation time in ${descriptor.filename}`);
    group.set(attributes.TrackID, attributes);
    groups.set(attributes.Timestamp, group);
  }
  const times = [...groups.keys()].sort((first, second) => first - second);
  if (rows.length - 1 !== descriptor.observations || times.some((timestamp, index) =>
    groups.get(timestamp).size !== descriptor.tracks || index > 0 && timestamp - times[index - 1] !== REPLAY_SOURCE_STEP_MS)) {
    throw new Error(`Incomplete replay sequence in ${descriptor.filename}`);
  }
  return { descriptor, durationMs: times.length * REPLAY_SOURCE_STEP_MS,
    frames: times.map(timestamp => [...groups.get(timestamp).values()]) };
}

export function replayFeatures(feed, sourceElapsedMs, timestamp = Date.now()) {
  if (!Number.isFinite(sourceElapsedMs) || sourceElapsedMs < 0 || !Number.isSafeInteger(timestamp) || timestamp <= 0) {
    throw new Error("Invalid replay time");
  }
  const index = Math.floor(sourceElapsedMs / REPLAY_SOURCE_STEP_MS) % feed.frames.length;
  return feed.frames[index].map(original => {
    const attributes = { ...original, Timestamp: timestamp };
    const geometry = { x: attributes.Longitude, y: attributes.Latitude, spatialReference: { wkid: 102100 } };
    if (feed.descriptor.zField) geometry.z = attributes[feed.descriptor.zField];
    return { attributes, geometry };
  });
}