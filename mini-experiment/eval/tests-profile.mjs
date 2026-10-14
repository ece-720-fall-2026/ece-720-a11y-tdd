// Usage: node tests-profile.mjs <worktree> <resultsDir>
// Counts which kinds of assertions the generated tests/ contain, to check
// whether accessibility requirements actually made it into the Red-phase tests.
import fs from "node:fs";
import path from "node:path";

const [worktree, outDir] = process.argv.slice(2).map((p) => path.resolve(p));
const testsDir = path.join(worktree, "tests");

const patterns = {
  getByRole: /getByRole\(/g,
  getByLabel: /getByLabel\(/g,
  ariaSnapshot: /toMatchAriaSnapshot\(/g,
  ariaAttribute: /aria-[a-z]+/g,
  toBeFocused: /toBeFocused\(/g,
  keyboardPress: /keyboard\.(press|type)\(/g,
  accessibleName: /toHaveAccessibleName\(|toHaveAccessibleDescription\(/g,
  cssOrTestIdSelector: /locator\(\s*['"`][.#[]|getByTestId\(/g,
  getByText: /getByText\(/g,
};

const files = fs.existsSync(testsDir)
  ? fs.readdirSync(testsDir, { recursive: true }).filter((f) => /\.(t|j)sx?$/.test(String(f)))
  : [];
const counts = Object.fromEntries(Object.keys(patterns).map((k) => [k, 0]));
let tests = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(testsDir, String(f)), "utf8");
  tests += (src.match(/\btest\(\s*['"`]/g) ?? []).length;
  for (const [k, re] of Object.entries(patterns)) counts[k] += (src.match(re) ?? []).length;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "tests-profile.json"),
  JSON.stringify({ files: files.map(String), tests, counts }, null, 2) + "\n",
);
