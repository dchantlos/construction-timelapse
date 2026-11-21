import { createHash } from "node:crypto";
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AutoProcessor, AutoModelForZeroShotObjectDetection, SmolVLMForConditionalGeneration, RawImage, env } from "@huggingface/transformers";
import { minScore, prompts, selectBoxes, targetsFor } from "./work-area.mjs";

const layer = "https://services.arcgis.com/tgUWep3BZhLoHKNh/arcgis/rest/services/SG_Roadway_OrientedImages/FeatureServer/0";
const modelId = "onnx-community/grounding-dino-tiny-ONNX";
const revision = "ff690b0a8050566c290287545bd059350f3e9096";
const captionId = "HuggingFaceTB/SmolVLM-Instruct";
const captionRevision = "bb436dc36521da6d8cf80a8fdeb12e6b2e323f81";
const instruction = "Describe what is visible at this construction site in two short sentences. Focus on the foreground works, structures and equipment. Do not infer progress, safety or what will happen next.";
const runtime = { device: "cpu", session_options: { intraOpNumThreads: 4, interOpNumThreads: 1 } };
const output = fileURLToPath(new URL("../../assets/site-photo-analysis.json", import.meta.url));
env.cacheDir = fileURLToPath(new URL("./node_modules/.cache/models/", import.meta.url));
const cached = process.argv.includes("--detections-only") ? JSON.parse(await readFile(output, "utf8")) : null;
if (cached && (cached.source !== layer || cached.captionModel?.id !== captionId ||
    cached.captionModel.revision !== captionRevision || cached.captionModel.instruction !== instruction)) {
  throw new Error("Caption configuration changed. Run npm run generate without --detections-only.");
}

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Could not read ${url}: HTTP ${response.status}`);
  return response;
}

const source = await (await download(`${layer}/queryAttachments?definitionExpression=1%3D1&f=json`)).json();
if (!source.attachmentGroups?.length) throw new Error(source.error?.message ?? "No published attachments");
console.log("Loading local photo analysis models…");
const model = await AutoModelForZeroShotObjectDetection.from_pretrained(modelId, {
  revision, dtype: "q8", ...runtime
});
let captionModel;
try {
  const processor = await AutoProcessor.from_pretrained(modelId, { revision });
  let writer, prompt;
  if (!cached) {
    captionModel = await SmolVLMForConditionalGeneration.from_pretrained(captionId, {
      revision: captionRevision, dtype: { embed_tokens: "q8", vision_encoder: "q8", decoder_model_merged: "q4" }, ...runtime
    });
    writer = await AutoProcessor.from_pretrained(captionId, { revision: captionRevision });
    prompt = writer.apply_chat_template([{ role: "user", content: [
      { type: "image" }, { type: "text", text: instruction }
    ] }], { add_generation_prompt: true });
  }
  async function describe(image) {
    const inputs = await writer(prompt, image);
    const ids = await captionModel.generate({
      ...inputs, max_new_tokens: 72, no_repeat_ngram_size: 4, repetition_penalty: 1.08, do_sample: false, num_beams: 1
    });
    return writer.batch_decode(ids.slice(null, [inputs.input_ids.dims[1], null]), { skip_special_tokens: true })[0].trim();
  }
  async function detect(image, review) {
    const candidates = [];
    for (const label of targetsFor(review)) {
      // Query separately: on these images a multi-class prompt missed most of
      // the scaffold and equipment while returning the easier column matches.
      const inputs = await processor(image, prompts[label]);
      const outputs = await model(inputs);
      const [result] = processor.post_process_grounded_object_detection(outputs, inputs.input_ids, {
        box_threshold: minScore, text_threshold: 0.18, target_sizes: [[image.height, image.width]]
      });
      result.boxes.forEach((coords, i) => {
        if (coords.length !== 4 || !coords.every(Number.isFinite) || !Number.isFinite(result.scores[i])) {
          throw new Error(`Invalid ${label} proposal`);
        }
        const box = coords.map((n, j) => Math.max(0, Math.min(image.size[j % 2], Math.round(n))));
        candidates.push({ label, box, score: result.scores[i] });
      });
    }
    return selectBoxes(candidates, review, image.width, image.height);
  }

  const reviews = JSON.parse(await readFile(new URL("./review.json", import.meta.url), "utf8"));
  const photos = {};
  for (const group of source.attachmentGroups) {
    const jpegs = group.attachmentInfos.filter(a => a.contentType === "image/jpeg");
    if (jpegs.length !== 1 || !group.parentGlobalId) {
      throw new Error(`Expected one JPEG and a stable feature ID for camera ${group.parentObjectId}`);
    }
    const attachment = jpegs[0];
    const bytes = Buffer.from(await (await download(`${layer}/${group.parentObjectId}/attachments/${attachment.id}`)).arrayBuffer());
    if (bytes.length !== attachment.size) throw new Error(`Incomplete download: ${attachment.name}`);
    const image = await RawImage.fromBlob(new Blob([bytes], { type: "image/jpeg" }));
    const key = group.parentGlobalId.replace(/[{}]/g, "").toLowerCase();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const prior = cached?.photos[key];
    if (cached && (!prior?.caption || prior.sha256 !== sha256)) {
      throw new Error(`Missing or changed caption source for ${attachment.name}. Run the full generator.`);
    }
    const caption = cached ? prior.caption : await describe(image);
    if (!caption) throw new Error(`Empty caption for ${attachment.name}`);
    const review = reviews[sha256];
    const objects = await detect(image, review);
    photos[key] = {
      attachmentId: attachment.id, attachmentGlobalId: attachment.globalId, filename: attachment.name,
      sha256, byteLength: bytes.length, width: image.width, height: image.height, caption,
      ...(review && { displayCaption: review.caption }),
      workAreaReviewed: Boolean(review?.workArea), objects
    };
    console.log(`${attachment.name}: ${objects.length} construction boxes (${objects.map(o => o.label).join(", ")}).`);
  }
  const data = { source: layer, captionModel: { id: captionId, revision: captionRevision, instruction },
    detectionModel: { id: modelId, revision, scope: "construction-work-area", prompts, minScore }, photos };
  await writeFile(`${output}.tmp`, JSON.stringify(data, null, 2) + "\n");
  await rename(`${output}.tmp`, output);
  console.log(`Saved results for ${Object.keys(photos).length} photos.`);
} finally {
  await model.dispose();
  await captionModel?.dispose();
}
