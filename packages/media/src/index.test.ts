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
