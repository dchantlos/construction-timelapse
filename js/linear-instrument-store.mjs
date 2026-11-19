import { INSTRUMENT_FEEDS, describeInstrument } from "./linear-instrument-config.mjs?v=3";

export function createInstrumentStore({ now = Date.now } = {}) {
  const records = new Map();
  return {
    ingest(feedId, feature) {
      const attributes = feature?.attributes;
      const geometry = feature?.geometry;
      if (!INSTRUMENT_FEEDS[feedId] || typeof attributes?.TrackID !== "string" || typeof attributes?.SensorID !== "string" ||
          !Number.isSafeInteger(attributes.Timestamp) || attributes.Timestamp <= 0 || attributes.Timestamp > now() + 60000 ||
          !geometry || !Number.isFinite(geometry.x) || !Number.isFinite(geometry.y) ||
          ![3857, 102100].includes(geometry.spatialReference?.wkid) ||
          (["paving", "concrete"].includes(feedId) && !Number.isFinite(geometry.z))) return false;
      const key = `${feedId}:${attributes.TrackID}`;
      const previous = records.get(key);
      if (previous && previous.feature.attributes.Timestamp > attributes.Timestamp) return false;
      records.set(key, { key, feedId, feature: { attributes: { ...attributes }, geometry: { ...geometry } } });
      return true;
    },
    snapshot({ paused = false } = {}) {
      return [...records.values()].map(record => ({ ...record,
        reading: describeInstrument(record.feedId, record.feature, { stale: !paused && now() - record.feature.attributes.Timestamp > 30000 })
      })).sort((first, second) => first.key.localeCompare(second.key));
    },
    clear() { records.clear(); }
  };
}