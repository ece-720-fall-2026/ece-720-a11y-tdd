import { expect as baseExpect, type ExpectMatcherState, type Locator, type MatcherReturnType, type Page } from "@playwright/test";
import { checkAccordion, type AccordionOptions } from "./apg/accordion";
import { checkBreadcrumb, type BreadcrumbOptions } from "./apg/breadcrumb";
import { checkCarousel, type CarouselOptions } from "./apg/carousel";
import { checkCombobox, type ComboboxOptions } from "./apg/combobox";
import { checkModalDialog, type ModalDialogOptions } from "./apg/modal";
import { checkNavigation, type NavigationOptions } from "./apg/navigation";
import { checkRadioGroup, type RadioGroupOptions } from "./apg/radio";
import { checkSpinbutton, type SpinbuttonOptions } from "./apg/spinbutton";
import { checkTabs, type TabsOptions } from "./apg/tabs";
import { checkToggleButton, type ToggleButtonOptions } from "./apg/toggle-button";
import { checkTooltip } from "./apg/tooltip";
import type {
  AccordionCheck, BreadcrumbCheck, CarouselCheck, ComboboxCheck, ModalCheck, NavigationCheck, RadioGroupCheck,
  SpinbuttonCheck, StatusCheck, TabsCheck, ToggleButtonCheck, TooltipCheck, WCAGCheck,
} from "./generated/checks";
import type { PatternRun } from "./runner";
import { checkWCAG } from "./wcag";
import { checkStatus, type StatusOptions } from "./wcag/status";

export type {
  AccordionOptions, BreadcrumbOptions, CarouselOptions, ComboboxOptions, ModalDialogOptions, NavigationOptions,
  RadioGroupOptions, SpinbuttonOptions, StatusOptions, TabsOptions, ToggleButtonOptions,
};
export type * from "./generated/checks";
export type { CheckResult, CheckStatus, PatternRun } from "./runner";
export type { CheckDefinition, SpecDefinition } from "./registry/types";
export { apgPatterns, type ApgPatternId } from "./registry/apg";
export { statusSpec, wcagCriteria, wcagSpec, type CriterionDefinition } from "./registry/wcag";
export {
  checkAccordion, checkBreadcrumb, checkCarousel, checkCombobox, checkModalDialog, checkNavigation, checkRadioGroup,
  checkSpinbutton, checkStatus, checkTabs, checkToggleButton, checkTooltip, checkWCAG,
};

type Checks<C> = readonly C[];

/** Matchers accept `(options?)` or `(checks, options?)`. */
function split<C, O>(first: Checks<C> | O | undefined, second: O | undefined): [Checks<C> | undefined, O | undefined] {
  return Array.isArray(first) ? [first as Checks<C>, second] : [undefined, first as O | undefined];
}

async function assertRun(state: ExpectMatcherState, name: string, subject: string, run: () => Promise<PatternRun>): Promise<MatcherReturnType> {
  if (state.isNot) throw new Error(`expect(...).not.${name}() is not supported: it runs many checks, so "not passing" has no single meaning.`);
  const result = await run();
  return {
    name,
    pass: result.passed,
    message: () => `${state.utils.matcherHint(name, undefined, undefined, { isNot: state.isNot })}\n\n${result.message(subject)}`,
  };
}

