// Regenerates the checklist section of README.md from src/patterns.ts (via dist/).
// Run `pnpm build && pnpm run docs`.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { patterns } = require("../dist/patterns.js");
const anchors = { roles: "#roles_states_properties", keyboard: "#keyboard_interaction" };

const sections = Object.values(patterns).map((p) => {
  const rows = p.checks.map((c) => `| \`${c.id}\` | ${c.summary.replace(/\|/g, "\\|")} | [${c.section === "roles" ? "Roles" : "Keyboard"}](${p.url}${anchors[c.section]}) |`);
  return [`### \`${p.matcher}\`: [${p.name}](${p.url})`, "", "| Check | Requirement | APG section |", "|---|---|---|", ...rows].join("\n");
});

const START = "<!-- checklist:start -->";
const END = "<!-- checklist:end -->";
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const [before, rest] = readme.split(START);
const after = rest.split(END)[1];
writeFileSync(new URL("../README.md", import.meta.url), `${before}${START}\n${sections.join("\n\n")}\n${END}${after}`);
