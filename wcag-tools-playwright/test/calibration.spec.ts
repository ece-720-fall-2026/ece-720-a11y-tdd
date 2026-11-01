import { test, type Locator, type Page } from "@playwright/test";
import { checkCombobox, checkModalDialog, checkRadioGroup, checkSpinbutton, checkTabs, checkTooltip, expect } from "../src";
import type { PatternRun } from "../src/runner";

/**
 * Runs every matcher against the mini-experiment calibration components, served by the stride
 * app on CALIBRATION_URL (see scripts/calibration.sh). CALIBRATION_VARIANT selects which one.
 */
const variant = process.env.CALIBRATION_VARIANT ?? "accessible";

interface Target {
  name: string;
  locate: (page: Page) => Locator;
  check: (locator: Locator) => Promise<PatternRun>;
  /** Check ids expected to fail on each variant. */
  failed: Record<string, string[]>;
}

const targets: Target[] = [
  {
    name: "size guide dialog",
    locate: (page) => page.getByRole("button", { name: "Size guide" }).or(page.getByText("Size guide", { exact: true })).first(),
    check: (l) => checkModalDialog(l, { name: "Size guide" }),
    failed: { accessible: [], inaccessible: ["opens-with-keyboard"] },
  },
  {
    name: "color dropdown",
    locate: (page) => page.getByRole("button", { name: /Color/ }).or(page.getByText("Color", { exact: true }).locator("xpath=following-sibling::div[1]/div[1]")).first(),
    check: (l) => checkCombobox(l, { options: ["Blue", "Black", "Grey"] }),
    // The accessible variant uses the older APG "collapsible listbox" (a button that opens a
    // focused listbox), which the current APG replaced with the select-only combobox.
    failed: {
      accessible: ["role-and-name", "opens-with-keyboard", "arrow-keys"],
      inaccessible: ["role-and-name", "collapsed-state", "opens-with-keyboard", "arrow-keys", "escape-closes"],
    },
  },
  {
    name: "details tabs",
    locate: (page) => page.getByRole("tablist").or(page.getByText("Details", { exact: true }).locator("..")).first(),
    check: (l) => checkTabs(l, { tabs: ["Details", "Reviews", "Shipping"] }),
    failed: { accessible: [], inaccessible: ["tablist-name", "tabs"] },
  },
  {
    name: "price tooltip",
    locate: (page) => page.getByRole("button", { name: "Price information" }).or(page.getByText("i", { exact: true })).first(),
    check: (l) => checkTooltip(l, "Price includes taxes"),
    // The accessible variant shows the tooltip 8px above the trigger, so the pointer leaves the
    // hover area on its way to the tooltip (WCAG 1.4.13).
    failed: { accessible: ["hoverable"], inaccessible: ["described-by"] },
  },
  {
    name: "size radios",
    locate: (page) => page.getByRole("group", { name: "Size" }).or(page.getByText("7", { exact: true }).locator("..")).first(),
    check: (l) => checkRadioGroup(l),
    failed: { accessible: [], inaccessible: ["role-and-name", "radios"] },
  },
  {
    name: "quantity",
    locate: (page) => page.getByRole("spinbutton", { name: "Quantity" }).or(page.locator("input:not([type])")).first(),
    check: (l) => checkSpinbutton(l, { min: 1, max: 5 }),
    // A native <input type="number"> has no Home/End behaviour.
    failed: { accessible: ["home-end"], inaccessible: ["role-and-name", "value-state"] },
  },
];

test.describe(`calibration: ${variant}`, () => {
  for (const target of targets) {
    test(target.name, async ({ page }) => {
      await page.goto("/product");
      const run = await target.check(target.locate(page));
      const failed = run.report.filter((r) => r.status === "failed").map((r) => r.id);
      expect(failed, run.message(target.name)).toEqual(target.failed[variant]);
    });
  }
});
