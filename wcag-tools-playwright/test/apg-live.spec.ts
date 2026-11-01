import { test } from "@playwright/test";
import { expect } from "../src";

/**
 * Ground truth: the W3C's own APG example widgets must pass. Requires network access.
 * The APG has no tooltip or status-message example, so those are validated by fixtures only.
 */
const APG = "https://www.w3.org/WAI/ARIA/apg/patterns";

test("Modal Dialog example", async ({ page }) => {
  await page.goto(`${APG}/dialog-modal/examples/dialog/`);
  await expect(page.getByRole("button", { name: "Add Delivery Address" })).toBeAPGModal({ name: "Add Delivery Address" });
});

test("Select-only Combobox example", async ({ page }) => {
  await page.goto(`${APG}/combobox/examples/combobox-select-only/`);
  await expect(page.getByRole("combobox", { name: "Favorite Fruit" })).toBeAPGCombobox();
});

test("Tabs with automatic activation example", async ({ page }) => {
  await page.goto(`${APG}/tabs/examples/tabs-automatic/`);
  await expect(page.getByRole("tablist", { name: "Danish Composers" })).toBeAPGTabs({ activation: "automatic" });
});

test("Tabs with manual activation example", async ({ page }) => {
  await page.goto(`${APG}/tabs/examples/tabs-manual/`);
  await expect(page.getByRole("tablist", { name: "Danish Composers" })).toBeAPGTabs({ activation: "manual" });
});

test("Radio Group example", async ({ page }) => {
  await page.goto(`${APG}/radio/examples/radio/`);
  await expect(page.getByRole("radiogroup", { name: "Pizza Crust" })).toBeAPGRadioGroup({ radios: ["Regular crust", "Deep dish", "Thin crust"] });
});

test("Date Picker Spin Button example", async ({ page }) => {
  await page.goto(`${APG}/spinbutton/examples/datepicker-spinbuttons/`);
  // The example's spinbuttons are not text fields, so typing (accepts-typing) is not part of it.
  await expect(page.getByRole("spinbutton", { name: "Day" })).toBeAPGSpinbutton(["role-and-name", "value-state", "arrow-keys", "bounds", "home-end"], { min: 1, max: 31 });
});

test("Accordion example", async ({ page }) => {
  await page.goto(`${APG}/accordion/examples/accordion/`);
  await expect(page.locator("#accordionGroup")).toBeAPGAccordion({ items: ["Personal Information", "Billing Address", "Shipping Address"] });
});

test("Breadcrumb example", async ({ page }) => {
  await page.goto(`${APG}/breadcrumb/examples/breadcrumb/`);
  await expect(page.locator("#ex1 nav")).toBeAPGBreadcrumb();
});

test("Auto-rotating Carousel example", async ({ page }) => {
  await page.goto(`${APG}/carousel/examples/carousel-1-prev-next/`);
  await expect(page.locator("#myCarousel")).toBeAPGCarousel({ autoRotate: true });
});

test("Toggle Button example", async ({ page }) => {
  await page.goto(`${APG}/button/examples/button/`);
  await expect(page.getByRole("button", { name: "Mute" })).toBeAPGToggleButton();
});

test("Navigation landmark example", async ({ page }) => {
  await page.goto(`${APG}/landmarks/examples/navigation.html`);
  // The page injects a second "Skip To" nav, so the example's unlabelled nav can't pass landmark-and-name.
  await expect(page.locator("nav:not(#id-skip-to)")).toBeAPGNavigation(["links", "tab-order", "no-menu-roles", "current-page"]);
});
