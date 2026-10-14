/**
 * @anime-legends/core
 * Canonical character invariants, aesthetic style tokens, and legal copyright firewall
 * for autonomous generative anime production.
 */
export const MASCOTS = {
    akashi: {
        id: "akashi",
        name: "Akashi",
        title: "The Blazing Ronin",
        archetype: "Solar Guardian / Passionate Swordsman",
        visualInvariants: {
            hair: "Spiky crimson-red hair with subtle golden ember highlights",
            eyes: "Intense amber-gold eyes with sharp determined gaze",
            clothing: "Modern techwear haori over dark armored combat vest, crimson cord bindings",
            weaponOrProp: "Twin curved solar katanas with radiant orange heat blade edges",
            auraEffect: "Swirling phoenix flame sparks, heat distortion waves, rising embers",
            dominantPalette: ["#FF2A00", "#FF8C00", "#1A1A1A", "#FFFFFF"]
        },
        promptAnchors: [
            "Akashi, male anime warrior",
            "crimson spiky hair with golden ember tips",
            "amber gold eyes",
            "modern black haori jacket with red accents",
            "twin solar katanas",
            "flaming sword trail",
            "high-energy sakuga battle stance"
        ],
        negativeAnchors: [
            "blonde hair",
            "blue hair",
            "heavy medieval plate armor",
            "western sword",
            "peaceful passive expression"
        ],
        personalityTraits: ["Uncompromising loyalty", "Fiery intuition", "Direct action", "Refusal to yield"]
    },
    kage: {
        id: "kage",
        name: "Kage",
        title: "The Umbral Rogue",
        archetype: "Shadow Assassin / Cynical Tactician",
        visualInvariants: {
            hair: "Tousled jet-black hair falling slightly over one eye with subtle violet reflections",
            eyes: "Cold amethyst violet piercing eyes, assessing and analytical",
            clothing: "High-collar obsidian stealth coat, lightweight segmented gauntlets, silent boots",
            weaponOrProp: "Dual reverse-grip void daggers crackling with dark plasma",
            auraEffect: "Tendrils of smoky violet shadow, localized darkness warping, vanishing step mist",
            dominantPalette: ["#0D0B14", "#3D1E6D", "#795290", "#00F0FF"]
        },
        promptAnchors: [
            "Kage, male anime assassin",
            "jet black hair with subtle violet sheen",
            "piercing amethyst eyes",
            "high collar obsidian trenchcoat",
            "reverse grip void daggers",
            "smoky shadow tendrils",
            "dynamic stealth crouch",
            "high-contrast noir anime lighting"
        ],
        negativeAnchors: [
            "bright colorful armor",
            "smiling widely",
            "broadsword",
            "cluttered bulky gear"
        ],
        personalityTraits: ["Pragmatic realism", "Unseen intervention", "Stealth mastery", "Hidden heart of gold"]
    },
    mira: {
        id: "mira",
        name: "Mira",
        title: "The Celestial Priestess",
        archetype: "Astral Oracle / Reality Weaver",
        visualInvariants: {
            hair: "Flowing platinum-silver hair that floats slightly as if in low gravity",
            eyes: "Luminescent cyan starburst pupils with cosmic depth",
            clothing: "Flowing white and deep indigo celestial kimono with glowing constellation embroidery",
            weaponOrProp: "Floating astral catalyst ring displaying rotating geometric glyphs",
            auraEffect: "Starlight dust particles, glowing celestial mandalas, soft indigo radiance",
            dominantPalette: ["#FFFFFF", "#0A1128", "#00E5FF", "#B388FF"]
        },
        promptAnchors: [
            "Mira, female anime priestess",
            "flowing long silver white hair floating in air",
            "luminescent cyan starburst eyes",
            "celestial indigo and white kimono with glowing runes",
            "floating astral catalyst mandala",
            "cosmic starlight dust",
            "mystical ethereal aura",
            "majestic cinematic composition"
        ],
        negativeAnchors: [
            "dark messy hair",
            "aggressive angry grimace",
            "military camouflage",
            "rough mechanical weapons"
        ],
        personalityTraits: ["Transcendent calm", "Deep empathy", "Temporal pattern foresight", "Unwavering hope"]
    }
};
export const FORBIDDEN_FRANCHISE_CHARACTERS = [
    "naruto", "sasuke", "sakura", "kakashi", "itachi", "madara",
    "goku", "vegeta", "gohan", "piccolo", "trunks", "frieza",
    "luffy", "zoro", "sanji", "nami", "ace", "shanks",
    "gojo", "satoru gojo", "sukuna", "itadori", "megumi",
    "tanjiro", "nezuko", "zenitsu", "inosuke", "rengoku",
    "ichigo", "aizen", "rukia", "eren", "levi", "mikasa",
    "saitama", "genos", "deku", "bakugo", "todoroki", "all might"
];
export const FORBIDDEN_STUDIO_NAMES = [
    "studio ghibli", "ghibli", "ufotable", "mappa", "trigger",
    "studio trigger", "kyoto animation", "kyoani", "wit studio",
    "bones", "cloverworks", "madhouse", "toei"
];
export const REPLACEMENT_SAKUGA_TOKENS = [
    "high-octane sakuga anime sequence",
    "dynamic 2D anime keyframe animation",
    "hand-drawn cel-shaded anime aesthetic",
    "cinematic Japanese animation lighting",
    "dramatic depth of field",
    "premium anime feature film production quality"
];
export class AnimeLegalFirewall {
    static sanitize(prompt) {
        let clean = prompt;
        const violationsFound = [];
        const replacementsMade = [];
        for (const char of FORBIDDEN_FRANCHISE_CHARACTERS) {
            const rx = new RegExp(`\\b${char}\\b`, "gi");
            if (rx.test(clean)) {
                violationsFound.push(`Copyrighted Character: '${char}'`);
                clean = clean.replace(rx, "original anime protagonist");
                replacementsMade.push({ original: char, replacement: "original anime protagonist" });
            }
        }
        for (const studio of FORBIDDEN_STUDIO_NAMES) {
            const rx = new RegExp(`\\b${studio}\\b`, "gi");
            if (rx.test(clean)) {
                violationsFound.push(`Protected Studio Trademark: '${studio}'`);
                clean = clean.replace(rx, "cinematic sakuga animation");
                replacementsMade.push({ original: studio, replacement: "cinematic sakuga animation" });
            }
        }
        return {
            originalPrompt: prompt,
            cleanPrompt: clean.trim().replace(/\s{2,}/g, " "),
            violationsFound,
            wasModified: violationsFound.length > 0,
            replacementsMade
        };
    }
    static isClean(prompt) {
        const result = this.sanitize(prompt);
        return !result.wasModified;
    }
}
export const STYLE_PRESETS = {
    shonen_action: {
        genre: "shonen_action",
        cameraDirectives: ["extreme dynamic low angle", "impact frame distortion", "speed lines motion blur"],
        lightingMood: ["high-contrast solar rim lighting", "dramatic chromatic aberration sparks"],
        renderingModifiers: ["crisp 2D anime linework", "vibrant saturated anime grading", "sakuga keyframe composition"],
        negativePrompt: "low quality, blurry, 3d render plastic look, western cartoon, flat lighting, extra fingers, text watermark"
    },
    dark_fantasy: {
        genre: "dark_fantasy",
        cameraDirectives: ["dutch tilt", "over-the-shoulder tension framing", "atmospheric wide shot"],
        lightingMood: ["moonlit volumetric fog", "deep obsidian shadows", "eerie bioluminescent glows"],
        renderingModifiers: ["detailed dark anime cel shading", "grit texture", "cinematic anamorphic bokeh"],
        negativePrompt: "cheerful pastel colors, flat cartoon, blurry face, bad hands, washed out contrast"
    },
    cyber_mecha: {
        genre: "cyber_mecha",
        cameraDirectives: ["wide angle mechanical perspective", "hud overlay framing", "rapid zoom motion blur"],
        lightingMood: ["neon holographic reflections", "hard metal specular highlights", "laser glare"],
        renderingModifiers: ["precision anime linework", "cyberpunk anime aesthetic", "detailed mechanical joints"],
        negativePrompt: "organic mush, low resolution, simple flat drawing, missing limbs, oversaturated noise"
    },
    celestial_mystic: {
        genre: "celestial_mystic",
        cameraDirectives: ["floating zero-g camera", "majestic centered symmetry", "ethereal high angle"],
        lightingMood: ["soft celestial glow", "prismatic starlight refraction", "nebula ambient backlight"],
        renderingModifiers: ["delicate ethereal linework", "iridescent gradients", "starlight particle simulation"],
        negativePrompt: "harsh industrial clutter, mud textures, jagged aggressive linework, bad proportions"
    },
    neo_tokyo_noir: {
        genre: "neo_tokyo_noir",
        cameraDirectives: ["ground-level street reflection shot", "cinematic 2.39:1 aspect ratio framing", "shallow depth of field"],
        lightingMood: ["wet asphalt reflections", "flickering neon sign backlighting", "rain streak lens flares"],
        renderingModifiers: ["moody cel shading", "film grain anime aesthetic", "rich ink outlines"],
        negativePrompt: "bright sunlight, cartoonish faces, amateur sketch, low quality, artifacts"
    }
};
export function buildCharacterPrompt(mascotId, actionOrScene, style = "shonen_action") {
    const mascot = MASCOTS[mascotId];
    if (!mascot) {
        throw new Error(`Unknown mascot ID: ${mascotId}`);
    }
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.shonen_action;
    const promptParts = [
        mascot.promptAnchors.join(", "),
        actionOrScene,
        preset.cameraDirectives[0],
        preset.lightingMood[0],
        preset.renderingModifiers.join(", ")
    ];
    const rawPrompt = promptParts.join(", ");
    const sanitized = AnimeLegalFirewall.sanitize(rawPrompt);
    return {
        prompt: sanitized.cleanPrompt,
        negativePrompt: `${preset.negativePrompt}, ${mascot.negativeAnchors.join(", ")}`
    };
}
