// Usage: node eslint-score.mjs <worktree> <resultsDir>
// Runs eslint-plugin-jsx-a11y (strict) on the worktree's app/ and components/
// and computes EAS = elements with no violations / JSX elements checked.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@typescript-eslint/parser";
import { ESLint } from "eslint";
import { JSX_COMPONENT_MAP } from "./eslint.a11y.config.mjs";

const [worktree, outDir] = process.argv.slice(2).map((p) => path.resolve(p));
if (!worktree || !outDir) {
  console.error("Usage: node eslint-score.mjs <worktree> <resultsDir>");
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));

const eslint = new ESLint({
  cwd: worktree,
  overrideConfigFile: path.join(here, "eslint.a11y.config.mjs"),
  // Generated code must not be able to silence the checker.
  allowInlineConfig: false,
  errorOnUnmatchedPattern: false,
});
const results = await eslint.lintFiles(["app/**/*.{jsx,tsx}", "components/**/*.{jsx,tsx}"]);

function openingElements(code) {
  const ast = parse(code, { jsx: true, loc: true, range: true });
  const found = [];
  const walk = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "JSXOpeningElement") {
      const name = node.name.type === "JSXIdentifier" ? node.name.name : null;
      if (name && (/^[a-z]/.test(name) || name in JSX_COMPONENT_MAP)) {
        found.push({ name, loc: node.loc, range: node.range });
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "parent") continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") walk(value);
    }
  };
  walk(ast);
  return found;
}

const contains = (loc, line, column) =>
  (line > loc.start.line || (line === loc.start.line && column - 1 >= loc.start.column)) &&
  (line < loc.end.line || (line === loc.end.line && column - 1 <= loc.end.column));

let totalElements = 0;
let violatingElements = 0;
const files = [];
const ruleCounts = {};

for (const r of results) {
  const rel = path.relative(worktree, r.filePath);
  const elements = openingElements(fs.readFileSync(r.filePath, "utf8"));
  const flagged = new Set();
  const unmapped = [];
  for (const m of r.messages) {
    if (m.ruleId) ruleCounts[m.ruleId] = (ruleCounts[m.ruleId] ?? 0) + 1;
    const hits = elements.filter((e) => contains(e.loc, m.line, m.column));
    hits.sort((a, b) => a.range[1] - a.range[0] - (b.range[1] - b.range[0]));
    if (hits[0]) flagged.add(hits[0]);
    else unmapped.push(m);
  }
  totalElements += elements.length;
  violatingElements += flagged.size;
  files.push({
    file: rel,
    elements: elements.length,
    elementsWithViolations: flagged.size,
    messages: r.messages.map((m) => ({
      rule: m.ruleId,
      severity: m.severity,
      line: m.line,
      column: m.column,
      message: m.message,
    })),
    unmappedMessages: unmapped.length,
  });
}

const summary = {
  elementsChecked: totalElements,
  elementsWithViolations: violatingElements,
  messages: results.reduce((n, r) => n + r.messages.length, 0),
  ruleCounts,
  eas:
    totalElements === 0
      ? null
      : Number((((totalElements - violatingElements) / totalElements) * 100).toFixed(2)),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "eslint.json"), JSON.stringify({ summary, files }, null, 2) + "\n");
console.log(`EAS: ${summary.eas}% (${totalElements - violatingElements}/${totalElements} elements clean)`);
