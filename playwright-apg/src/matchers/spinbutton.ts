import type { Locator } from "@playwright/test";
import { describe, describeFocus, hasName, hasRole, isFocused, poll, settle, SHORT } from "../dom";
import { PatternRun } from "../runner";

export interface SpinbuttonOptions {
  /** Expected minimum. Read from `aria-valuemin` or the `min` attribute when omitted. */
  min?: number;
  /** Expected maximum. Read from `aria-valuemax` or the `max` attribute when omitted. */
  max?: number;
}

interface SpinState {
  value: number | null;
  min: number | null;
  max: number | null;
  ariaNow: string | null;
  native: boolean;
}

export async function checkSpinbutton(spinbutton: Locator, options: SpinbuttonOptions = {}): Promise<PatternRun> {
  const run = new PatternRun("spinbutton");
  const page = spinbutton.page();
  await spinbutton.first().waitFor({ state: "attached", timeout: SHORT * 5 });

  const state = () => spinbutton.first().evaluate((el): SpinState => {
    const num = (v: string | null) => (v === null || v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
    const native = el instanceof HTMLInputElement && el.type === "number";
    const ariaNow = el.getAttribute("aria-valuenow");
    return {
      value: native && ariaNow === null ? num((el as HTMLInputElement).value) : num(ariaNow),
      min: num(el.getAttribute("aria-valuemin") ?? (native ? el.getAttribute("min") : null)),
      max: num(el.getAttribute("aria-valuemax") ?? (native ? el.getAttribute("max") : null)),
      ariaNow,
      native,
    };
  });
  const value = async () => (await state()).value;
  const press = async (key: string, expected: (v: number | null) => boolean) => {
    await page.keyboard.press(key);
    return poll(value, expected, 500);
  };

  await run.check("role-and-name", async () => {
    if (!(await hasRole(spinbutton, "spinbutton"))) return `${await describe(spinbutton)} does not have role spinbutton.`;
    if (!(await hasName(spinbutton))) return "The spinbutton has no accessible name; associate a visible label or add aria-label.";
  });

  const initial = await state();
  const min = options.min ?? initial.min;
  const max = options.max ?? initial.max;

  await run.check("value-state", async () => {
    if (initial.value === null) return initial.native ? "The number input has no numeric value." : "aria-valuenow is missing or not a number.";
    if (options.min !== undefined && initial.min !== options.min) return `The minimum is exposed as ${initial.min ?? "nothing"}; expected ${options.min} (aria-valuemin or min).`;
    if (options.max !== undefined && initial.max !== options.max) return `The maximum is exposed as ${initial.max ?? "nothing"}; expected ${options.max} (aria-valuemax or max).`;
  });
  if (initial.value === null) {
    run.skipRemaining("Not checked because the spinbutton exposes no numeric value.");
    return run;
  }
  const original = initial.value;

  await run.check("arrow-keys", async () => {
    await spinbutton.first().focus({ timeout: SHORT });
    const atMax = max !== null && original >= max;
    const [first, second] = atMax ? ["ArrowDown", "ArrowUp"] : ["ArrowUp", "ArrowDown"];
    const moved = await press(first, (v) => v !== original);
    if (moved === original) return `${first} did not change the value (still ${original}).`;
    if ((first === "ArrowUp") !== (moved! > original)) return `${first} changed the value in the wrong direction (${original} → ${moved}).`;
    const back = await press(second, (v) => v === original);
    if (back !== original) return `${second} did not change the value back (${moved} → ${back}).`;
    if (!(await isFocused(spinbutton))) return `Focus moved to ${await describeFocus(page)}; it must stay on the spinbutton.`;
    if (!initial.native && (await state()).ariaNow === null) return "aria-valuenow is not kept up to date.";
  });

  await run.check("bounds", async () => {
    if (min === null && max === null) return;
    await spinbutton.first().focus({ timeout: SHORT });
    if (max !== null) {
      for (let i = 0; i < Math.min(max - original + 2, 100); i++) await page.keyboard.press("ArrowUp");
      await settle(page);
      const top = await value();
      if (top !== null && top > max) return `Up Arrow raised the value to ${top}, above the maximum ${max}.`;
    }
    if (min !== null) {
      const span = max !== null ? max - min + 2 : original - min + 2;
      for (let i = 0; i < Math.min(span, 100); i++) await page.keyboard.press("ArrowDown");
      await settle(page);
      const bottom = await value();
      if (bottom !== null && bottom < min) return `Down Arrow lowered the value to ${bottom}, below the minimum ${min}.`;
    }
  }, ["arrow-keys"]);

  await run.check("home-end", async () => {
    if (min === null && max === null) return;
    await spinbutton.first().focus({ timeout: SHORT });
    if (min !== null && (await press("Home", (v) => v === min)) !== min) return `Home did not set the value to the minimum ${min} (value is ${await value()}).`;
    if (max !== null && (await press("End", (v) => v === max)) !== max) return `End did not set the value to the maximum ${max} (value is ${await value()}).`;
  });

  for (let i = 0; i < 100; i++) {
    const current = await value();
    if (current === null || current === original) break;
    await spinbutton.first().focus({ timeout: SHORT }).catch(() => {});
    const after = await press(current > original ? "ArrowDown" : "ArrowUp", (v) => v !== current);
    if (after === current) break;
  }
  await spinbutton.first().blur().catch(() => {});
  return run;
}
