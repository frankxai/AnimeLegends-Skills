# @anime-legends/storyboard

> Screenplay-to-shot breakdown compiler and camera angle taxonomy for generative anime sequences.

Part of the **AnimeLegends.ai** studio ecosystem.

## Features

- **Automated Shot Breakdown**: Compiles short synopsis concepts into timed 5-phase storyboards (`hook` 0-3s, `buildup` 3-15s, `climax` 15-42s, `impact` 42-46s, `resolution` 46-60s).
- **Camera Taxonomy**: Explicit anime cinematography directives (`extreme_close_up`, `low_angle_hero`, `dutch_angle`, `tracking_shot`, `whip_pan`).
- **Legal Firewall Integrated**: Every generated shot prompt is filtered through `@anime-legends/core` legal firewalls before output.

## Installation

```bash
npm install @anime-legends/storyboard @anime-legends/core
```

## Quick Start

```typescript
import { StoryboardCompiler } from "@anime-legends/storyboard";

const storyboard = StoryboardCompiler.compileShort({
  title: "Akashi Flame Rebirth",
  mascotId: "akashi",
  genre: "shonen_action",
  scenario: "Ambushed by shadow beasts in Neo Shinjuku ruins",
  aspectRatio: "9:16"
});

console.log(storyboard.shots.length); // 5 timed shots
console.log(storyboard.shots[0].camera); // "extreme_close_up"
console.log(storyboard.shots[0].generationPrompt);
```

## License

MIT © Frank Riemer / Arcanea
