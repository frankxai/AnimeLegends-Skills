#!/usr/bin/env node
declare const process: any;
import { ANIME_MCP_TOOLS, executeMcpTool } from "./index.js";
import { MASCOTS, AnimeLegalFirewall, buildCharacterPrompt } from "@anime-legends/core";
import { StoryboardCompiler } from "@anime-legends/storyboard";
import { MediaEngineAdapter } from "@anime-legends/media";

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "help") {
  console.log(`
🎬 AnimeLegends Cockpit CLI & MCP Server
Usage:
  anime-legends mascot <akashi|kage|mira>
  anime-legends firewall "<prompt>"
  anime-legends prompt --mascot <akashi|kage|mira> --scene "<scene description>"
  anime-legends storyboard --title "<title>" --mascot <akashi|kage|mira> --scenario "<scenario>"
  anime-legends format --engine <kling|runway_gen3|fal_flux_anime|luma_dream_machine> --prompt "<prompt>"
  anime-legends mcp (Starts Stdio Model Context Protocol Server)
`);
  process.exit(0);
}

if (command === "mcp") {
  // Stdio JSON-RPC MCP Server
  process.stdin.setEncoding("utf8");
  let buffer = "";

  process.stdin.on("data", async (chunk: any) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const req = JSON.parse(line);
        if (req.method === "tools/list") {
          const res = {
            jsonrpc: "2.0",
            id: req.id,
            result: { tools: ANIME_MCP_TOOLS }
          };
          process.stdout.write(JSON.stringify(res) + "\n");
        } else if (req.method === "tools/call") {
          try {
            const data = await executeMcpTool(req.params.name, req.params.arguments || {});
            const res = {
              jsonrpc: "2.0",
              id: req.id,
              result: {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
              }
            };
            process.stdout.write(JSON.stringify(res) + "\n");
          } catch (toolErr: any) {
            const res = {
              jsonrpc: "2.0",
              id: req.id,
              error: { code: -32000, message: toolErr.message }
            };
            process.stdout.write(JSON.stringify(res) + "\n");
          }
        } else if (req.method === "initialize") {
          const res = {
            jsonrpc: "2.0",
            id: req.id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: { tools: {} },
              serverInfo: { name: "anime-legends-mcp", version: "0.1.0" }
            }
          };
          process.stdout.write(JSON.stringify(res) + "\n");
        }
      } catch (err: any) {
        // ignore malformed
      }
    }
  });
} else if (command === "mascot") {
  const mascotId = args[1]?.toLowerCase();
  const mascot = (MASCOTS as any)[mascotId];
  if (!mascot) {
    console.error(`Unknown mascot: ${mascotId}. Choose: akashi, kage, mira`);
    process.exit(1);
  }
  console.log(JSON.stringify(mascot, null, 2));
} else if (command === "firewall") {
  const prompt = args.slice(1).join(" ");
  if (!prompt) {
    console.error("Please provide a prompt to check.");
    process.exit(1);
  }
  const result = AnimeLegalFirewall.sanitize(prompt);
  console.log(JSON.stringify(result, null, 2));
} else if (command === "storyboard") {
  const title = args[args.indexOf("--title") + 1] || "Untitled Short";
  const mascot = (args[args.indexOf("--mascot") + 1] || "akashi") as any;
  const scenario = args[args.indexOf("--scenario") + 1] || "Battle encounter";
  const sb = StoryboardCompiler.compileShort({ title, mascotId: mascot, scenario });
  console.log(JSON.stringify(sb, null, 2));
} else if (command === "format") {
  const engine = (args[args.indexOf("--engine") + 1] || "kling") as any;
  const prompt = args[args.indexOf("--prompt") + 1] || "Akashi running across rooftops";
  const formatted = MediaEngineAdapter.format(engine, prompt);
  console.log(JSON.stringify(formatted, null, 2));
} else {
  console.error(`Unknown command: ${command}. Run anime-legends --help`);
  process.exit(1);
}
