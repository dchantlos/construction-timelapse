# AI analysis for the roadway site photos

The Linear Progress **Site photos** tab reads saved suggestions for the selected
ArcGIS attachment. Opening **AI photo analysis** shows its caption and labels.
**Show construction boxes** annotates the upright JPEG, not the separately rotated and
zoomed image in the ArcGIS viewer. The scene's viewing cone remains visible.
Box labels use high-contrast badges sized for the screen, independent of image
resolution. Select **Expand photos** to present the current native or annotated
photo. In the expanded view, **Prev / Next** or the left/right arrow keys
browse photos, keeping boxes on when the next photo has detections. Press
**Esc** or **Collapse photos** to return to the same photo in the dashboard.

## Generate or refresh the results

From this directory, with Node.js 22+ on an ONNX Runtime-supported machine:

```sh
npm ci
npm run generate
```

The generator reads the JPEGs from the [published oriented imagery layer](https://www.arcgis.com/home/item.html?id=97766919c9ef47c89f2ed9ff00af2dba).
It runs two pinned ONNX models **locally on the CPU**:

- [SmolVLM-Instruct](https://huggingface.co/HuggingFaceTB/SmolVLM-Instruct)
  receives the image and a short construction-focused caption prompt.
- [Grounding DINO Tiny](https://huggingface.co/onnx-community/grounding-dino-tiny-ONNX)
  searches for the construction targets selected for each photo (for example
  concrete columns or scaffolding), one prompt per pass. It does not run a
  common-object scan across the skyline. The generator discards weak or
  duplicate proposals, near-full-frame boxes and boxes less than 80% inside
  the reviewed work area. Remaining coordinates are model predictions in
  original image pixels: left, top, right, bottom.

Allow about 2 GB for the first model download, in addition to the npm
dependencies. Weights are cached under the ignored `node_modules` directory.
Images are not sent to a model service. The generator requires no cloud AI
key, does not edit the ArcGIS layer, and replaces
[`assets/site-photo-analysis.json`](../../assets/site-photo-analysis.json) only
after the complete run succeeds. Deploy that JSON with the app, not the models
or authoring dependencies. Bump its cache version in
[`site-photo-analysis.mjs`](../../js/site-photo-analysis.mjs) when replacing results.

The manifest uses feature and attachment GlobalIDs, not photo order or camera
coordinates: two photos at one camera stop can have entirely different results.
The eight demo captions were edited against the images; **Unedited model
caption** shows the original machine output. [`review.json`](./review.json)
stores caption edits, a normalized `[left, top, right, bottom]` work area, and
visible target classes by image SHA-256. The work area is not a detection box.
For a new or replaced JPEG, run the full generator for its caption and digest;
boxes stay off until you inspect the photo and add its work area and targets.
Run `npm run generate -- --detections-only` to update the boxes without
regenerating existing captions. This mode checks the caption configuration and
the SHA-256 of every JPEG before reusing its caption. Review the finished overlays
on the source photos: an on-site object is not necessarily the subject of a shot.
Regenerate after adding, replacing or editing attachments. A new photo without
analysis still opens normally in the oriented viewer.

The [Survey123 Common Object Detection package](https://www.arcgis.com/home/item.html?id=a91bed8bc0fe4e1bb8db45c23959e5f1)
is a related example: it detects common COCO categories with TensorFlow Lite;
it is **not** the model used here and does not generate construction narratives.
Both captions and boxes here are suggestions for review. Models can miss
equipment or confuse similar shapes, such as a pallet and a ladder.
The results are not an inspection, safety determination, or
input to the progress and billing figures.
