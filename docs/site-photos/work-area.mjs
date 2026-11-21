export const prompts = Object.freeze({
  "concrete column": "concrete column.",
  "temporary supports": "metal scaffolding.",
  "access ladder": "ladder.",
  "guardrail": "yellow safety railing.",
  "excavator": "excavator.",
  "site worker": "construction worker."
});

export const minScore = 0.30;

const area = ([l, t, r, b]) => Math.max(0, r - l) * Math.max(0, b - t);
const overlap = (a, b) => area([Math.max(a[0], b[0]), Math.max(a[1], b[1]),
  Math.min(a[2], b[2]), Math.min(a[3], b[3])]);

export function targetsFor(review) {
  if (!review?.workArea && !review?.targets) return [];
  const { workArea, targets } = review;
  if (!Array.isArray(workArea) || workArea.length !== 4 ||
      !workArea.every(n => Number.isFinite(n) && n >= 0 && n <= 1) || !area(workArea) ||
      !Array.isArray(targets) || !targets.length || !targets.every(label => Object.hasOwn(prompts, label)) ||
      new Set(targets).size !== targets.length) throw new Error("Invalid work area or construction targets in review.json");
  return targets;
}

export function selectBoxes(proposals, review, width, height) {
  const targets = targetsFor(review);
  if (!targets.length) return [];
  const workArea = review.workArea.map((v, i) => v * (i % 2 ? height : width));
  const kept = [];
  for (const label of targets) {
    const matches = proposals.filter(p => p.label === label && p.score >= minScore).sort((a, b) => b.score - a.score);
    for (const { box } of matches) {
      const size = area(box);
      if (!size || size > 0.85 * width * height || overlap(box, workArea) < 0.8 * size) continue;
      const duplicate = kept.some(p => {
        if (p.label !== label) return false;
        const common = overlap(box, p.box);
        const otherSize = area(p.box);
        return common / (size + otherSize - common) > 0.5 || common / Math.min(size, otherSize) > 0.9;
      });
      if (!duplicate) kept.push({ label, box });
    }
  }
  return kept;
}
