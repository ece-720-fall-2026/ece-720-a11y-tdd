// Regenerates, from the registry in src/registry (via dist/):
//   - src/generated/checks.ts: the check-id union type of each matcher,
//   - the `/** @docs <matcher> */` JSDoc blocks in src/index.ts,
//   - the matcher table in README.md.
// Run `pnpm run docs` (it builds before and after).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { apgPatterns } = require("../dist/registry/apg.js");
const { wcagSpec, statusSpec } = require("../dist/registry/wcag.js");
const { usage } = require("../dist/registry/usage.js");

const specs = [wcagSpec, statusSpec, ...Object.values(apgPatterns)];
const file = (path) => new URL(`../${path}`, import.meta.url);
const ids = (spec) => spec.checks.map((c) => `\`${c.id}\``).join(", ");

const types = specs.map((spec) => `export type ${spec.typeName}Check = ${spec.checks.map((c) => `"${c.id}"`).join(" | ")};`);
writeFileSync(file("src/generated/checks.ts"), `// Generated from src/registry by \`pnpm run docs\`. Do not edit.\n${types.join("\n")}\n`);

const indexPath = file("src/index.ts");
let index = readFileSync(indexPath, "utf8");
for (const spec of specs) {
  const u = usage[spec.matcher];
  const doc = [
    "  /**",
    `   * ${u.description}`,
    `   * Checks: ${ids(spec)}. A failure explains how to fix each failed check.`,
    `   * @example ${u.example}`,
    `   * @docs ${spec.matcher}`,
    "   */",
  ].join("\n");
  const block = new RegExp(`  /\\*\\*(?:(?!\\*/)[\\s\\S])*?@docs ${spec.matcher}\\b(?:(?!\\*/)[\\s\\S])*?\\*/`);
  if (!block.test(index)) throw new Error(`No @docs ${spec.matcher} block in src/index.ts`);
  index = index.replace(block, () => doc);
}
writeFileSync(indexPath, index);

const rows = specs.map((spec) => `| \`${spec.matcher}\` | ${usage[spec.matcher].description.replace(/\|/g, "\\|")} | ${ids(spec)} |`);
const table = ["| Matcher | Asserts | Checks |", "|---|---|---|", ...rows].join("\n");
const START = "<!-- matchers:start -->";
const END = "<!-- matchers:end -->";
const readmePath = file("README.md");
const readme = readFileSync(readmePath, "utf8");
const [before, rest] = readme.split(START);
writeFileSync(readmePath, `${before}${START}\n${table}\n${END}${rest.split(END)[1]}`);
