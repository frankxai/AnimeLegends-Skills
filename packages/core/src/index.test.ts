import { test, describe } from "node:test";
import * as assert from "node:assert";
import { AnimeLegalFirewall, buildCharacterPrompt } from "./index.js";

describe("AnimeLegalFirewall", () => {
  test("isClean returns true for safe prompts", () => {
    assert.strictEqual(
      AnimeLegalFirewall.isClean("original anime protagonist fighting with swords in a city"),
      true
    );
  });

  test("isClean returns false for prompts with forbidden characters", () => {
    assert.strictEqual(AnimeLegalFirewall.isClean("naruto using rasengan"), false);
  });

  test("sanitize replaces forbidden characters with generic terms", () => {
    const result = AnimeLegalFirewall.sanitize("naruto and sasuke fighting in leaf village");
    assert.strictEqual(result.wasModified, true);
    assert.strictEqual(
      result.cleanPrompt,
      "original anime protagonist and original anime protagonist fighting in leaf village"
    );
    assert.deepStrictEqual(result.violationsFound, [
      "Copyrighted Character: 'naruto'",
      "Copyrighted Character: 'sasuke'"
    ]);
  });

  test("sanitize replaces forbidden studio names with generic terms", () => {
    const result = AnimeLegalFirewall.sanitize("beautiful background style of studio ghibli");
    assert.strictEqual(result.wasModified, true);
    assert.strictEqual(
      result.cleanPrompt,
      "beautiful background style of cinematic sakuga animation"
    );
    assert.deepStrictEqual(result.violationsFound, [
      "Protected Studio Trademark: 'studio ghibli'"
    ]);
  });
});

describe("buildCharacterPrompt", () => {
  test("builds correct prompt for akashi with default shonen_action style", () => {
    const result = buildCharacterPrompt("akashi", "running towards the enemy");

    // We expect the result to include akashi's prompt anchors, the action,
    // and shonen_action style tokens
    assert.ok(result.prompt.includes("Akashi, male anime warrior"));
    assert.ok(result.prompt.includes("running towards the enemy"));
    assert.ok(result.prompt.includes("extreme dynamic low angle"));

    // Check negative prompts
    assert.ok(result.negativePrompt.includes("low quality, blurry"));
    assert.ok(result.negativePrompt.includes("blonde hair")); // akashi's negative anchors
  });

  test("builds correct prompt for kage with dark_fantasy style", () => {
    const result = buildCharacterPrompt("kage", "hiding in shadows", "dark_fantasy");

    assert.ok(result.prompt.includes("Kage, male anime assassin"));
    assert.ok(result.prompt.includes("hiding in shadows"));
    assert.ok(result.prompt.includes("dutch tilt")); // dark_fantasy camera directive

    assert.ok(result.negativePrompt.includes("cheerful pastel colors"));
    assert.ok(result.negativePrompt.includes("bright colorful armor")); // kage's negative anchors
  });

  test("builds correct prompt for mira with celestial_mystic style", () => {
    const result = buildCharacterPrompt("mira", "casting a spell", "celestial_mystic");

    assert.ok(result.prompt.includes("Mira, female anime priestess"));
    assert.ok(result.prompt.includes("casting a spell"));
    assert.ok(result.prompt.includes("floating zero-g camera"));

    assert.ok(result.negativePrompt.includes("harsh industrial clutter"));
    assert.ok(result.negativePrompt.includes("dark messy hair"));
  });

  test("throws error for unknown mascot", () => {
    assert.throws(
      // @ts-ignore
      () => buildCharacterPrompt("unknown_mascot", "doing something"),
      { message: "Unknown mascot ID: unknown_mascot" }
    );
  });
});
