import AxeBuilder from "@axe-core/playwright";
import { test, type Page } from "@playwright/test";
import {
  bodyText,
  clickAddToCart,
  clickSize,
  gotoProduct,
  writeResult,
} from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type AxeRun = Awaited<ReturnType<AxeBuilder["analyze"]>>;
type NodeRecord = { rule: string; impact: string | null; target: string; state: string };

async function analyze(page: Page) {
  // @axe-core/playwright may resolve a newer playwright-core; the Page API it uses is identical.
  const axePage = page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"];
  return new AxeBuilder({ page: axePage }).withTags(TAGS).exclude("nextjs-portal").analyze();
}

function nodes(run: AxeRun, kind: "violations" | "passes" | "incomplete", state: string) {
  return run[kind].flatMap((rule) =>
    rule.nodes.map<NodeRecord>((n) => ({
      rule: rule.id,
      impact: n.impact ?? rule.impact ?? null,
      target: n.target.join(" "),
      state,
    })),
  );
}

test("axe-core runtime scan across widget states", async ({ page }) => {
  await gotoProduct(page);
  const states: Record<string, { reached: boolean; run?: AxeRun }> = {};

  states.initial = { reached: true, run: await analyze(page) };

  const errorReached = await clickAddToCart(page);
  await page.waitForTimeout(300);
  states.sizeError = {
    reached: errorReached && /please select a size/i.test(await bodyText(page)),
  };
  if (errorReached) states.sizeError.run = await analyze(page);

  const sizeReached = await clickSize(page, "9");
  await page.waitForTimeout(300);
  states.sizeSelected = { reached: sizeReached };
  if (sizeReached) states.sizeSelected.run = await analyze(page);

  await clickAddToCart(page);
  await page.waitForTimeout(300);
  states.confirmation = { reached: /added .*to cart/i.test(await bodyText(page)) };
  if (states.confirmation.reached) states.confirmation.run = await analyze(page);

  // A node counts once per rule across all states; a violation in any state wins.
  const key = (n: NodeRecord) => `${n.rule}|${n.target}`;
  const violations = new Map<string, NodeRecord>();
  const passes = new Map<string, NodeRecord>();
  const incomplete = new Map<string, NodeRecord>();
  for (const [state, { run }] of Object.entries(states)) {
    if (!run) continue;
    for (const n of nodes(run, "violations", state)) violations.set(key(n), n);
    for (const n of nodes(run, "passes", state)) passes.set(key(n), n);
    for (const n of nodes(run, "incomplete", state)) incomplete.set(key(n), n);
  }
  for (const k of violations.keys()) passes.delete(k);
  for (const k of [...violations.keys(), ...passes.keys()]) incomplete.delete(k);

  const v = violations.size;
  const p = passes.size;
  const violatedRules = [...new Set([...violations.values()].map((n) => n.rule))];

  writeResult("axe.json", {
    tags: TAGS,
    statesReached: Object.fromEntries(
      Object.entries(states).map(([s, { reached }]) => [s, reached]),
    ),
    summary: {
      violationNodes: v,
      passNodes: p,
      incompleteNodes: incomplete.size,
      violatedRules,
      // Incomplete nodes need manual review before being moved into passes/violations.
      acas: v + p === 0 ? null : Number(((p / (v + p)) * 100).toFixed(2)),
    },
    violations: [...violations.values()],
    incomplete: [...incomplete.values()],
    passes: [...passes.values()],
    perState: Object.fromEntries(
      Object.entries(states).map(([s, { run }]) => [
        s,
        run && {
          violations: run.violations.map((r) => ({
            id: r.id,
            impact: r.impact,
            help: r.help,
            nodes: r.nodes.map((n) => n.target.join(" ")),
          })),
          incomplete: run.incomplete.map((r) => ({
            id: r.id,
            help: r.help,
            nodes: r.nodes.map((n) => n.target.join(" ")),
          })),
        },
      ]),
    ),
  });
});
