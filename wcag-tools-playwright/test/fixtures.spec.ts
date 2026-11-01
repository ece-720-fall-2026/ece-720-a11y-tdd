import { test, type Page } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  checkAccordion, checkBreadcrumb, checkCarousel, checkCombobox, checkModalDialog, checkNavigation, checkRadioGroup,
  checkSpinbutton, checkStatus, checkTabs, checkToggleButton, checkTooltip, checkWCAG, expect,
} from "../src";
import type { PatternRun } from "../src/runner";

const fixture = (name: string, query = "") => pathToFileURL(path.join(__dirname, "fixtures", `${name}.html`)).href + (query ? `?${query}` : "");

const failed = (run: PatternRun) => run.report.filter((r) => r.status === "failed").map((r) => r.id);

interface Case {
  query: string;
  failed: string[];
}

function suite(name: string, check: (page: Page) => Promise<PatternRun>, cases: Case[], file = name) {
  test.describe(name, () => {
    for (const c of cases) {
      test(c.query || "conforming", async ({ page }) => {
        await page.goto(fixture(file, c.query));
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
  { query: "break=no-trap", failed: ["focus-trap"] },
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
  { query: "disabled", failed: [] },
  { query: "native&disabled", failed: [] },
  { query: "disabled&break=disabled-selectable", failed: ["disabled-options"] },
  { query: "break=no-name", failed: ["role-and-name"] },
  { query: "break=no-expanded", failed: ["collapsed-state", "opens-with-keyboard"] },
  { query: "break=focus-moves", failed: ["opens-with-keyboard", "arrow-keys", "escape-closes"] },
  { query: "break=no-activedescendant", failed: ["arrow-keys"] },
  { query: "break=no-selected", failed: ["selected-state"] },
  { query: "break=escape-selects", failed: ["escape-closes"] },
]);

test("combobox disabled option names are enforced", async ({ page }) => {
  await page.goto(fixture("combobox", "disabled&break=disabled-not-marked"));
  const run = await checkCombobox(page.getByRole("combobox"), { disabled: ["Grey"] });
  expect(failed(run), run.message("combobox")).toEqual(["disabled-options"]);
  await page.goto(fixture("combobox"));
  const none = await checkCombobox(page.getByRole("combobox"));
  expect(none.report.find((r) => r.id === "disabled-options")?.status).toBe("not-applicable");
  expect(none.passed).toBe(true);
});

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
  { query: "break=not-editable", failed: ["accepts-typing"] },
  { query: "break=ignores-typing", failed: ["accepts-typing"] },
  { query: "break=no-bounds", failed: ["bounds"] },
  { query: "break=no-home-end", failed: ["home-end"] },
  { query: "break=no-valuenow-update", failed: ["arrow-keys", "home-end", "accepts-typing"] },
]);

suite("accordion", (page) => checkAccordion(page.locator("#faq"), { items: ["Is it waterproof?", "How does it fit?", "Can I return it?"] }), [
  { query: "", failed: [] },
  { query: "details", failed: ["header-buttons"] },
  { query: "break=no-heading", failed: ["header-buttons"] },
  { query: "break=no-controls", failed: ["controls-panel"] },
  { query: "break=no-expanded", failed: ["expanded-state", "toggles-with-keyboard"] },
  { query: "break=shown-collapsed", failed: ["collapsed-hidden"] },
  { query: "break=mouse-only", failed: ["toggles-with-keyboard"] },
  { query: "break=not-tabbable", failed: ["tab-order"] },
]);

suite("breadcrumb", (page) => checkBreadcrumb(page.locator("#crumbs"), { steps: ["Shop", "Trail", "Trail Runner 2"] }), [
  { query: "", failed: [] },
  { query: "break=no-name", failed: ["landmark-and-name"] },
  { query: "break=div", failed: ["landmark-and-name"] },
  { query: "break=ul", failed: ["ordered-list"] },
  { query: "break=span-step", failed: ["earlier-steps-are-links"] },
  { query: "break=no-current", failed: ["current-page"] },
]);

suite("carousel", (page) => checkCarousel(page.locator("#carousel"), { slides: 3 }), [
  { query: "", failed: [] },
  { query: "break=no-roledescription", failed: ["container"] },
  { query: "break=no-slide-name", failed: ["slides"] },
  { query: "break=all-visible", failed: ["one-visible"] },
  { query: "break=unnamed-controls", failed: ["controls"] },
  { query: "break=no-wrap", failed: ["wraps"] },
  { query: "break=no-live", failed: ["live-region"] },
]);

suite("toggle-button", (page) => checkToggleButton(page.locator("#wish")), [
  { query: "", failed: [] },
  { query: "break=no-pressed", failed: ["pressed-state"] },
  { query: "break=div", failed: ["role-and-name", "toggles-with-keyboard"] },
  { query: "break=name-changes", failed: ["name-stable"] },
  { query: "break=loses-focus", failed: ["focus-stays"] },
]);

suite("navigation", (page) => checkNavigation(page.locator("#main"), { links: ["Men", "Women", "Kids"], current: "Kids" }), [
  { query: "", failed: [] },
  { query: "break=no-name", failed: ["landmark-and-name"] },
  { query: "break=buttons", failed: ["links", "tab-order", "current-page"] },
  { query: "break=menubar", failed: ["no-menu-roles"] },
  { query: "break=skip-link", failed: ["tab-order"] },
  { query: "break=bad-current", failed: ["current-page"] },
]);

suite("status", (page) => checkStatus(page.getByRole("button", { name: "Add to cart" }), /added to cart/i), [
  { query: "size", failed: [] },
  { query: "size&break=no-region", failed: ["live-region"] },
  { query: "size&break=late-region", failed: ["region-present-before"] },
  { query: "size&break=mouse-only", failed: ["activates-with-keyboard"] },
  { query: "size&break=loses-focus", failed: ["focus-kept"] },
]);

test.describe("status errors", () => {
  for (const c of [{ query: "", failed: [] as string[] }, { query: "break=unlinked-error", failed: ["error-linked"] }]) {
    test(c.query || "linked error", async ({ page }) => {
      await page.goto(fixture("status", c.query));
      const run = await checkStatus(page.getByRole("button", { name: "Add to cart" }), /pick a size/i, { field: page.getByLabel("Size") });
      expect(failed(run), run.message("status")).toEqual(c.failed);
    });
  }
});

suite("wcag", (page) => checkWCAG(page), [
  { query: "", failed: [] },
  { query: "break=low-contrast", failed: ["color-contrast"] },
  { query: "break=no-alt", failed: ["text-alternatives"] },
  { query: "break=no-lang", failed: ["language"] },
  { query: "break=no-title", failed: ["page-title"] },
  { query: "break=no-focus-style", failed: ["focus-visible"] },
  { query: "break=small-target", failed: ["target-size"] },
  { query: "break=clickable-div", failed: ["keyboard"] },
  { query: "break=wide", failed: ["reflow"] },
  { query: "break=clipped", failed: ["text-spacing"] },
  { query: "break=no-label", failed: ["labels"] },
  { query: "break=icon-button", failed: ["name-role-value"] },
  { query: "break=two-h1", failed: ["headings"] },
  { query: "break=no-main", failed: ["landmarks"] },
  { query: "break=trap", failed: ["no-keyboard-trap"] },
  { query: "break=hidden-focusable", failed: ["focus-order"] },
  { query: "break=covered", failed: ["focus-not-obscured"] },
]);

test.describe("check selection", () => {
  test("a failing check outside the selection does not fail the matcher", async ({ page }) => {
    await page.goto(fixture("dialog", "break=no-return"));
    await expect(page.getByRole("button", { name: "Size guide" })).toBeAPGModal(["focus-trap", "escape-closes"], { name: "Size guide" });
    await page.goto(fixture("wcag", "break=low-contrast"));
    await expect(page).toBeWCAGCompliant(["language", "page-title", "labels"]);
  });

  test("a selected failing check fails the matcher and only selected checks are reported", async ({ page }) => {
    await page.goto(fixture("dialog", "break=no-return"));
    const run = await checkModalDialog(page.getByRole("button", { name: "Size guide" }), {}, ["focus-returns"]);
    expect(run.report.map((r) => r.id)).toEqual(["focus-returns"]);
    expect(run.passed).toBe(false);
  });

  test("a selected check blocked by an unselected prerequisite names it", async ({ page }) => {
    await page.goto(fixture("dialog", "break=no-escape"));
    const run = await checkModalDialog(page.getByRole("button", { name: "Size guide" }), {}, ["focus-returns"]);
    expect(run.report[0].status).toBe("skipped");
    expect(run.report[0].detail).toContain('"escape-closes" did not pass (Escape did not close the dialog.)');
  });

  test("unknown check ids are rejected with the valid ones", async ({ page }) => {
    await page.goto(fixture("tabs"));
    await expect(expect(page.getByRole("tablist")).toBeAPGTabs(["arrows" as never])).rejects.toThrow('Unknown check(s) "arrows" for toBeAPGTabs. Valid checks: "tablist-name"');
  });

  test("whole-page criteria fail on a locator with a hint", async ({ page }) => {
    await page.goto(fixture("wcag"));
    const run = await checkWCAG(page.getByRole("main"), ["page-title", "labels"]);
    expect(failed(run)).toEqual(["page-title"]);
    expect(run.report[0].detail).toContain("applies to a whole page");
  });
});

test.describe("expect matchers", () => {
  test("pass on conforming fixtures", async ({ page }) => {
    await page.goto(fixture("dialog"));
    await expect(page.getByRole("button", { name: "Size guide" })).toBeAPGModal({ name: "Size guide" });
    await page.goto(fixture("combobox"));
    await expect(page.getByRole("combobox", { name: "Color" })).toBeAPGCombobox({ options: ["Blue", "Black", "Grey"] });
    await page.goto(fixture("tabs"));
    await expect(page.getByRole("tablist", { name: "Product information" })).toBeAPGTabs({ activation: "automatic" });
    await page.goto(fixture("tooltip"));
    await expect(page.getByRole("button", { name: "Price information" })).toBeAPGTooltip("Price includes taxes");
    await page.goto(fixture("radio"));
    await expect(page.getByRole("radiogroup", { name: "Size" })).toBeAPGRadioGroup();
    await page.goto(fixture("spinbutton"));
    await expect(page.getByRole("spinbutton", { name: "Quantity" })).toBeAPGSpinbutton({ min: 1, max: 5 });
    await page.goto(fixture("accordion"));
    await expect(page.getByRole("region", { name: "Questions" })).toBeAPGAccordion();
    await page.goto(fixture("breadcrumb"));
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeAPGBreadcrumb();
    await page.goto(fixture("carousel"));
    await expect(page.getByRole("region", { name: "Trail Runner 2 photos" })).toBeAPGCarousel();
    await page.goto(fixture("toggle-button"));
    await expect(page.getByRole("button", { name: "Save to wishlist" })).toBeAPGToggleButton();
    await page.goto(fixture("navigation"));
    await expect(page.getByRole("navigation", { name: "Main" })).toBeAPGNavigation({ current: "Kids" });
    await page.goto(fixture("status", "size"));
    await expect(page.getByRole("button", { name: "Add to cart" })).toAnnounceStatus("Added to cart");
    await page.goto(fixture("wcag"));
    await expect(page).toBeWCAGCompliant();
  });

  test("failure message lists the checklist with how to pass and links", async ({ page }) => {
    await page.goto(fixture("dialog", "break=no-return"));
    let message = "";
    try {
      await expect(page.getByRole("button", { name: "Size guide" })).toBeAPGModal();
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("does not follow the APG Modal Dialog pattern: 1 of 7 checks did not pass.");
    expect(message).toContain("✗ focus-returns");
    expect(message).toContain("How to pass: Keep a ref to the trigger");
    expect(message).toContain("https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboard_interaction");
    expect(message).toContain("✓ escape-closes");
  });

  test("WCAG failure message lists offending elements", async ({ page }) => {
    await page.goto(fixture("wcag", "break=low-contrast"));
    let message = "";
    try {
      await expect(page).toBeWCAGCompliant(["color-contrast"]);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("does not meet WCAG 2.2 AA: 1 of 1 checks did not pass (selected: color-contrast).");
    expect(message).toContain("axe color-contrast");
    expect(message).toContain("#price");
    expect(message).toContain("How to pass: Use dark text");
  });

  test("matchers leave the widget as they found it", async ({ page }) => {
    await page.goto(fixture("combobox"));
    await expect(page.getByRole("combobox")).toBeAPGCombobox();
    await expect(page.getByRole("combobox")).toHaveText("Blue");
    await expect(page.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    await page.goto(fixture("tabs"));
    await expect(page.getByRole("tablist")).toBeAPGTabs();
    await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    await page.goto(fixture("spinbutton"));
    await expect(page.getByRole("spinbutton")).toBeAPGSpinbutton();
    await expect(page.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "1");
    await page.goto(fixture("dialog"));
    await expect(page.getByRole("button", { name: "Size guide" })).toBeAPGModal();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto(fixture("accordion"));
    await expect(page.locator("#faq")).toBeAPGAccordion();
    await expect(page.getByRole("button", { name: "Is it waterproof?" })).toHaveAttribute("aria-expanded", "false");
    await page.goto(fixture("carousel"));
    await expect(page.locator("#carousel")).toBeAPGCarousel();
    await expect(page.getByRole("group", { name: "1 of 3" })).toBeVisible();
    await page.goto(fixture("toggle-button"));
    await expect(page.locator("#wish")).toBeAPGToggleButton();
    await expect(page.locator("#wish")).toHaveAttribute("aria-pressed", "false");
  });

  test(".not is rejected", async ({ page }) => {
    await page.goto(fixture("tabs"));
    await expect(expect(page.getByRole("tablist")).not.toBeAPGTabs()).rejects.toThrow("is not supported");
  });
});
