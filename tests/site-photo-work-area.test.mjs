import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectBoxes } from "../docs/site-photos/work-area.mjs";

test("a reviewed target must be in the work area; nested boxes do not count twice", () => {
  const review = { workArea: [0, 0.4, 1, 1], targets: ["concrete column"] };
  const candidate = (box, score = 0.8, label = "concrete column") => ({ box, score, label });
  const proposals = [
    candidate([10, 2, 20, 29]), candidate([0, 0, 100, 100]), candidate([34, 23, 42, 50]),
    candidate([12, 50, 23, 89]), candidate([14, 55, 21, 63], 0.6), candidate([65, 65, 80, 92]),
    candidate([5, 62, 10, 96], 0.1), candidate([40, 53, 70, 67], 0.9, "building")
  ];
  assert.deepEqual(selectBoxes(proposals, review, 100, 100).map(o => o.box), [[12, 50, 23, 89], [65, 65, 80, 92]]);
  assert.deepEqual(selectBoxes(proposals, undefined, 100, 100), []);
});

test("P16 highlights the two separate pier columns, the temporary works and the foreground worker", () => {
  const manifest = JSON.parse(readFileSync(new URL("../assets/site-photo-analysis.json", import.meta.url)));
  const p16 = Object.values(manifest.photos).find(p => p.filename === "IMG_4721.jpg");
  assert.deepEqual(p16.objects.map(o => o.label).sort(),
    ["concrete column", "concrete column", "site worker", "temporary supports"]);
  for (const [x, y] of [[0.11, 0.61], [0.515, 0.68]]) {
    assert.equal(p16.objects.filter(({ label, box: [l,t,r,b] }) => label === "concrete column" &&
      l < x * p16.width && x * p16.width < r && t < y * p16.height && y * p16.height < b).length, 1);
  }
  assert.ok(p16.objects.every(({box}) => box[1] / p16.height > 0.37), "Background above the site fence must be clear");
});
