import type { Locator, Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface AxeNode {
  target: string;
  html: string;
  summary: string;
}

export interface AxeViolation {
  id: string;
  help: string;
  nodes: AxeNode[];
}

let source: string | undefined;

/** The bundled axe-core build (dist/vendor), or the installed package when running from source. */
function axeSource(): string {
  if (source) return source;
  const candidates = [path.join(__dirname, "..", "vendor", "axe.min.js")];
  try {
    candidates.push(require.resolve("axe-core/axe.min.js"));
  } catch {
    // Not installed: only the bundled copy can be used.
  }
  const file = candidates.find((f) => existsSync(f));
  if (!file) throw new Error("The bundled axe-core script is missing; rebuild @wcag-tools/playwright.");
  source = readFileSync(file, "utf8");
  return source;
}

/** Runs the given axe-core rules on the page, or only inside `scope`, and returns the violations. */
export async function runAxe(page: Page, scope: Locator | null, rules: string[]): Promise<AxeViolation[]> {
  if (rules.length === 0) return [];
  const loaded = await page.evaluate(() => typeof (window as unknown as { axe?: unknown }).axe !== "undefined");
  if (!loaded) await page.evaluate(axeSource());
  const options = { runOnly: { type: "rule", values: rules }, resultTypes: ["violations"] };
  const run = (context: Element, opts: typeof options) => {
    type Raw = { id: string; help: string; nodes: Array<{ target: unknown[]; html: string; failureSummary?: string }> };
    const axe = (window as unknown as { axe: { run: (c: Element | Document, o: unknown) => Promise<{ violations: Raw[] }> } }).axe;
    return axe.run(context === document.documentElement ? document : context, opts).then((r) => r.violations.map((v) => ({
      id: v.id,
      help: v.help,
      nodes: v.nodes.map((n) => ({
        target: n.target.map((t) => (Array.isArray(t) ? t.join(" >>> ") : String(t))).join(" "),
        html: n.html,
        summary: n.failureSummary ?? "",
      })),
    })));
  };
  return (scope ?? page.locator(":root")).first().evaluate(run, options);
}

/** Formats violations for a failure message: one block per rule, at most five elements each. */
export function formatViolations(violations: AxeViolation[]): string[] {
  return violations.map((v) => {
    const lines = [`axe ${v.id}: ${v.help} (${v.nodes.length} element${v.nodes.length === 1 ? "" : "s"})`];
    for (const node of v.nodes.slice(0, 5)) {
      const reason = node.summary.split("\n").map((l) => l.trim()).filter((l) => l && !/^Fix (any|all) of the following:?$/.test(l))[0];
      lines.push(`  - ${node.target}: ${truncate(node.html, 100)}${reason ? `\n    ${reason}` : ""}`);
    }
    if (v.nodes.length > 5) lines.push(`  ...and ${v.nodes.length - 5} more`);
    return lines.join("\n");
  });
}

export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
