// Rebuilds results/summary.csv from every results/<setup>[--<label>]/ directory.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const resultsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../results");
const read = (dir, name) => {
  const p = path.join(resultsRoot, dir, name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};

const columns = [
  "setup",
  "label",
  "commit",
  "build_ok",
  "acas",
  "axe_violation_nodes",
  "axe_pass_nodes",
  "axe_incomplete_nodes",
  "axe_violated_rules",
  "eas",
  "eslint_elements",
  "eslint_elements_with_violations",
  "kas",
  "kb_manipulated",
  "kb_total",
  "kb_tab_stops",
  "kb_tab_stops_with_focus_indicator",
  "gen_tests",
  "gen_tests_role_queries",
  "gen_tests_aria_snapshots",
  "gen_tests_keyboard_steps",
];

const rows = [];
for (const dir of fs.readdirSync(resultsRoot).sort()) {
  if (!fs.statSync(path.join(resultsRoot, dir)).isDirectory()) continue;
  const axe = read(dir, "axe.json")?.summary;
  const es = read(dir, "eslint.json")?.summary;
  const kb = read(dir, "keyboard.json")?.summary;
  const tp = read(dir, "tests-profile.json");
  const meta = read(dir, "meta.json") ?? {};
  const [setup, label] = dir.split("--");
  rows.push({
    setup,
    label,
    commit: meta.commit?.slice(0, 7),
    build_ok: meta.buildOk,
    acas: axe?.acas,
    axe_violation_nodes: axe?.violationNodes,
    axe_pass_nodes: axe?.passNodes,
    axe_incomplete_nodes: axe?.incompleteNodes,
    axe_violated_rules: axe?.violatedRules?.join(" "),
    eas: es?.eas,
    eslint_elements: es?.elementsChecked,
    eslint_elements_with_violations: es?.elementsWithViolations,
    kas: kb?.kas,
    kb_manipulated: kb?.manipulated,
    kb_total: kb?.total,
    kb_tab_stops: kb?.tabStops,
    kb_tab_stops_with_focus_indicator: kb?.tabStopsWithFocusIndicator,
    gen_tests: tp?.tests,
    gen_tests_role_queries: tp && tp.counts.getByRole + tp.counts.getByLabel,
    gen_tests_aria_snapshots: tp?.counts.ariaSnapshot,
    gen_tests_keyboard_steps: tp && tp.counts.keyboardPress + tp.counts.toBeFocused,
  });
}

const cell = (v) => {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n");
fs.writeFileSync(path.join(resultsRoot, "summary.csv"), csv + "\n");
console.log(csv);
