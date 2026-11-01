/** Hand-written part of each matcher's documentation; the check ids come from the specs. */
export interface MatcherUsage {
  /** What it asserts and what it is called on, in one sentence. */
  description: string;
  /** One example line. */
  example: string;
}

export const usage: Record<string, MatcherUsage> = {
  toBeWCAGCompliant: {
    description: "The page (or a Locator's subtree) meets WCAG 2.2 AA, checked with axe-core plus keyboard, reflow and text-spacing checks.",
    example: `await expect(page).toBeWCAGCompliant(["color-contrast", "focus-visible"]);`,
  },
  toAnnounceStatus: {
    description: "Pressing Enter on the trigger shows a message that screen readers announce (WCAG 4.1.3); pass `{ field }` for a field error.",
    example: `await expect(page.getByRole("button", { name: "Add to cart" })).toAnnounceStatus(/added to cart/i);`,
  },
  toBeAPGModal: {
    description: "Activating the trigger opens a modal dialog (APG Modal Dialog). Called on the trigger.",
    example: `await expect(page.getByRole("button", { name: "Size guide" })).toBeAPGModal({ name: "Size guide" });`,
  },
  toBeAPGCombobox: {
    description: "A select-only combobox: shows one value and opens a list (APG Combobox).",
    example: `await expect(page.getByRole("combobox", { name: "Size" })).toBeAPGCombobox({ disabled: ["US 10"] });`,
  },
  toBeAPGTabs: {
    description: "A tablist: sections side by side, one shown at a time (APG Tabs).",
    example: `await expect(page.getByRole("tablist", { name: "Product information" })).toBeAPGTabs();`,
  },
  toBeAPGTooltip: {
    description: "The trigger has a tooltip shown on hover and focus (APG Tooltip, WCAG 1.4.13). Called on the trigger.",
    example: `await expect(page.getByRole("button", { name: "Price information" })).toBeAPGTooltip("Price includes taxes");`,
  },
  toBeAPGRadioGroup: {
    description: "A radio group: one of a few visible choices (APG Radio Group). Called on the radiogroup or fieldset.",
    example: `await expect(page.getByRole("radiogroup", { name: "Color" })).toBeAPGRadioGroup();`,
  },
  toBeAPGSpinbutton: {
    description: "A spinbutton: a number changed with arrow keys or typed (APG Spinbutton).",
    example: `await expect(page.getByRole("spinbutton", { name: "Quantity" })).toBeAPGSpinbutton({ min: 1, max: 10 });`,
  },
  toBeAPGAccordion: {
    description: "An accordion: headers that show or hide their panels (APG Accordion). Called on the container.",
    example: `await expect(page.getByRole("region", { name: "Questions" })).toBeAPGAccordion();`,
  },
  toBeAPGBreadcrumb: {
    description: "A breadcrumb trail (APG Breadcrumb). Called on the nav.",
    example: `await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeAPGBreadcrumb();`,
  },
  toBeAPGCarousel: {
    description: "A carousel: one slide at a time with Previous/Next (APG Carousel). Called on the container.",
    example: `await expect(page.getByRole("region", { name: "Product photos" })).toBeAPGCarousel();`,
  },
  toBeAPGToggleButton: {
    description: "An on/off button (APG Button, toggle).",
    example: `await expect(page.getByRole("button", { name: "Save to wishlist" })).toBeAPGToggleButton();`,
  },
  toBeAPGNavigation: {
    description: "A site navigation made of links (APG navigation landmark). Called on the nav.",
    example: `await expect(page.getByRole("navigation", { name: "Main" })).toBeAPGNavigation();`,
  },
};
