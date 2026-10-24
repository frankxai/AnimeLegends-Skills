import test from "node:test";
import assert from "node:assert";
import { MediaEngineAdapter } from "./index.ts";

test("MediaEngineAdapter", async (t) => {
  await t.test("format - kling", () => {
    const res = MediaEngineAdapter.format("kling", "hero standing", {
      aspectRatio: "16:9",
      durationSeconds: 12,
      cameraMovement: "pan right"
    });
    assert.strictEqual(res.engine, "kling");
    assert.strictEqual(res.formattedPrompt, "[Camera: pan right] hero standing, ultra smooth 60fps sakuga anime motion, high aesthetic quality, cinematic lighting");
    assert.deepStrictEqual(res.parameters, {
      mode: "pro",
      duration: 10,
      aspect_ratio: "16:9",
      cfg_scale: 0.5
    });
    assert.strictEqual(res.estimatedCostUsd, 0.35);
  });

  await t.test("format - kling short", () => {
    const res = MediaEngineAdapter.format("kling", "hero standing", {
      durationSeconds: 5
    });
    assert.strictEqual(res.estimatedCostUsd, 0.18);
    assert.strictEqual(res.parameters.duration, 5);
    assert.strictEqual(res.parameters.aspect_ratio, "9:16"); // default
  });

  await t.test("format - runway_gen3", () => {
    const res = MediaEngineAdapter.format("runway_gen3", "running", {
      aspectRatio: "9:16",
      durationSeconds: 10,
      motionIntensity: 8
    });
    assert.strictEqual(res.engine, "runway_gen3");
    assert.strictEqual(res.formattedPrompt, "running, continuous fluid Japanese anime motion, consistent character model");
    assert.deepStrictEqual(res.parameters, {
      duration: 10,
      ratio: "768:1280",
      motion_score: 8,
      watermark: false
    });
    assert.strictEqual(res.estimatedCostUsd, 0.50);
  });

  await t.test("format - runway_gen3 short", () => {
    const res = MediaEngineAdapter.format("runway_gen3", "running", {
      aspectRatio: "16:9",
      durationSeconds: 3
    });
    assert.strictEqual(res.parameters.duration, 5);
    assert.strictEqual(res.parameters.ratio, "1280:768");
    assert.strictEqual(res.estimatedCostUsd, 0.25);
  });

  await t.test("format - fal_flux_anime", () => {
    const res = MediaEngineAdapter.format("fal_flux_anime", "sword slash", {
      aspectRatio: "9:16",
      seed: 42
    });
    assert.strictEqual(res.engine, "fal_flux_anime");
    assert.strictEqual(res.formattedPrompt, "sword slash, masterpiece, best anime quality, crisp lineart, vivid colors, <lora:sakuga-v2:0.8>");
    assert.deepStrictEqual(res.parameters, {
      image_size: { width: 832, height: 1216 },
      num_inference_steps: 28,
      guidance_scale: 3.5,
      seed: 42
    });
    assert.strictEqual(res.estimatedCostUsd, 0.035);
  });

  await t.test("format - luma_dream_machine", () => {
    const res = MediaEngineAdapter.format("luma_dream_machine", "city view", {
      aspectRatio: "16:9",
      cameraMovement: "zoom in"
    });
    assert.strictEqual(res.engine, "luma_dream_machine");
    assert.strictEqual(res.formattedPrompt, "camera executes zoom in, city view, seamless 3D spatial anime scene, cinematic keyframes");
    assert.deepStrictEqual(res.parameters, {
      aspect_ratio: "16:9",
      loop: false
    });
    assert.strictEqual(res.estimatedCostUsd, 0.20);
  });

  await t.test("format - sanitizes prompt", () => {
    // Tests that AnimeLegalFirewall.sanitize is applied
    const res = MediaEngineAdapter.format("kling", "Goku flying");
    assert.ok(res.formattedPrompt.includes("anime protagonist"), "Should sanitize forbidden characters");
    assert.ok(!res.formattedPrompt.includes("Goku"), "Should remove forbidden characters");
  });

  await t.test("format - unsupported engine throws", () => {
    assert.throws(() => {
      // @ts-ignore
      MediaEngineAdapter.format("unknown_engine", "test");
    }, /Unsupported generative engine: unknown_engine/);
  });

  await t.test("estimatePipelineCost", () => {
    const res = MediaEngineAdapter.estimatePipelineCost(10, "kling");
    assert.strictEqual(res.totalEstimatedCostUsd, 1.80);
    assert.strictEqual(res.perShotAverage, 0.18);

    const res2 = MediaEngineAdapter.estimatePipelineCost(5, "runway_gen3");
    assert.strictEqual(res2.totalEstimatedCostUsd, 1.25);
    assert.strictEqual(res2.perShotAverage, 0.25);
  });
});
