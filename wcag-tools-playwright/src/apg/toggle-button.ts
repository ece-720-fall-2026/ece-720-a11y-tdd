import type { Locator } from "@playwright/test";
import { attr, describe, describeFocus, hasName, hasRole, isFocused, poll, SHORT } from "../dom";
import { apgPatterns } from "../registry/apg";
import { PatternRun } from "../runner";

export interface ToggleButtonOptions {
  /** Expected accessible name. Any non-empty name passes when omitted. */
  name?: string | RegExp;
}

export async function checkToggleButton(button: Locator, options: ToggleButtonOptions = {}, checks?: readonly string[]): Promise<PatternRun> {
  const run = new PatternRun(apgPatterns["toggle-button"], checks);
  const page = button.page();
  await button.first().waitFor({ state: "attached", timeout: SHORT * 5 });

  const pressed = () => attr(button, "aria-pressed");
  const name = () => button.first().evaluate((el) => (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || "").trim().replace(/\s+/g, " "));
  const original = await pressed();

  await run.check("role-and-name", async () => {
    if (!(await hasRole(button, "button"))) return `${await describe(button)} does not have role button; use <button type="button">.`;
    if (!(await hasName(button, options.name))) return options.name ? `The accessible name does not match ${String(options.name)}.` : 'The button has no accessible name; add text or aria-label (e.g. aria-label="Save to wishlist").';
  });

  await run.check("pressed-state", async () => {
    if (original !== "true" && original !== "false") return original === null ? 'The button has no aria-pressed; render aria-pressed="false" when off and "true" when on.' : `aria-pressed is "${original}"; use "true" or "false".`;
  });

  const nameBefore = await name();
  let nameAfter: string | null = null;
  let lostFocus: string | null = null;

  await run.check("toggles-with-keyboard", async () => {
    for (const key of ["Enter", " "]) {
      const before = await pressed();
      await button.first().focus({ timeout: SHORT });
      await page.keyboard.press(key);
      const after = await poll(pressed, (v) => v !== before, 500);
      if (nameAfter === null) nameAfter = await name().catch(() => null);
      if (lostFocus === null && !(await isFocused(button))) lostFocus = await describeFocus(page);
      if (after === before) return `${key === " " ? "Space" : key} did not change aria-pressed (still ${before === null ? "missing" : `"${before}"`}).`;
    }
  }, ["pressed-state"]);

  await run.check("name-stable", async () => {
    if (nameAfter !== null && nameAfter !== nameBefore) return `The name changed from "${nameBefore}" to "${nameAfter}" when toggled; keep one name and use aria-pressed for the state.`;
  }, ["toggles-with-keyboard"]);

  await run.check("focus-stays", async () => {
    if (lostFocus) return `After toggling, focus is on ${lostFocus} instead of the button.`;
  }, ["toggles-with-keyboard"]);

  if ((await pressed()) !== original) await button.first().click({ timeout: SHORT }).catch(() => {});
  await button.first().blur().catch(() => {});
  return run;
}
