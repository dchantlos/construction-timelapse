export const SITE_ACTIVITY = Object.freeze({ peakWorkers: 120, peakVehicles: 18, nightWorkers: 6, parkedVehicles: 4 });
const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Singapore", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function modeledSiteActivity(timestamp = Date.now()) {
  const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(part => [part.type, part.value]));
  const hour = Number(parts.hour) + Number(parts.minute) / 60 + Number(parts.second) / 3600;
  let activity = hour < 6.5 || hour >= 18.5 ? 0 : hour < 8 ? (hour - 6.5) / 1.5 : hour < 16 ? 1 : (18.5 - hour) / 2.5;
  if (hour >= 12 && hour < 13) activity *= 0.7;
  if (parts.weekday === "Sat") activity *= hour < 13 ? 0.55 : 0.15;
  if (parts.weekday === "Sun") activity *= 0.08;
  activity = clamp(activity, 0, 1);
  const minutes = timestamp / 60000;
  return {
    workers: Math.round(clamp(SITE_ACTIVITY.nightWorkers + (SITE_ACTIVITY.peakWorkers - SITE_ACTIVITY.nightWorkers) * activity + Math.sin(minutes / 2) * 2 * activity, SITE_ACTIVITY.nightWorkers, SITE_ACTIVITY.peakWorkers)),
    vehicles: Math.round(clamp(SITE_ACTIVITY.parkedVehicles + (SITE_ACTIVITY.peakVehicles - SITE_ACTIVITY.parkedVehicles) * activity + Math.sin(minutes / 3) * activity, SITE_ACTIVITY.parkedVehicles, SITE_ACTIVITY.peakVehicles))
  };
}