import { MASCOTS, AnimeLegalFirewall, buildCharacterPrompt, AnimeGenreStyle } from "@anime-legends/core";
import { StoryboardCompiler, CameraAngle } from "@anime-legends/storyboard";
import { MediaEngineAdapter, GenerativeVideoEngine } from "@anime-legends/media";

export const ANIME_MCP_TOOLS = [
  {
    name: "anime_mascot_get",
    description: "Get full invariant visual identity and prompt anchors for an AnimeLegends mascot (Akashi, Kage, Mira).",
    inputSchema: {
      type: "object",
      properties: {
        mascotId: {
          type: "string",
          enum: ["akashi", "kage", "mira"],
          description: "Mascot identifier."
        }
      },
      required: ["mascotId"]
    }
  },
  {
    name: "anime_prompt_build",
    description: "Build a brand-locked, style-consistent character prompt for diffusion or video generation.",
    inputSchema: {
      type: "object",
      properties: {
        mascotId: { type: "string", enum: ["akashi", "kage", "mira"] },
        actionOrScene: { type: "string", description: "Scene action or environment description." },
        genre: {
          type: "string",
          enum: ["shonen_action", "dark_fantasy", "cyber_mecha", "celestial_mystic", "neo_tokyo_noir"],
          default: "shonen_action"
        }
      },
      required: ["mascotId", "actionOrScene"]
    }
  },
  {
    name: "anime_firewall_sanitize",
    description: "Run the Anime Legal Firewall to detect and strip forbidden copyright franchise characters and studio trademarks.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Raw prompt to evaluate and sanitize." }
      },
      required: ["prompt"]
    }
  },
  {
    name: "anime_storyboard_create",
    description: "Compile a short synopsis into a timed 5-shot anime storyboard with camera directives and prompts.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Episode or short title." },
        mascotId: { type: "string", enum: ["akashi", "kage", "mira"] },
        scenario: { type: "string", description: "Core scenario or narrative premise." },
        genre: { type: "string", default: "shonen_action" },
        aspectRatio: { type: "string", enum: ["9:16", "16:9"], default: "9:16" }
      },
      required: ["title", "mascotId", "scenario"]
    }
  },
  {
    name: "anime_media_format",
    description: "Format a prompt into an engine-specific payload (Kling, Runway, Fal.ai Flux, Luma) with cost estimates.",
    inputSchema: {
      type: "object",
      properties: {
        engine: { type: "string", enum: ["kling", "runway_gen3", "fal_flux_anime", "luma_dream_machine"] },
        prompt: { type: "string", description: "Clean anime prompt." },
        aspectRatio: { type: "string", enum: ["9:16", "16:9"], default: "9:16" },
        durationSeconds: { type: "number", default: 5 },
        cameraMovement: { type: "string" }
      },
      required: ["engine", "prompt"]
    }
  }
];

export async function executeMcpTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case "anime_mascot_get": {
      const mascot = MASCOTS[args.mascotId];
      if (!mascot) throw new Error(`Unknown mascot: ${args.mascotId}`);
      return mascot;
    }
    case "anime_prompt_build": {
      return buildCharacterPrompt(args.mascotId, args.actionOrScene, args.genre);
    }
    case "anime_firewall_sanitize": {
      return AnimeLegalFirewall.sanitize(args.prompt);
    }
    case "anime_storyboard_create": {
      return StoryboardCompiler.compileShort({
        title: args.title,
        mascotId: args.mascotId,
        scenario: args.scenario,
        genre: args.genre as any,
        aspectRatio: args.aspectRatio as any
      });
    }
    case "anime_media_format": {
      return MediaEngineAdapter.format(args.engine, args.prompt, {
        aspectRatio: args.aspectRatio,
        durationSeconds: args.durationSeconds,
        cameraMovement: args.cameraMovement
      });
    }
    default:
      throw new Error(`Tool not found: ${name}`);
  }
}
