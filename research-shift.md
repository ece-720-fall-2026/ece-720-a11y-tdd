# Research Shift: APG-Compliant TDD

## Why we are shifting
The mini-experiment baseline (run-1, no TDD, no a11y instructions) scored:

| Metric | Result |
|---|---|
| ACAS (axe-core) | 100% (0 violations, 324 passes) |
| EAS (eslint-plugin-jsx-a11y) | 98.72% (77/78 elements clean) |
| KAS (keyboard) | 94.44% (17/18 controls) |
| Modal dialog checks | 0/4 |

- LLMs already handle **generic** a11y well: alt text, labels, names, landmarks, valid ARIA.
- They fail on **hard component interactions**:
  - The size-guide modal had no focus move-in, no focus trap, no Escape and no focus return.
  - The color dropdown was not operable with the keyboard.
- This matches Guriță and Vatavu: prompting reduces violations, but semantic barriers remain.
- ACAS and EAS hit a ceiling at baseline, so they cannot separate the 5 scenarios.
- Accessibility-tree snapshots (`toMatchAriaSnapshot`) check role, name and state, but not keyboard behaviour or focus, which is where the baseline failed.

## Revised hypotheses
- LLMs generate code that passes static a11y rules but fails **interactive widget semantics** (keyboard, focus, state).
- Writing tests first (Red) that **enforce WAI-ARIA APG patterns per component** produces more accessible components than asking for APG compliance at code time (Green).
- The advantage comes from turning a vague requirement ("be APG compliant") into executable checks whose failure messages tell the implementation exactly what is missing.

## Reference standard
WCAG has no per-component section, so we use WCAG 2.2 AA success criteria, operationalized through the WAI-ARIA Authoring Practices Guide (APG):
- **WCAG:**
  - 2.1.1 Keyboard
  - 2.1.2 No Keyboard Trap
  - 2.4.3 Focus Order
  - 2.4.7 Focus Visible
  - 1.4.13 Content on Hover or Focus
  - 4.1.2 Name, Role, Value
  - 4.1.3 Status Messages
