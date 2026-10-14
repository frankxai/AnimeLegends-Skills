import { AnimeLegalFirewall } from "@anime-legends/core";

export type GenerativeVideoEngine =
  | "kling"
  | "runway_gen3"
  | "fal_flux_anime"
  | "luma_dream_machine";

export interface MediaGenerationConfig {
  engine: GenerativeVideoEngine;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSeconds?: number;
  cameraMovement?: string;
  motionIntensity?: number; // 1 - 10
  seed?: number;
}

export interface EnginePayload {
  engine: GenerativeVideoEngine;
  formattedPrompt: string;
  negativePrompt?: string;
  parameters: Record<string, any>;
  estimatedCostUsd: number;
}

export class MediaEngineAdapter {
  static format(
    engine: GenerativeVideoEngine,
    prompt: string,
    config: Partial<MediaGenerationConfig> = {}
  ): EnginePayload {
    const sanitized = AnimeLegalFirewall.sanitize(prompt);
    const cleanPrompt = sanitized.cleanPrompt;
    const aspect = config.aspectRatio || "9:16";
    const duration = config.durationSeconds || 5;

    switch (engine) {
      case "kling": {
        const cameraTag = config.cameraMovement ? `[Camera: ${config.cameraMovement}] ` : "";
        return {
          engine: "kling",
          formattedPrompt: `${cameraTag}${cleanPrompt}, ultra smooth 60fps sakuga anime motion, high aesthetic quality, cinematic lighting`,
          negativePrompt: "jitter, morphing, deformed hands, face mutation, blurry, watermark",
          parameters: {
            mode: "pro",
            duration: duration >= 10 ? 10 : 5,
            aspect_ratio: aspect === "9:16" ? "9:16" : "16:9",
            cfg_scale: 0.5
          },
          estimatedCostUsd: duration >= 10 ? 0.35 : 0.18
        };
      }

      case "runway_gen3": {
        return {
          engine: "runway_gen3",
          formattedPrompt: `${cleanPrompt}, continuous fluid Japanese anime motion, consistent character model`,
          parameters: {
            duration: duration >= 10 ? 10 : 5,
            ratio: aspect === "9:16" ? "768:1280" : "1280:768",
            motion_score: config.motionIntensity ?? 5,
            watermark: false
          },
          estimatedCostUsd: duration >= 10 ? 0.50 : 0.25
        };
      }

      case "fal_flux_anime": {
        return {
          engine: "fal_flux_anime",
          formattedPrompt: `${cleanPrompt}, masterpiece, best anime quality, crisp lineart, vivid colors, <lora:sakuga-v2:0.8>`,
          negativePrompt: "worst quality, low quality, photorealistic, 3d, realistic human skin",
          parameters: {
            image_size: aspect === "9:16" ? { width: 832, height: 1216 } : { width: 1216, height: 832 },
            num_inference_steps: 28,
            guidance_scale: 3.5,
            seed: config.seed
          },
          estimatedCostUsd: 0.035
        };
      }

      case "luma_dream_machine": {
        const cameraCue = config.cameraMovement ? `camera executes ${config.cameraMovement}, ` : "";
        return {
          engine: "luma_dream_machine",
          formattedPrompt: `${cameraCue}${cleanPrompt}, seamless 3D spatial anime scene, cinematic keyframes`,
          parameters: {
            aspect_ratio: aspect === "9:16" ? "9:16" : "16:9",
            loop: false
          },
          estimatedCostUsd: 0.20
        };
      }

      default:
        throw new Error(`Unsupported generative engine: ${engine}`);
    }
  }

  static estimatePipelineCost(shotCount: number, engine: GenerativeVideoEngine = "kling"): {
    totalEstimatedCostUsd: number;
    perShotAverage: number;
  } {
    const single = this.format(engine, "sample prompt", { durationSeconds: 5 });
    return {
      totalEstimatedCostUsd: Number((single.estimatedCostUsd * shotCount).toFixed(2)),
      perShotAverage: single.estimatedCostUsd
    };
  }
}
