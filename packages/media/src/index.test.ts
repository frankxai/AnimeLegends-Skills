import { test, describe } from "node:test";
import * as assert from "node:assert";
import { MediaEngineAdapter } from "./index.ts";

describe("MediaEngineAdapter", () => {
  describe("format", () => {
    test("formats correctly for kling engine", () => {
      const result = MediaEngineAdapter.format("kling", "test prompt", {
        cameraMovement: "pan left",
        aspectRatio: "16:9",
        durationSeconds: 10
      });
      assert.strictEqual(result.engine, "kling");
      assert.ok(result.formattedPrompt.includes("[Camera: pan left]"));
      assert.strictEqual(result.parameters.aspect_ratio, "16:9");
      assert.strictEqual(result.parameters.duration, 10);
      assert.strictEqual(result.estimatedCostUsd, 0.35);
    });

    test("formats correctly for runway_gen3 engine", () => {
      const result = MediaEngineAdapter.format("runway_gen3", "test prompt", {
        aspectRatio: "9:16",
        durationSeconds: 5,
        motionIntensity: 8
      });
      assert.strictEqual(result.engine, "runway_gen3");
      assert.strictEqual(result.parameters.ratio, "768:1280");
      assert.strictEqual(result.parameters.duration, 5);
      assert.strictEqual(result.parameters.motion_score, 8);
      assert.strictEqual(result.estimatedCostUsd, 0.25);
    });

    test("formats correctly for fal_flux_anime engine", () => {
      const result = MediaEngineAdapter.format("fal_flux_anime", "test prompt", {
        aspectRatio: "16:9",
        seed: 12345
      });
      assert.strictEqual(result.engine, "fal_flux_anime");
      assert.deepStrictEqual(result.parameters.image_size, { width: 1216, height: 832 });
      assert.strictEqual(result.parameters.seed, 12345);
      assert.strictEqual(result.estimatedCostUsd, 0.035);
    });

    test("formats correctly for luma_dream_machine engine", () => {
      const result = MediaEngineAdapter.format("luma_dream_machine", "test prompt", {
        cameraMovement: "zoom in"
      });
      assert.strictEqual(result.engine, "luma_dream_machine");
      assert.ok(result.formattedPrompt.includes("camera executes zoom in,"));
      assert.strictEqual(result.parameters.aspect_ratio, "9:16");
      assert.strictEqual(result.estimatedCostUsd, 0.20);
    });

    test("throws error for unsupported engine", () => {
      assert.throws(
        // @ts-ignore
        () => MediaEngineAdapter.format("unsupported_engine", "test prompt"),
        { message: "Unsupported generative engine: unsupported_engine" }
      );
    });
  });

  describe("estimatePipelineCost", () => {
    test("estimates cost correctly for default engine", () => {
      const result = MediaEngineAdapter.estimatePipelineCost(5);
      // default is kling, 5s duration => 0.18 per shot
      // 5 shots * 0.18 = 0.90
      assert.strictEqual(result.totalEstimatedCostUsd, 0.90);
      assert.strictEqual(result.perShotAverage, 0.18);
    });

    test("estimates cost correctly for specified engine", () => {
      const result = MediaEngineAdapter.estimatePipelineCost(10, "fal_flux_anime");
      // fal_flux_anime cost is 0.035 per shot
      // 10 shots * 0.035 = 0.35
      assert.strictEqual(result.totalEstimatedCostUsd, 0.35);
      assert.strictEqual(result.perShotAverage, 0.035);
    });
  });
});

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
