import { test, type Page } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkCombobox, checkModalDialog, checkRadioGroup, checkSpinbutton, checkTabs, checkTooltip, expect } from "../src";
import type { PatternRun } from "../src/runner";

const fixture = (name: string, query = "") => pathToFileURL(path.join(__dirname, "fixtures", `${name}.html`)).href + (query ? `?${query}` : "");

const failed = (run: PatternRun) => run.report.filter((r) => r.status === "failed").map((r) => r.id);

interface Case {
  query: string;
  failed: string[];
}

function suite(name: string, check: (page: Page) => Promise<PatternRun>, cases: Case[]) {
  test.describe(name, () => {
    for (const c of cases) {
      test(c.query || "conforming", async ({ page }) => {
        await page.goto(fixture(name, c.query));
        const run = await check(page);
        expect(failed(run), run.message(name)).toEqual(c.failed);
      });
    }
  });
}

suite("dialog", (page) => checkModalDialog(page.getByRole("button", { name: "Size guide" }), { name: "Size guide" }), [
  { query: "", failed: [] },
  { query: "native", failed: [] },
  { query: "break=mouse-only", failed: ["opens-with-keyboard"] },
  { query: "break=no-modal", failed: ["modal"] },
  { query: "break=no-focus-in", failed: ["focus-moves-in"] },
  { query: "break=no-trap", failed: ["tab-wraps"] },
  { query: "break=no-escape", failed: ["escape-closes"] },
  { query: "break=no-return", failed: ["focus-returns"] },
  { query: "native&break=no-modal", failed: ["modal", "escape-closes"] },
]);

test("dialog without a name fails role-and-name", async ({ page }) => {
  await page.goto(fixture("dialog", "break=no-name"));
  const run = await checkModalDialog(page.getByRole("button", { name: "Size guide" }));
  expect(failed(run)).toEqual(["role-and-name"]);
});

suite("combobox", (page) => checkCombobox(page.getByRole("combobox"), { options: ["Blue", "Black", "Grey"] }), [
  { query: "", failed: [] },
  { query: "native", failed: [] },
  { query: "break=no-name", failed: ["role-and-name"] },
  { query: "break=no-expanded", failed: ["collapsed-state", "opens-with-keyboard"] },
  { query: "break=focus-moves", failed: ["opens-with-keyboard", "arrow-keys", "escape-closes"] },
  { query: "break=no-activedescendant", failed: ["arrow-keys"] },
  { query: "break=no-selected", failed: ["selected-state"] },
  { query: "break=escape-selects", failed: ["escape-closes"] },
]);

suite("tabs", (page) => checkTabs(page.getByRole("tablist"), { tabs: ["Details", "Reviews", "Shipping"] }), [
  { query: "", failed: [] },
  { query: "manual", failed: [] },
  { query: "break=no-name", failed: ["tablist-name"] },
  { query: "break=no-panel-label", failed: ["panels"] },
  { query: "break=no-roving", failed: ["single-tab-stop"] },
  { query: "break=no-arrows", failed: ["arrow-keys", "activation"] },
  { query: "break=no-wrap", failed: ["arrow-keys"] },
]);

test("tabs activation option is enforced", async ({ page }) => {
  await page.goto(fixture("tabs", "manual"));
  expect(failed(await checkTabs(page.getByRole("tablist"), { activation: "automatic" }))).toEqual(["activation"]);
  await page.goto(fixture("tabs"));
  expect(failed(await checkTabs(page.getByRole("tablist"), { activation: "manual" }))).toEqual(["activation"]);
});

suite("tooltip", (page) => checkTooltip(page.getByRole("button", { name: "Price information" }), "Price includes taxes"), [
  { query: "", failed: [] },
  { query: "break=no-describedby", failed: ["described-by"] },
  { query: "break=no-focus", failed: ["shows-on-focus"] },
  { query: "break=no-escape", failed: ["escape-dismisses"] },
  { query: "break=not-hoverable", failed: ["hoverable"] },
]);

suite("radio", (page) => checkRadioGroup(page.getByRole("radiogroup").or(page.getByRole("group")), { radios: ["7", "8", "9", "10", "11"] }), [
  { query: "", failed: [] },
  { query: "native", failed: [] },
  { query: "break=no-aria-checked", failed: ["checked-state", "space-checks", "arrow-keys", "single-tab-stop"] },
  { query: "break=no-roving", failed: ["single-tab-stop"] },
  { query: "break=no-wrap", failed: ["arrow-keys"] },
  { query: "break=arrows-dont-check", failed: ["arrow-keys"] },
]);

suite("spinbutton", (page) => checkSpinbutton(page.getByRole("spinbutton"), { min: 1, max: 5 }), [
  { query: "", failed: [] },
  { query: "native", failed: ["home-end"] },
  { query: "break=no-bounds", failed: ["bounds"] },
  { query: "break=no-home-end", failed: ["home-end"] },
  { query: "break=no-valuenow-update", failed: ["arrow-keys", "home-end"] },
]);

test.describe("expect matchers", () => {
  test("pass on conforming fixtures", async ({ page }) => {
    await page.goto(fixture("dialog"));
    await expect(page.getByRole("button", { name: "Size guide" })).toOpenModalDialog({ name: "Size guide" });
    await page.goto(fixture("combobox"));
    await expect(page.getByRole("combobox", { name: "Color" })).toBeCombobox({ options: ["Blue", "Black", "Grey"] });
    await page.goto(fixture("tabs"));
    await expect(page.getByRole("tablist", { name: "Product information" })).toBeTabs({ activation: "automatic" });
    await page.goto(fixture("tooltip"));
    await expect(page.getByRole("button", { name: "Price information" })).toHaveTooltip("Price includes taxes");
    await page.goto(fixture("radio"));
    await expect(page.getByRole("radiogroup", { name: "Size" })).toBeRadioGroup();
    await page.goto(fixture("spinbutton"));
    await expect(page.getByRole("spinbutton", { name: "Quantity" })).toBeSpinbutton({ min: 1, max: 5 });
  });

  test("failure message lists the checklist with APG links", async ({ page }) => {
    await page.goto(fixture("dialog", "break=no-return"));
    let message = "";
    try {
      await expect(page.getByRole("button", { name: "Size guide" })).toOpenModalDialog();
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("does not follow the APG Modal Dialog pattern: 1 of 7 checks did not pass.");
    expect(message).toContain("✗ focus-returns");
    expect(message).toContain("https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboard_interaction");
    expect(message).toContain("✓ escape-closes");
  });

  test("matchers leave the widget as they found it", async ({ page }) => {
    await page.goto(fixture("combobox"));
    await expect(page.getByRole("combobox")).toBeCombobox();
    await expect(page.getByRole("combobox")).toHaveText("Blue");
    await expect(page.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    await page.goto(fixture("tabs"));
    await expect(page.getByRole("tablist")).toBeTabs();
    await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    await page.goto(fixture("spinbutton"));
    await expect(page.getByRole("spinbutton")).toBeSpinbutton();
    await expect(page.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "1");
    await page.goto(fixture("dialog"));
    await expect(page.getByRole("button", { name: "Size guide" })).toOpenModalDialog();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test(".not is rejected", async ({ page }) => {
    await page.goto(fixture("tabs"));
    await expect(expect(page.getByRole("tablist")).not.toBeTabs()).rejects.toThrow("is not supported");
  });
});
