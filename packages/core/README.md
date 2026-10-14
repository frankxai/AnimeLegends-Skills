# @anime-legends/core

> Core character invariants, style tokens, and copyright legal firewall for autonomous generative anime production.

Part of the **AnimeLegends.ai** studio ecosystem.

## Features

- **Mascot Trinity IP Anchors**: Canonical visual invariants, prompt anchors, and negative tokens for **Akashi** (Blazing Ronin), **Kage** (Umbral Rogue), and **Mira** (Celestial Priestess).
- **Anime Legal Firewall**: Strict automated protection against copyright infringement. Automatically intercepts and strips protected franchise names (`Naruto`, `Goku`, `Luffy`, `Gojo`, etc.) and protected studio trademarks (`Ghibli`, `Ufotable`, `Mappa`, `Trigger`), replacing them with high-fidelity anime descriptor tokens (`high-octane sakuga`, `dynamic cel-shading`).
- **Cinematic Style Presets**: Production-tuned camera directives, lighting moods, and rendering modifiers for `shonen_action`, `dark_fantasy`, `cyber_mecha`, `celestial_mystic`, and `neo_tokyo_noir`.

## Installation

```bash
npm install @anime-legends/core
```

## Quick Start

```typescript
import { MASCOTS, AnimeLegalFirewall, buildCharacterPrompt } from "@anime-legends/core";

// 1. Check & Sanitize Prompts through the Legal Firewall
const check = AnimeLegalFirewall.sanitize("Akashi fighting like Goku in a Studio Ghibli field");
console.log(check.cleanPrompt);
// Output: "Akashi fighting like original anime protagonist in a cinematic sakuga animation field"
console.log(check.violationsFound);
// Output: ["Copyrighted Character: 'goku'", "Protected Studio Trademark: 'studio ghibli'"]

// 2. Generate Brand-Locked Character Prompts
const render = buildCharacterPrompt("akashi", "unleashing dual flame slash across night sky", "shonen_action");
console.log(render.prompt);
console.log(render.negativePrompt);
```

## License

MIT © Frank Riemer / Arcanea
