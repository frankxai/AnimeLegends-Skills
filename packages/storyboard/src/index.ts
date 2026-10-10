import {
  MASCOTS,
  AnimeLegalFirewall,
  buildCharacterPrompt,
  AnimeGenreStyle,
  STYLE_PRESETS
} from "@anime-legends/core";

export type CameraAngle =
  | "extreme_close_up"
  | "close_up"
  | "medium_shot"
  | "full_body"
  | "wide_establishing"
  | "dutch_angle"
  | "low_angle_hero"
  | "over_the_shoulder"
  | "whip_pan"
  | "tracking_shot";

export const CAMERA_DIRECTIVES: Record<CameraAngle, string> = {
  extreme_close_up: "macro eye zoom, intense emotional focus, micro expressions",
  close_up: "tight bust shot, face clear and sharp, cinematic bokeh background",
  medium_shot: "waist-up combat stance, weapon primed, balanced anime framing",
  full_body: "head to toe hero composition, full silhouette visible, grounded footing",
  wide_establishing: "vast landscape panoramic view, character in scale with environment",
  dutch_angle: "canted 35-degree tilted camera, dynamic tension, disorientation",
  low_angle_hero: "extreme upward perspective, majestic towering posture, dominant presence",
  over_the_shoulder: "cinematic OTS composition, anticipation framing, depth of field",
  whip_pan: "rapid directional camera blur, sudden transition, high velocity",
  tracking_shot: "following camera in motion, parallel trajectory, fluid action follow"
};

export interface StoryboardShot {
  shotNumber: number;
  timeStartSec: number;
  timeEndSec: number;
  durationSec: number;
  phase: "hook" | "buildup" | "climax" | "impact" | "resolution";
  camera: CameraAngle;
  action: string;
  dialogueOrVocalCue?: string;
  generationPrompt: string;
  negativePrompt: string;
}

export interface StoryboardManifest {
  title: string;
  mascotId: "akashi" | "kage" | "mira";
  genre: AnimeGenreStyle;
  totalDurationSec: number;
  aspectRatio: "9:16" | "16:9";
  shots: StoryboardShot[];
  createdAt: string;
}

export class StoryboardCompiler {
  static compileShort(params: {
    title: string;
    mascotId: "akashi" | "kage" | "mira";
    genre?: AnimeGenreStyle;
    scenario: string;
    aspectRatio?: "9:16" | "16:9";
  }): StoryboardManifest {
    const genre = params.genre || "shonen_action";
    const aspect = params.aspectRatio || "9:16";
    const mascot = MASCOTS[params.mascotId];
    if (!mascot) {
      throw new Error(`Unknown mascot ID: ${params.mascotId}`);
    }

    const shot1Prompt = buildCharacterPrompt(params.mascotId, `instant aggressive hook, ${params.scenario}`, genre);
    const shot2Prompt = buildCharacterPrompt(params.mascotId, `drawing weapon, preparing ultimate technique, intense buildup`, genre);
    const shot3Prompt = buildCharacterPrompt(params.mascotId, `unleashing signature elemental power, maximum sakuga velocity, energy explosion`, genre);
    const shot4Prompt = buildCharacterPrompt(params.mascotId, `impact frame black and white invert, frozen instant of clash`, genre);
    const shot5Prompt = buildCharacterPrompt(params.mascotId, `sheathing blade, smoke dissipating, confident smirk, starlight in eyes`, genre);

    const shots: StoryboardShot[] = [
      {
        shotNumber: 1,
        timeStartSec: 0,
        timeEndSec: 3,
        durationSec: 3,
        phase: "hook",
        camera: "extreme_close_up",
        action: `${mascot.name}'s eyes snap open with glowing light. Sudden danger detected.`,
        dialogueOrVocalCue: "Sharp breath intake / battle cry",
        generationPrompt: AnimeLegalFirewall.sanitize(`${shot1Prompt.prompt}, ${CAMERA_DIRECTIVES.extreme_close_up}`).cleanPrompt,
        negativePrompt: shot1Prompt.negativePrompt
      },
      {
        shotNumber: 2,
        timeStartSec: 3,
        timeEndSec: 15,
        durationSec: 12,
        phase: "buildup",
        camera: "low_angle_hero",
        action: `${mascot.name} assumes combat stance as ${mascot.visualInvariants.auraEffect} erupts.`,
        dialogueOrVocalCue: "'You're in my domain now.'",
        generationPrompt: AnimeLegalFirewall.sanitize(`${shot2Prompt.prompt}, ${CAMERA_DIRECTIVES.low_angle_hero}`).cleanPrompt,
        negativePrompt: shot2Prompt.negativePrompt
      },
      {
        shotNumber: 3,
        timeStartSec: 15,
        timeEndSec: 42,
        durationSec: 27,
        phase: "climax",
        camera: "tracking_shot",
        action: `High-velocity pursuit and strike with ${mascot.visualInvariants.weaponOrProp}.`,
        dialogueOrVocalCue: "Elemental roar / energy surge fx",
        generationPrompt: AnimeLegalFirewall.sanitize(`${shot3Prompt.prompt}, ${CAMERA_DIRECTIVES.tracking_shot}`).cleanPrompt,
        negativePrompt: shot3Prompt.negativePrompt
      },
      {
        shotNumber: 4,
        timeStartSec: 42,
        timeEndSec: 46,
        durationSec: 4,
        phase: "impact",
        camera: "dutch_angle",
        action: "Critical strike impact frame. Monochromatic energy burst.",
        dialogueOrVocalCue: "Explosion shockwave",
        generationPrompt: AnimeLegalFirewall.sanitize(`${shot4Prompt.prompt}, ${CAMERA_DIRECTIVES.dutch_angle}`).cleanPrompt,
        negativePrompt: shot4Prompt.negativePrompt
      },
      {
        shotNumber: 5,
        timeStartSec: 46,
        timeEndSec: 60,
        durationSec: 14,
        phase: "resolution",
        camera: "medium_shot",
        action: `${mascot.name} stands victorious against the fading embers. Title card overlay.`,
        dialogueOrVocalCue: "AnimeLegends call to action",
        generationPrompt: AnimeLegalFirewall.sanitize(`${shot5Prompt.prompt}, ${CAMERA_DIRECTIVES.medium_shot}`).cleanPrompt,
        negativePrompt: shot5Prompt.negativePrompt
      }
    ];

    return {
      title: params.title,
      mascotId: params.mascotId,
      genre,
      totalDurationSec: 60,
      aspectRatio: aspect,
      shots,
      createdAt: new Date().toISOString()
    };
  }
}