export const expect = baseExpect.extend({
  /**
   * The page (or a Locator's subtree) meets WCAG 2.2 AA, checked with axe-core plus keyboard, reflow and text-spacing checks.
   * Checks: `text-alternatives`, `structure`, `use-of-color`, `color-contrast`, `resize-text`, `reflow`, `text-spacing`, `keyboard`, `no-keyboard-trap`, `landmarks`, `page-title`, `focus-order`, `link-purpose`, `headings`, `focus-visible`, `focus-not-obscured`, `target-size`, `language`, `labels`, `name-role-value`. A failure explains how to fix each failed check.
   * @example await expect(page).toBeWCAGCompliant(["color-contrast", "focus-visible"]);
   * @docs toBeWCAGCompliant
   */
  async toBeWCAGCompliant(this: ExpectMatcherState, target: Page | Locator, checks?: Checks<WCAGCheck>) {
    const subject = typeof (target as Page).goto === "function" ? `Page ${(target as Page).url()}` : `Locator ${target}`;
    return assertRun(this, "toBeWCAGCompliant", subject, () => checkWCAG(target, checks));
  },

  /**
   * Pressing Enter on the trigger shows a message that screen readers announce (WCAG 4.1.3); pass `{ field }` for a field error.
   * Checks: `activates-with-keyboard`, `live-region`, `region-present-before`, `focus-kept`, `error-linked`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("button", { name: "Add to cart" })).toAnnounceStatus(/added to cart/i);
   * @docs toAnnounceStatus
   */
  async toAnnounceStatus(this: ExpectMatcherState, trigger: Locator, text: string | RegExp, checksOrOptions?: Checks<StatusCheck> | StatusOptions, options?: StatusOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toAnnounceStatus", `Locator ${trigger}`, () => checkStatus(trigger, text, opts, checks));
  },

  /**
   * Activating the trigger opens a modal dialog (APG Modal Dialog). Called on the trigger.
   * Checks: `opens-with-keyboard`, `role-and-name`, `modal`, `focus-moves-in`, `focus-trap`, `escape-closes`, `focus-returns`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("button", { name: "Size guide" })).toBeAPGModal({ name: "Size guide" });
   * @docs toBeAPGModal
   */
  async toBeAPGModal(this: ExpectMatcherState, trigger: Locator, checksOrOptions?: Checks<ModalCheck> | ModalDialogOptions, options?: ModalDialogOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGModal", `Locator ${trigger}`, () => checkModalDialog(trigger, opts, checks));
  },

  /**
   * A select-only combobox: shows one value and opens a list (APG Combobox).
   * Checks: `role-and-name`, `collapsed-state`, `opens-with-keyboard`, `controls-listbox`, `arrow-keys`, `enter-selects`, `selected-state`, `disabled-options`, `escape-closes`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("combobox", { name: "Size" })).toBeAPGCombobox({ disabled: ["US 10"] });
   * @docs toBeAPGCombobox
   */
  async toBeAPGCombobox(this: ExpectMatcherState, combobox: Locator, checksOrOptions?: Checks<ComboboxCheck> | ComboboxOptions, options?: ComboboxOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGCombobox", `Locator ${combobox}`, () => checkCombobox(combobox, opts, checks));
  },

  /**
   * A tablist: sections side by side, one shown at a time (APG Tabs).
   * Checks: `tablist-name`, `tabs`, `selected-state`, `panels`, `single-tab-stop`, `arrow-keys`, `activation`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("tablist", { name: "Product information" })).toBeAPGTabs();
   * @docs toBeAPGTabs
   */
  async toBeAPGTabs(this: ExpectMatcherState, tablist: Locator, checksOrOptions?: Checks<TabsCheck> | TabsOptions, options?: TabsOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGTabs", `Locator ${tablist}`, () => checkTabs(tablist, opts, checks));
  },

  /**
   * The trigger has a tooltip shown on hover and focus (APG Tooltip, WCAG 1.4.13). Called on the trigger.
   * Checks: `described-by`, `text`, `not-focusable`, `shows-on-focus`, `escape-dismisses`, `hides-on-blur`, `shows-on-hover`, `hoverable`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("button", { name: "Price information" })).toBeAPGTooltip("Price includes taxes");
   * @docs toBeAPGTooltip
   */
  async toBeAPGTooltip(this: ExpectMatcherState, trigger: Locator, checksOrText?: Checks<TooltipCheck> | string | RegExp, text?: string | RegExp) {
    const [checks, expected] = Array.isArray(checksOrText) ? [checksOrText as Checks<TooltipCheck>, text] : [undefined, checksOrText as string | RegExp | undefined];
    return assertRun(this, "toBeAPGTooltip", `Locator ${trigger}`, () => checkTooltip(trigger, expected, checks));
  },

  /**
   * A radio group: one of a few visible choices (APG Radio Group). Called on the radiogroup or fieldset.
   * Checks: `role-and-name`, `radios`, `checked-state`, `space-checks`, `arrow-keys`, `single-tab-stop`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("radiogroup", { name: "Color" })).toBeAPGRadioGroup();
   * @docs toBeAPGRadioGroup
   */
  async toBeAPGRadioGroup(this: ExpectMatcherState, group: Locator, checksOrOptions?: Checks<RadioGroupCheck> | RadioGroupOptions, options?: RadioGroupOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGRadioGroup", `Locator ${group}`, () => checkRadioGroup(group, opts, checks));
  },

  /**
   * A spinbutton: a number changed with arrow keys or typed (APG Spinbutton).
   * Checks: `role-and-name`, `value-state`, `arrow-keys`, `bounds`, `home-end`, `accepts-typing`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("spinbutton", { name: "Quantity" })).toBeAPGSpinbutton({ min: 1, max: 10 });
   * @docs toBeAPGSpinbutton
   */
  async toBeAPGSpinbutton(this: ExpectMatcherState, spinbutton: Locator, checksOrOptions?: Checks<SpinbuttonCheck> | SpinbuttonOptions, options?: SpinbuttonOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGSpinbutton", `Locator ${spinbutton}`, () => checkSpinbutton(spinbutton, opts, checks));
  },

  /**
   * An accordion: headers that show or hide their panels (APG Accordion). Called on the container.
   * Checks: `header-buttons`, `expanded-state`, `controls-panel`, `toggles-with-keyboard`, `collapsed-hidden`, `tab-order`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("region", { name: "Questions" })).toBeAPGAccordion();
   * @docs toBeAPGAccordion
   */
  async toBeAPGAccordion(this: ExpectMatcherState, container: Locator, checksOrOptions?: Checks<AccordionCheck> | AccordionOptions, options?: AccordionOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGAccordion", `Locator ${container}`, () => checkAccordion(container, opts, checks));
  },

  /**
   * A breadcrumb trail (APG Breadcrumb). Called on the nav.
   * Checks: `landmark-and-name`, `ordered-list`, `earlier-steps-are-links`, `current-page`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeAPGBreadcrumb();
   * @docs toBeAPGBreadcrumb
   */
  async toBeAPGBreadcrumb(this: ExpectMatcherState, nav: Locator, checksOrOptions?: Checks<BreadcrumbCheck> | BreadcrumbOptions, options?: BreadcrumbOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGBreadcrumb", `Locator ${nav}`, () => checkBreadcrumb(nav, opts, checks));
  },

  /**
   * A carousel: one slide at a time with Previous/Next (APG Carousel). Called on the container.
   * Checks: `container`, `slides`, `controls`, `one-visible`, `wraps`, `live-region`, `rotation-control`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("region", { name: "Product photos" })).toBeAPGCarousel();
   * @docs toBeAPGCarousel
   */
  async toBeAPGCarousel(this: ExpectMatcherState, container: Locator, checksOrOptions?: Checks<CarouselCheck> | CarouselOptions, options?: CarouselOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGCarousel", `Locator ${container}`, () => checkCarousel(container, opts, checks));
  },

  /**
   * An on/off button (APG Button, toggle).
   * Checks: `role-and-name`, `pressed-state`, `toggles-with-keyboard`, `name-stable`, `focus-stays`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("button", { name: "Save to wishlist" })).toBeAPGToggleButton();
   * @docs toBeAPGToggleButton
   */
  async toBeAPGToggleButton(this: ExpectMatcherState, button: Locator, checksOrOptions?: Checks<ToggleButtonCheck> | ToggleButtonOptions, options?: ToggleButtonOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGToggleButton", `Locator ${button}`, () => checkToggleButton(button, opts, checks));
  },

  /**
   * A site navigation made of links (APG navigation landmark). Called on the nav.
   * Checks: `landmark-and-name`, `links`, `tab-order`, `no-menu-roles`, `current-page`. A failure explains how to fix each failed check.
   * @example await expect(page.getByRole("navigation", { name: "Main" })).toBeAPGNavigation();
   * @docs toBeAPGNavigation
   */
  async toBeAPGNavigation(this: ExpectMatcherState, nav: Locator, checksOrOptions?: Checks<NavigationCheck> | NavigationOptions, options?: NavigationOptions) {
    const [checks, opts] = split(checksOrOptions, options);
    return assertRun(this, "toBeAPGNavigation", `Locator ${nav}`, () => checkNavigation(nav, opts, checks));
  },
});
