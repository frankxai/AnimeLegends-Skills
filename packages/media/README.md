# @anime-legends/media

> Multi-engine prompt adapters and video render presets for Kling, Runway, Fal.ai Flux, and Luma.

Part of the **AnimeLegends.ai** studio ecosystem.

## Features

- **Multi-Engine Formatting**: Translates standard anime shot prompts into engine-tuned payloads for **Kling** (camera brackets, duration), **Runway Gen-3** (motion score, aspect ratios), **Fal.ai Flux Anime** (LoRA weights, CFG scale), and **Luma Dream Machine**.
- **Integrated Legal Firewall**: Guarantees all formatted prompts are stripped of copyrighted character names and studio trademarks before hitting external APIs.
- **Cost Estimation**: Accurate per-shot and full-episode dollar cost forecasting.

## Installation

```bash
npm install @anime-legends/media @anime-legends/core
```

## Quick Start

```typescript
import { MediaEngineAdapter } from "@anime-legends/media";

const payload = MediaEngineAdapter.format(
  "kling",
  "Akashi slashing through shadow beast with flaming blade",
  {
    aspectRatio: "9:16",
    durationSeconds: 5,
    cameraMovement: "Fast Zoom In"
  }
);

console.log(payload.formattedPrompt);
// Output: "[Camera: Fast Zoom In] Akashi slashing through shadow beast with flaming blade, ultra smooth 60fps sakuga anime motion..."
console.log(payload.estimatedCostUsd); // 0.18
```

## License

MIT © Frank Riemer / Arcanea