- **APG patterns:**
  - [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  - [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) / [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
  - [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
  - [Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
  - [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
  - [Spinbutton](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)
- APG is non-normative. Some checks come from APG rather than WCAG, such as focus containment inside a modal and Escape to close.

## Proposed tool: Playwright APG extension
No existing Playwright plugin checks components against APG patterns.
- `@axe-core/playwright` checks static rules only.
- Playwright's built-in role/name/focus assertions are building blocks, not pattern checks.
- The W3C aria-practices regression tests are tied to their example pages.

We propose a Playwright assertion library where a test **declares the component type** and the library **enforces every APG rule for that type**. It extends Playwright's regular `expect` with custom matchers (`expect.extend`), so tests keep the standard API that LLMs already know:

```ts
import { test } from "@playwright/test";
import { expect } from "playwright-apg";

await expect(page.getByRole("button", { name: "Size guide" })).toOpenModalDialog({ name: "Size guide" });
await expect(page.getByRole("combobox", { name: "Color" })).toBeCombobox({ options: ["Blue", "Black", "Grey"] });
await expect(page.getByRole("tablist")).toBeTabs({ activation: "automatic" });
await expect(page.getByRole("radiogroup", { name: "Size" })).toBeRadioGroup();
await expect(page.getByRole("spinbutton", { name: "Quantity" })).toBeSpinbutton({ min: 1, max: 5 });
await expect(page.getByRole("button", { name: /price/i })).toHaveTooltip("Price includes taxes");
```

Each matcher runs a fixed checklist taken from the pattern's APG page:
1. **Type:** required role and structure, for example a `combobox` controlling a `listbox` of `option`s.
2. **States and properties:** `aria-expanded`, `aria-selected`, `aria-controls` and `aria-modal` exist and update after each interaction.
3. **Keyboard:** every key in the APG keyboard-interaction table, driven by keyboard only (no mouse clicks).
4. **Focus:** focus moves in, stays where APG requires, and returns to the trigger. Focus dropping to `<body>` always fails.

Failure messages cite the pattern and the APG section, so the Green phase receives the APG knowledge through the failing tests:

> APG Modal Dialog: after `Escape`, focus must return to the trigger `button "Size guide"`, but it was on `body`. See https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboardinteraction

Design rules:
- Tests import `expect` from `playwright-apg`, or from a fixtures file that re-exports it with `mergeExpects`. Built-in and APG matchers mix freely.
- Matcher names read like built-ins (`toBeCombobox`, `toOpenModalDialog`). None of them exists in Playwright today. Each one checks the full APG pattern (keyboard, focus, states), not just the role, which is what `toHaveRole` does. Test profiling counts them through the `playwright-apg` import.
- Matchers press keys and change the page, so each one leaves its widget as it found it: closed, with focus on the trigger. They don't auto-retry their key presses. Only the waits inside a matcher retry.
- `.not` is rejected, since "not this pattern" has no clear meaning for a multi-check pattern.
- Support APG variants as options rather than forcing one design: select-only vs editable combobox, automatic vs manual tab activation.
- Scope grows in two stages (see below).

### Scope
- **Mini-experiment:** the 6 patterns on the Trail Runner 2 product page: modal dialog, combobox/listbox, tabs, tooltip, radio group and spinbutton. This is enough to validate the approach.
- **Full project:** every pattern in the [APG patterns index](https://www.w3.org/WAI/ARIA/apg/patterns/):
  - Accordion
  - Alert
  - Alert Dialog
  - Breadcrumb
  - Button
  - Carousel
  - Checkbox
  - Combobox
  - Dialog (Modal)
  - Disclosure
  - Feed
  - Grid
  - Landmarks
  - Link
  - Listbox
  - Menu and Menubar
  - Menu Button
  - Meter
  - Radio Group
  - Slider
  - Slider (Multi-Thumb)
  - Spinbutton
  - Switch
  - Table
  - Tabs
  - Toolbar
  - Tooltip
  - Tree View
  - Treegrid
  - Window Splitter
- Every pattern gets one matcher with the same four kinds of check (type, states and properties, keyboard, focus). Non-interactive patterns such as Landmarks, Table, Meter and Breadcrumb mainly check type and states.
- The full-project requirements must exercise most of these patterns. The chosen e-commerce site should cover them, for example: a menubar for navigation, an accordion of filters, a carousel, sliders for price ranges, and a grid or table for the cart. That keeps per-pattern results comparable across scenarios.

### Validating the tool
- It must **pass** on the W3C APG example widgets ([w3c/aria-practices](https://github.com/w3c/aria-practices)).
- It must **fail** on broken variants of those examples, for example with the focus return or Escape handler removed.
- It must agree with our calibration components (`mini-experiment/eval/calibration/accessible.tsx` and `inaccessible.tsx`).

## Revised scenarios
The a11y spec becomes "Follow the WAI-ARIA APG patterns".
- Small spec: one sentence.
- Comprehensive spec: links each pattern.
- The task stays the Trail Runner 2 product page, since it already contains every pattern above. This keeps the e-commerce setting from the proposal.

1. **Baseline:** requirements only. No mention of APG or a11y.
2. **Red small:** the tests prompt says the components must follow the APG patterns. Tests use `playwright-apg`.
3. **Red comprehensive:** as 2, plus the per-pattern APG links and rules.
4. **Green small:** functional tests first, then the code prompt says to follow the APG patterns.
5. **Green comprehensive:** as 4, with the comprehensive spec at code time.
- Optional control: Green with `playwright-apg` installed and mentioned, so the model can run it while coding. This separates the effect of writing tests first from the effect of having the tool.

The Red vs Green comparison stays the core: the same spec text, delivered either as tests written first or as instructions at code time. Both TDD arms use two sessions, so the number of passes is balanced.

## Evaluation changes
- **Independence:** never score with the same library the tests used. Keep axe-core (ACAS), eslint-plugin-jsx-a11y (EAS) and the separate keyboard and dialog checks in `mini-experiment/eval`.
- Add an independent **per-pattern APG compliance score** (checks passed / checks applicable for each component). Detect the pattern that was built from its role and score it against that pattern.
- **Report per component** (modal, dropdown, tabs, tooltip, radio group, spinbutton) instead of one averaged score, to avoid the ceiling effect.
- **Report test quality** for Red runs: which components were declared, which matchers were used, and whether the declared types match APG. This separates Red tests that were wrong from implementations that failed them.
- Record the Green pass rate on the Red tests.
- At least 3 runs per scenario, ideally 5.

## Risks
- **Attribution:** a Red win could be credited to the tool rather than to TDD. Frame the claim as "a11y-TDD with APG pattern tests", and use the optional Green-with-tool control.
- **Model familiarity:** LLMs don't know `playwright-apg`, so the Red prompt needs a short API reference, applied identically in every run that uses it.
- **Wrong type declarations:** the Red model may declare the wrong pattern, for example a menu instead of a listbox. Test-quality reporting captures this.
- **Leakage:** "APG" or "a11y" must not appear in the stride repo, the requirements or the baseline prompt.

## Next steps
1. Prototype the modal dialog matcher and validate it against the APG dialog example and the calibration components.
2. Add the remaining matchers: combobox/listbox, tabs, tooltip, radio group, spinbutton.
3. Add the independent per-pattern APG scoring to `mini-experiment/eval`.
4. Rewrite the a11y specs and Red prompts. Drop the `toMatchAriaSnapshot` instruction and add the library reference.
5. Rerun all 5 scenarios, 3+ times each.
6. Update `project-proposal.tex`: hypotheses, planned approach and evaluation.
7. For the full project, extend `playwright-apg` to every APG pattern, validate each matcher against its W3C example, and write requirements for a site that covers the patterns.
