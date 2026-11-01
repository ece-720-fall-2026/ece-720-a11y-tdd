import type { Locator } from "@playwright/test";
import { describe, hasName, hasRole, SHORT } from "../dom";
import { apgPatterns } from "../registry/apg";
import { PatternRun } from "../runner";

export interface BreadcrumbOptions {
  /** Expected step names, from the first step to the current page. */
  steps?: string[];
}

interface Step {
  text: string;
  link: boolean;
  current: string | null;
}

export async function checkBreadcrumb(nav: Locator, options: BreadcrumbOptions = {}, checks?: readonly string[]): Promise<PatternRun> {
  const run = new PatternRun(apgPatterns.breadcrumb, checks);
  await nav.first().waitFor({ state: "attached", timeout: SHORT * 5 });

  await run.check("landmark-and-name", async () => {
    if (!(await hasRole(nav, "navigation"))) return `${await describe(nav)} is not a navigation landmark; use <nav>.`;
    if (!(await hasName(nav))) return 'The navigation has no accessible name; add aria-label="Breadcrumb".';
  });

  const steps: Step[] = await nav.first().evaluate((root) => {
    const list = root.querySelector("ol");
    if (!list) return [];
    return Array.from(list.querySelectorAll(":scope > li")).map((li) => {
      const link = li.querySelector("a[href]");
      const marked = li.querySelector("[aria-current]") ?? (li.hasAttribute("aria-current") ? li : null);
      return { text: (li.textContent || "").trim().replace(/\s+/g, " "), link: link !== null, current: marked ? marked.getAttribute("aria-current") : null };
    });
  });

  await run.check("ordered-list", async () => {
    if (steps.length === 0) {
      const unordered = await nav.first().locator("ul > li").count();
      return unordered ? "The steps are in a <ul>; a breadcrumb trail is ordered, so use <ol>." : "The navigation has no <ol> with <li> steps.";
    }
    if (options.steps) {
      const ok = steps.length === options.steps.length && options.steps.every((s, i) => steps[i].text.includes(s));
      if (!ok) return `Steps are [${steps.map((s) => s.text).join(", ")}], expected [${options.steps.join(", ")}].`;
    }
  });
  if (steps.length === 0) {
    run.skipRemaining("Not checked because no ordered list of steps was found.");
    return run;
  }

  await run.check("earlier-steps-are-links", async () => {
    const notLinks = steps.slice(0, -1).filter((s) => !s.link);
    if (notLinks.length) return `Step(s) ${notLinks.map((s) => `"${s.text}"`).join(", ")} are not links; earlier steps must be <a href>.`;
  });

  await run.check("current-page", async () => {
    const last = steps[steps.length - 1];
    if (last.current !== "page") return last.current === null ? `The last step "${last.text}" has no aria-current="page".` : `The last step has aria-current="${last.current}"; use "page".`;
    const others = steps.slice(0, -1).filter((s) => s.current !== null && s.current !== "false");
    if (others.length) return `Earlier step(s) ${others.map((s) => `"${s.text}"`).join(", ")} also have aria-current.`;
  });
  return run;
}
