import type { Locator } from "@playwright/test";
import { describe, describeFocus, hasName, hasRole, poll, SHORT } from "../dom";
import { apgPatterns } from "../registry/apg";
import { PatternRun } from "../runner";

export interface NavigationOptions {
  /** Expected link names, in order (each must be contained in a link's name). */
  links?: string[];
  /** Name of the link to the current page, which must have `aria-current="page"`. */
  current?: string;
}

export async function checkNavigation(nav: Locator, options: NavigationOptions = {}, checks?: readonly string[]): Promise<PatternRun> {
  const run = new PatternRun(apgPatterns.navigation, checks);
  const page = nav.page();
  await nav.first().waitFor({ state: "attached", timeout: SHORT * 5 });
  const root = nav.first();

  await run.check("landmark-and-name", async () => {
    if (!(await hasRole(nav, "navigation"))) return `${await describe(nav)} is not a navigation landmark; use <nav>.`;
    const navs = await page.getByRole("navigation").count();
    if (navs > 1 && !(await hasName(nav))) return `The page has ${navs} navigation landmarks and this one has no accessible name; add aria-label (e.g. "Main").`;
  });

  const links = root.locator("a[href]");
  const visibleLinks = await links.evaluateAll((els) => els.map((el, i) => ({ i, shown: el.getBoundingClientRect().width > 0 && el.checkVisibility({ checkVisibilityCSS: true } as CheckVisibilityOptions) })).filter((l) => l.shown).map((l) => l.i));
  const names = await links.evaluateAll((els) => els.map((el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ")));

  await run.check("links", async () => {
    if (names.length === 0) {
      const fake = await root.locator("button, [onclick], [role=button], [role=menuitem]").count();
      return fake ? `The navigation has no <a href> links, but ${fake} button-like element(s); navigation items must be links.` : "The navigation contains no <a href> links.";
    }
    if (options.links) {
      const missing = options.links.filter((name) => !names.some((n) => n.includes(name)));
      if (missing.length) return `No link named ${missing.map((m) => `"${m}"`).join(", ")}; links are [${names.join(", ")}].`;
      const order = options.links.map((name) => names.findIndex((n) => n.includes(name)));
      if (order.some((v, i) => i > 0 && v < order[i - 1])) return `Links are in the order [${names.join(", ")}], expected [${options.links.join(", ")}].`;
    }
  });

  await run.check("tab-order", async () => {
    if (visibleLinks.length === 0) return "No visible links to tab through.";
    const negative = await links.evaluateAll((els) => els.filter((el) => (el as HTMLElement).tabIndex < 0).map((el) => (el.textContent || "").trim()));
    if (negative.length) return `Link(s) ${negative.map((n) => `"${n}"`).join(", ")} have tabindex="-1" and can't be reached with Tab.`;
    const focusedLink = () => links.evaluateAll((els) => els.indexOf(document.activeElement as HTMLAnchorElement));
    await links.nth(visibleLinks[0]).focus({ timeout: SHORT });
    for (const expected of visibleLinks.slice(1)) {
      let reached = false;
      for (let presses = 0; presses < 4 && !reached; presses++) {
        await page.keyboard.press("Tab");
        const index = await poll(focusedLink, (i) => i >= 0, 200);
        if (index === expected) reached = true;
        else if (index > expected) return `Tab skipped from an earlier link to "${names[index]}"; expected "${names[expected]}" next.`;
        else if (index < 0 && !(await root.evaluate((el) => el.contains(document.activeElement)))) return `Tab left the navigation (focus on ${await describeFocus(page)}) before reaching "${names[expected]}".`;
      }
      if (!reached) return `Tab did not reach the link "${names[expected]}".`;
    }
  });

  await run.check("no-menu-roles", async () => {
    const roles = await root.evaluate((el) => {
      const own = el.getAttribute("role");
      const inner = Array.from(el.querySelectorAll("[role=menu], [role=menubar], [role=menuitem]")).map((m) => m.getAttribute("role"));
      return [...(own && /^menu/.test(own) ? [own] : []), ...inner];
    });
    if (roles.length) return `Found role(s) ${[...new Set(roles)].map((r) => `"${r}"`).join(", ")}; site navigation should be plain links, not an application menu.`;
  });

  const marked = await links.evaluateAll((els) => els.map((el, i) => ({ i, value: el.getAttribute("aria-current") })).filter((m) => m.value !== null && m.value !== "false"));
  if (options.current === undefined && marked.length === 0) {
    run.notApplicable("current-page", "No link is marked as the current page (pass `current` to require one).");
  } else {
    await run.check("current-page", async () => {
      if (marked.length > 1) return `${marked.length} links have aria-current; only the current page's link should.`;
      if (options.current !== undefined) {
        const index = names.findIndex((n) => n.includes(options.current!));
        if (index < 0) return `No link named "${options.current}".`;
        if (marked[0]?.i !== index) return `The link "${names[index]}" has no aria-current="page".`;
      }
      if (marked[0] && marked[0].value !== "page" && marked[0].value !== "true") return `aria-current="${marked[0].value}" is not valid for a page link; use "page".`;
    });
  }

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  return run;
}
