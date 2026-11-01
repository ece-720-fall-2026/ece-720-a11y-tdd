import type { Locator } from "@playwright/test";
import { attr, byIdRefs, isShown, poll, SHORT, textOf } from "../dom";
import { apgPatterns } from "../registry/apg";
import { PatternRun } from "../runner";

export interface AccordionOptions {
  /** Expected header (question) names, in display order. */
  items?: string[];
}

export async function checkAccordion(container: Locator, options: AccordionOptions = {}, checks?: readonly string[]): Promise<PatternRun> {
  const run = new PatternRun(apgPatterns.accordion, checks);
  const page = container.page();
  await container.first().waitFor({ state: "attached", timeout: SHORT * 5 });

  const inHeading = container.first().locator(":is(h1, h2, h3, h4, h5, h6, [role=heading]) :is(button, [role=button])");
  const expandable = container.first().locator(":is(button, [role=button])[aria-expanded]");
  const headed = await inHeading.count();
  const buttons = headed > 0 ? inHeading : expandable;

  await run.check("header-buttons", async () => {
    if (headed === 0) {
      const anyButtons = await expandable.count();
      const summaries = await container.first().locator("summary").count();
      if (summaries) return `Found ${summaries} <summary> element(s): <details>/<summary> is the Disclosure pattern; an accordion header is a <button> inside a heading.`;
      return anyButtons ? `Found ${anyButtons} expandable button(s), but none is inside a heading (h1-h6).` : "No header button inside a heading was found in the container.";
    }
    if (options.items) {
      const names = await buttons.evaluateAll((els) => els.map((el) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ")));
      if (names.length !== options.items.length || !options.items.every((e, i) => names[i].includes(e))) return `Headers are [${names.join(", ")}], expected [${options.items.join(", ")}].`;
    }
  });
  const count = await buttons.count();
  if (count === 0) {
    run.skipRemaining("Not checked because no accordion header buttons were found.");
    return run;
  }

  const panelOf = async (i: number) => byIdRefs(page, await attr(buttons.nth(i), "aria-controls"));
  const expanded = async (i: number) => (await attr(buttons.nth(i), "aria-expanded")) === "true";
  const original: boolean[] = [];
  for (let i = 0; i < count; i++) original.push(await expanded(i));

  await run.check("controls-panel", async () => {
    for (let i = 0; i < count; i++) {
      const panel = await panelOf(i);
      if (!panel) return `Header "${await textOf(buttons.nth(i))}" has no aria-controls pointing at its panel.`;
      if ((await panel.count()) === 0) return `The aria-controls of header "${await textOf(buttons.nth(i))}" refers to an id that is not in the page; keep the panel in the DOM (use hidden).`;
    }
  });

  await run.check("expanded-state", async () => {
    for (let i = 0; i < count; i++) {
      const value = await attr(buttons.nth(i), "aria-expanded");
      const name = await textOf(buttons.nth(i));
      if (value !== "true" && value !== "false") return `Header "${name}" has ${value === null ? "no aria-expanded" : `aria-expanded="${value}"`}; it must be "true" or "false".`;
      const panel = await panelOf(i);
      if (panel && (await panel.count()) && value === "true" && !(await isShown(panel))) return `Header "${name}" has aria-expanded="true" but its panel is hidden.`;
    }
  });

  await run.check("collapsed-hidden", async () => {
    for (let i = 0; i < count; i++) {
      if (await expanded(i)) continue;
      const panel = await panelOf(i);
      if (panel && (await isShown(panel))) return `Header "${await textOf(buttons.nth(i))}" is collapsed but its panel is shown.`;
    }
  }, ["controls-panel"]);

  await run.check("toggles-with-keyboard", async () => {
    const button = buttons.first();
    const name = await textOf(button);
    for (const key of ["Enter", " "]) {
      const before = await expanded(0);
      await button.focus({ timeout: SHORT });
      await page.keyboard.press(key);
      const after = await poll(() => expanded(0), (v) => v !== before, 500);
      const label = key === " " ? "Space" : key;
      if (after === before) return `${label} on header "${name}" did not change aria-expanded (still "${before}").`;
      const panel = await panelOf(0);
      if (panel && (await panel.count())) {
        const shown = await poll(() => isShown(panel), (v) => v === after, 500);
        if (shown !== after) return `${label} set aria-expanded="${after}" on header "${name}", but the panel is ${shown ? "shown" : "hidden"}.`;
      }
    }
  });

  await run.check("tab-order", async () => {
    const unreachable = await buttons.evaluateAll((els) => els.filter((el) => (el as HTMLElement).tabIndex < 0 || (el as HTMLButtonElement).disabled).map((el) => (el.textContent || "").trim()));
    if (unreachable.length) return `Header button(s) ${unreachable.map((n) => `"${n}"`).join(", ")} are not in the tab sequence.`;
  });

  for (let i = 0; i < count; i++) {
    if ((await expanded(i)) !== original[i]) await buttons.nth(i).click({ timeout: SHORT }).catch(() => {});
  }
  await buttons.first().blur().catch(() => {});
  return run;
}
