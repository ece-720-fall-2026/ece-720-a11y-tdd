import type { Locator } from "@playwright/test";
import { attr, byIdRefs, describe, describeFocus, hasName, hasRole, isFocused, isShown, poll, settle, SHORT, textOf } from "../dom";
import { PatternRun } from "../runner";

export interface TabsOptions {
  /** Expected tab names, in display order. */
  tabs?: string[];
  /**
   * `"automatic"`: a tab is activated when it receives focus (APG recommended).
   * `"manual"`: a focused tab is activated with Enter or Space.
   * Either passes when omitted.
   */
  activation?: "automatic" | "manual";
}

export async function checkTabs(tablist: Locator, options: TabsOptions = {}): Promise<PatternRun> {
  const run = new PatternRun("tabs");
  const page = tablist.page();
  await tablist.first().waitFor({ state: "attached", timeout: SHORT * 5 });
  const tabs = tablist.first().getByRole("tab");

  const selectedIndex = async () => {
    const states = await tabs.evaluateAll((els) => els.map((el) => el.getAttribute("aria-selected")));
    return states.indexOf("true");
  };
  const focusedIndex = () => tabs.evaluateAll((els) => (els as Element[]).indexOf(document.activeElement as Element));
  const pressAndWait = async (key: string, expected: number) => {
    await page.keyboard.press(key);
    return poll(focusedIndex, (i) => i === expected, 500);
  };

  await run.check("tablist-name", async () => {
    if (!(await hasRole(tablist, "tablist"))) return `${await describe(tablist)} does not have role tablist.`;
    if (!(await hasName(tablist))) return "The tablist has no accessible name; add aria-labelledby or aria-label.";
  });

  await run.check("tabs", async () => {
    const count = await tabs.count();
    if (count < 2) return `The tablist contains ${count} element(s) with role tab; expected at least 2.`;
    if (options.tabs) {
      const names = await tabs.evaluateAll((els) => els.map((el) => (el.getAttribute("aria-label") || el.textContent || "").trim()));
      if (names.join("|") !== options.tabs.join("|")) return `Tabs are [${names.join(", ")}], expected [${options.tabs.join(", ")}].`;
    }
  });
  if ((await tabs.count()) < 2) {
    run.skipRemaining("Not checked because the tablist has fewer than two tabs.");
    return run;
  }
  const count = await tabs.count();
  const original = await selectedIndex();

  await run.check("selected-state", async () => {
    const states = await tabs.evaluateAll((els) => els.map((el) => el.getAttribute("aria-selected")));
    const selected = states.filter((s) => s === "true").length;
    if (selected !== 1) return `${selected} tabs have aria-selected="true"; exactly one should.`;
    const missing = states.filter((s) => s !== "true" && s !== "false").length;
    if (missing) return `${missing} tab(s) have no aria-selected attribute; unselected tabs need aria-selected="false".`;
  });

  await run.check("panels", async () => {
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      const name = await textOf(tab);
      const panel = byIdRefs(page, await attr(tab, "aria-controls"));
      if (!panel || (await panel.count()) === 0) return `Tab "${name}" has no aria-controls pointing at its panel.`;
      if (!(await hasRole(panel, "tabpanel"))) return `The element controlled by tab "${name}" is ${await describe(panel)}, not a tabpanel.`;
      const shown = await isShown(panel);
      const tabId = await attr(tab, "id");
      const labelledBy = ((await attr(panel, "aria-labelledby")) ?? "").split(/\s+/);
      const labelled = (tabId !== null && labelledBy.includes(tabId)) || (shown && (await hasName(panel, name)));
      if (!labelled) return `The panel of tab "${name}" is not labelled by it; set aria-labelledby on the panel to the tab's id.`;
      if (i === original && !shown) return `The panel of the selected tab "${name}" is not shown.`;
      if (i !== original && shown) return `The panel of unselected tab "${name}" is shown.`;
    }
  }, ["selected-state"]);

  await run.check("single-tab-stop", async () => {
    const stops = await tabs.evaluateAll((els) => els.filter((el) => (el as HTMLElement).tabIndex >= 0).length);
    if (stops !== 1) return `${stops} tabs are in the tab sequence; only the selected tab should be (tabindex="-1" on the others).`;
    await tabs.nth(Math.max(original, 0)).focus({ timeout: SHORT });
    await page.keyboard.press("Tab");
    await settle(page);
    if ((await focusedIndex()) >= 0) return `Tab moved focus to another tab (${await describeFocus(page)}) instead of out of the tablist.`;
  }, ["selected-state"]);

  const vertical = (await attr(tablist, "aria-orientation")) === "vertical";
  const next = vertical ? "ArrowDown" : "ArrowRight";
  const previous = vertical ? "ArrowUp" : "ArrowLeft";
  const start = Math.max(original, 0);

  await run.check("arrow-keys", async () => {
    await tabs.nth(start).focus({ timeout: SHORT });
    const steps: Array<[string, number]> = [];
    for (let i = 1; i <= count; i++) steps.push([next, (start + i) % count]);
    steps.push([previous, (start + count - 1) % count]);
    for (const [key, expected] of steps) {
      if ((await pressAndWait(key, expected)) !== expected) {
        return `${key} moved focus to ${await describeFocus(page)}; expected tab ${expected + 1} of ${count}${expected === 0 || expected === count - 1 ? " (arrows wrap at the ends)" : ""}.`;
      }
    }
  }, ["selected-state"]);

  await run.check("activation", async () => {
    await tabs.nth(start).focus({ timeout: SHORT });
    const target = (start + 1) % count;
    if ((await pressAndWait(next, target)) !== target) return `${next} did not move focus to the next tab, so activation could not be tested.`;
    const followed = (await poll(selectedIndex, (i) => i === target, 500)) === target;
    if (followed) {
      if (options.activation === "manual") return "Selection followed focus, but manual activation was expected (Enter or Space activates).";
    } else {
      if (options.activation === "automatic") return "Selection did not follow focus, but automatic activation was expected.";
      await page.keyboard.press("Enter");
      if ((await poll(selectedIndex, (i) => i === target, 500)) !== target) {
        await page.keyboard.press(" ");
        if ((await poll(selectedIndex, (i) => i === target, 500)) !== target) return "The focused tab was not activated on focus, nor with Enter or Space.";
      }
    }
    const panel = byIdRefs(page, await attr(tabs.nth(target), "aria-controls"));
    if (panel && !(await poll(() => isShown(panel), Boolean, 500))) return "The activated tab's panel is not shown.";
  }, ["selected-state"]);

  if (original >= 0 && (await selectedIndex()) !== original) await tabs.nth(original).click({ timeout: SHORT }).catch(() => {});
  if (await isFocused(tabs.nth(Math.max(original, 0)))) await tabs.nth(Math.max(original, 0)).blur();
  return run;
}
