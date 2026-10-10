/**
 * @anime-legends/core
 * Canonical character invariants, aesthetic style tokens, and legal copyright firewall
 * for autonomous generative anime production.
 */
export interface MascotProfile {
    id: "akashi" | "kage" | "mira";
    name: string;
    title: string;
    archetype: string;
    visualInvariants: {
        hair: string;
        eyes: string;
        clothing: string;
        weaponOrProp: string;
        auraEffect: string;
        dominantPalette: string[];
    };
    promptAnchors: string[];
    negativeAnchors: string[];
    personalityTraits: string[];
}
export declare const MASCOTS: Record<string, MascotProfile>;
export declare const FORBIDDEN_FRANCHISE_CHARACTERS: string[];
export declare const FORBIDDEN_STUDIO_NAMES: string[];
export declare const REPLACEMENT_SAKUGA_TOKENS: string[];
export interface FirewallResult {
    originalPrompt: string;
    cleanPrompt: string;
    violationsFound: string[];
    wasModified: boolean;
    replacementsMade: Array<{
        original: string;
        replacement: string;
    }>;
}
export declare class AnimeLegalFirewall {
    static sanitize(prompt: string): FirewallResult;
    static isClean(prompt: string): boolean;
}
export type AnimeGenreStyle = "shonen_action" | "dark_fantasy" | "cyber_mecha" | "celestial_mystic" | "neo_tokyo_noir";
export interface StyleTokens {
    genre: AnimeGenreStyle;
    cameraDirectives: string[];
    lightingMood: string[];
    renderingModifiers: string[];
    negativePrompt: string;
}
export declare const STYLE_PRESETS: Record<AnimeGenreStyle, StyleTokens>;
export declare function buildCharacterPrompt(mascotId: "akashi" | "kage" | "mira", actionOrScene: string, style?: AnimeGenreStyle): {
    prompt: string;
    negativePrompt: string;
};
//# sourceMappingURL=index.d.ts.map