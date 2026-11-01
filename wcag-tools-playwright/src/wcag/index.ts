import type { Locator, Page } from "@playwright/test";
import { wcagCriteria, wcagSpec } from "../registry/wcag";
import { PatternRun } from "../runner";
import { formatViolations, runAxe, type AxeViolation } from "./axe";
import { reflowOverflow, textSpacingClipping, unfocusableClickables } from "./checks/layout";
import { tabWalk, type WalkResult } from "./checks/tab-walk";

const WALK_CRITERIA = ["no-keyboard-trap", "focus-visible", "focus-not-obscured", "focus-order"];

function isPage(target: Page | Locator): target is Page {
  return typeof (target as Page).goto === "function";
}

function list(header: string, items: string[]): string {
  const shown = items.slice(0, 5).map((i) => `  - ${i}`);
  if (items.length > 5) shown.push(`  ...and ${items.length - 5} more`);
  return [header, ...shown].join("\n");
}

/**
 * Checks the page (or only the subtree of a Locator) against the WCAG 2.2 AA criteria. Unlike the
 * APG checks, criteria are independent, so only the selected ones run.
 */
export async function checkWCAG(target: Page | Locator, checks?: readonly string[]): Promise<PatternRun> {
  const run = new PatternRun(wcagSpec, checks);
  const page = isPage(target) ? target : target.page();
  const scope = isPage(target) ? null : target;
  if (scope) await scope.first().waitFor({ state: "attached", timeout: 5_000 });

  const criteria = wcagCriteria.filter((c) => run.selected(c.id) && !(scope && c.pageOnly));
  let violations: AxeViolation[] = [];
  let axeError: string | null = null;
  try {
    violations = await runAxe(page, scope, [...new Set(criteria.flatMap((c) => c.axe))]);
  } catch (error) {
    axeError = `axe-core could not run on this page: ${(error instanceof Error ? error.message : String(error)).split("\n")[0]}`;
  }

  let walk: WalkResult | null = null;
  if (criteria.some((c) => WALK_CRITERIA.includes(c.id))) walk = await tabWalk(page, scope);

  for (const c of wcagCriteria) {
    if (!run.selected(c.id)) continue;
    if (scope && c.pageOnly) {
      await run.check(c.id, async () => `"${c.id}" applies to a whole page; call it on the page: await expect(page).toBeWCAGCompliant(["${c.id}"]).`);
      continue;
    }
    await run.check(c.id, async () => {
      const problems: string[] = [];
      if (c.axe.length && axeError) problems.push(axeError);
      problems.push(...formatViolations(violations.filter((v) => c.axe.includes(v.id))));
      const own = await ownCheck(c.id, page, scope, walk);
      if (own) problems.push(own);
      return problems.join("\n");
    });
  }
  return run;
}

async function ownCheck(id: string, page: Page, scope: Locator | null, walk: WalkResult | null): Promise<string | void> {
  switch (id) {
    case "reflow":
      return reflowOverflow(page);
    case "text-spacing":
      return textSpacingClipping(page, scope);
    case "keyboard":
      return unfocusableClickables(page, scope);
    case "no-keyboard-trap":
      if (walk && !walk.reachedEnd) return walk.stuck;
      return;
    case "focus-visible": {
      const missing = (walk?.steps ?? []).filter((s) => s.shown && !s.indicator).map((s) => s.desc);
      if (missing.length) return list(`${missing.length} element(s) show no visible change when focused with the keyboard:`, missing);
      return;
    }
    case "focus-not-obscured": {
      const covered = (walk?.steps ?? []).filter((s) => s.shown && s.obscured).map((s) => s.desc);
      if (covered.length) return list(`${covered.length} element(s) are completely covered by other content when focused:`, covered);
      return;
    }
    case "focus-order": {
      const hidden = (walk?.steps ?? []).filter((s) => !s.shown).map((s) => s.desc);
      if (hidden.length) return list(`${hidden.length} element(s) receive focus while invisible (hide closed menus and panels with hidden or display: none):`, hidden);
      return;
    }
    case "headings": {
      if (scope) return;
      const h1 = await page.getByRole("heading", { level: 1 }).count();
      if (h1 !== 1) return `The page has ${h1} level-1 headings; use exactly one <h1> (the main title).`;
      return;
    }
    case "landmarks": {
      if (scope) return;
      const missing: string[] = [];
      for (const [role, tag] of [["banner", "<header>"], ["navigation", "<nav>"], ["main", "<main>"], ["contentinfo", "<footer>"]] as const) {
        if ((await page.getByRole(role).count()) === 0) missing.push(`${role} (${tag})`);
      }
      if (missing.length) return `Missing landmark(s): ${missing.join(", ")}. A <header> or <footer> only counts when it is not inside <main>, <article> or <section>.`;
      return;
    }
  }
}
