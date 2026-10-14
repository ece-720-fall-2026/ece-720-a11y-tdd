import type { Locator } from "@playwright/test";
import { describe, describeFocus, hasName, poll, roleOf, settle, SHORT } from "../dom";
import { PatternRun } from "../runner";

export interface RadioGroupOptions {
  /** Expected radio names, in display order. */
  radios?: string[];
}

interface RadioState {
  checked: boolean;
  disabled: boolean;
  native: boolean;
  hasState: boolean;
  focused: boolean;
}

export async function checkRadioGroup(group: Locator, options: RadioGroupOptions = {}): Promise<PatternRun> {
  const run = new PatternRun("radio");
  const page = group.page();
  await group.first().waitFor({ state: "attached", timeout: SHORT * 5 });
  const radios = group.first().getByRole("radio", { includeHidden: true });

  const states = () => radios.evaluateAll((els) => els.map((el): RadioState => {
    const native = el instanceof HTMLInputElement && el.type === "radio";
    const aria = el.getAttribute("aria-checked");
    return {
      checked: native ? (el as HTMLInputElement).checked : aria === "true",
      disabled: native ? (el as HTMLInputElement).disabled : el.getAttribute("aria-disabled") === "true",
      native,
      hasState: native || aria === "true" || aria === "false",
      focused: el === document.activeElement,
    };
  }));
  const focusedIndex = async () => (await states()).findIndex((s) => s.focused);
  const checkedIndex = async () => (await states()).findIndex((s) => s.checked);

  await run.check("role-and-name", async () => {
    const role = await roleOf(group, ["radiogroup", "group"]);
    if (!role) return `${await describe(group)} has neither role radiogroup nor group (a <fieldset>).`;
    if (!(await hasName(group))) return role === "group" ? "The group has no accessible name; add a <legend> to the <fieldset>." : "The radiogroup has no accessible name; add aria-labelledby or aria-label.";
  });

  await run.check("radios", async () => {
    const count = await radios.count();
    if (count < 2) return `The group contains ${count} element(s) with role radio; expected at least 2.`;
    if (options.radios) {
      const names = await radios.evaluateAll((els) => els.map((el) => {
        const label = el instanceof HTMLInputElement ? Array.from(el.labels ?? []).map((l) => l.textContent ?? "").join(" ") : "";
        return (el.getAttribute("aria-label") || label || el.textContent || "").trim().replace(/\s+/g, " ");
      }));
      const expected = options.radios;
      if (names.length !== expected.length || !expected.every((e, i) => names[i].startsWith(e))) return `Radios are [${names.join(", ")}], expected [${expected.join(", ")}].`;
    }
  });
  if ((await radios.count()) < 2) {
    run.skipRemaining("Not checked because the group has fewer than two radios.");
    return run;
  }

  const initial = await states();
  const originalChecked = initial.findIndex((s) => s.checked);
  const enabled = initial.map((s, i) => (s.disabled ? -1 : i)).filter((i) => i >= 0);
  const native = initial.every((s) => s.native);

  await run.check("checked-state", async () => {
    const missing = initial.filter((s) => !s.hasState).length;
    if (missing) return `${missing} radio(s) do not expose a checked state; set aria-checked="true" or "false" on each.`;
    const checked = initial.filter((s) => s.checked).length;
    if (checked > 1) return `${checked} radios are checked; at most one may be.`;
  });

  await run.check("space-checks", async () => {
    const target = enabled.find((i) => !initial[i].checked);
    if (target === undefined) return;
    await radios.nth(target).focus({ timeout: SHORT });
    await page.keyboard.press(" ");
    if ((await poll(checkedIndex, (i) => i === target)) !== target) return `Space did not check the focused radio (radio ${target + 1}).`;
  });

  await run.check("arrow-keys", async () => {
    if (enabled.length < 2) return;
    const startPos = Math.max(enabled.indexOf(await checkedIndex()), 0);
    await radios.nth(enabled[startPos]).focus({ timeout: SHORT });
    const steps: Array<[string, number]> = [];
    for (let i = 1; i <= enabled.length; i++) steps.push(["ArrowDown", enabled[(startPos + i) % enabled.length]]);
    steps.push(["ArrowRight", enabled[(startPos + 1) % enabled.length]]);
    steps.push(["ArrowUp", enabled[startPos % enabled.length]]);
    steps.push(["ArrowLeft", enabled[(startPos + enabled.length - 1) % enabled.length]]);
    for (const [key, expected] of steps) {
      await page.keyboard.press(key);
      const focused = await poll(focusedIndex, (i) => i === expected, 500);
      if (focused !== expected) return `${key} moved focus to ${await describeFocus(page)}; expected radio ${expected + 1}${initial.some((s) => s.disabled) ? " (disabled radios are skipped)" : ""}, wrapping at the ends.`;
      if ((await poll(checkedIndex, (i) => i === expected, 500)) !== expected) return `${key} moved focus to radio ${expected + 1} but did not check it.`;
    }
  });

  await run.check("single-tab-stop", async () => {
    if (!native) {
      const stops = await radios.evaluateAll((els) => els.filter((el) => (el as HTMLElement).tabIndex >= 0).length);
      if (stops !== 1) return `${stops} radios are in the tab sequence; only one (the checked radio, or the first) should be.`;
    }
    const checked = await checkedIndex();
    await radios.nth(checked >= 0 ? checked : enabled[0]).focus({ timeout: SHORT });
    await page.keyboard.press("Tab");
    await settle(page);
    if ((await focusedIndex()) >= 0) return `Tab moved focus to another radio (${await describeFocus(page)}) instead of out of the group.`;
    await page.keyboard.press("Shift+Tab");
    const back = await poll(focusedIndex, (i) => i >= 0, 500);
    if (back < 0) return `Shift+Tab did not move focus back into the group; focus is on ${await describeFocus(page)}.`;
    if (checked >= 0 && back !== checked) return `Moving back into the group focused radio ${back + 1} instead of the checked radio ${checked + 1}.`;
  });

  if (originalChecked >= 0 && (await checkedIndex()) !== originalChecked) {
    await radios.nth(originalChecked).focus({ timeout: SHORT }).catch(() => {});
    await page.keyboard.press(" ");
  }
  await radios.nth(Math.max(originalChecked, enabled[0] ?? 0)).blur().catch(() => {});
  return run;
}
