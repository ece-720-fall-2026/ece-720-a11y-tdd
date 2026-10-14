import { test } from "@playwright/test";
import { expect } from "../src";

/**
 * Ground truth: the W3C's own APG example widgets must pass. Requires network access.
 * The APG has no tooltip example, so the tooltip matcher is validated by fixtures only.
 */
const APG = "https://www.w3.org/WAI/ARIA/apg/patterns";

test("Modal Dialog example", async ({ page }) => {
  await page.goto(`${APG}/dialog-modal/examples/dialog/`);
  await expect(page.getByRole("button", { name: "Add Delivery Address" })).toOpenModalDialog({ name: "Add Delivery Address" });
});

test("Select-only Combobox example", async ({ page }) => {
  await page.goto(`${APG}/combobox/examples/combobox-select-only/`);
  await expect(page.getByRole("combobox", { name: "Favorite Fruit" })).toBeCombobox();
});

test("Tabs with automatic activation example", async ({ page }) => {
  await page.goto(`${APG}/tabs/examples/tabs-automatic/`);
  await expect(page.getByRole("tablist", { name: "Danish Composers" })).toBeTabs({ activation: "automatic" });
});

test("Tabs with manual activation example", async ({ page }) => {
  await page.goto(`${APG}/tabs/examples/tabs-manual/`);
  await expect(page.getByRole("tablist", { name: "Danish Composers" })).toBeTabs({ activation: "manual" });
});

test("Radio Group example", async ({ page }) => {
  await page.goto(`${APG}/radio/examples/radio/`);
  await expect(page.getByRole("radiogroup", { name: "Pizza Crust" })).toBeRadioGroup({ radios: ["Regular crust", "Deep dish", "Thin crust"] });
});

test("Date Picker Spin Button example", async ({ page }) => {
  await page.goto(`${APG}/spinbutton/examples/datepicker-spinbuttons/`);
  await expect(page.getByRole("spinbutton", { name: "Day" })).toBeSpinbutton({ min: 1, max: 31 });
});
