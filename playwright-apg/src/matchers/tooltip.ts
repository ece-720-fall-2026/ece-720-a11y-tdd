import type { Locator } from "@playwright/test";
import { attr, byIdRefs, containsFocus, describeFocus, hasRole, isFocused, settle, SHORT, waitShown } from "../dom";
import { PatternRun } from "../runner";

export async function checkTooltip(trigger: Locator, text?: string | RegExp): Promise<PatternRun> {
  const run = new PatternRun("tooltip");
  const page = trigger.page();
  await trigger.first().waitFor({ state: "attached", timeout: SHORT * 5 });

  const refs = byIdRefs(page, await attr(trigger, "aria-describedby"));
  const tooltip = refs ? refs.and(page.locator('[role="tooltip"]')).first() : null;

  await run.check("described-by", async () => {
    if (!refs) return "The trigger has no aria-describedby attribute pointing at its tooltip.";
    if ((await refs.count()) === 0) return "aria-describedby refers to an id that is not in the page.";
    if (!tooltip || (await tooltip.count()) === 0 || !(await hasRole(tooltip, "tooltip"))) return 'The element referenced by aria-describedby does not have role="tooltip".';
  });
  if (!tooltip || (await tooltip.count()) === 0) {
    run.skipRemaining("Not checked because no tooltip element is referenced by the trigger.");
    return run;
  }

  await run.check("text", async () => {
    const actual = ((await tooltip.textContent()) ?? "").trim().replace(/\s+/g, " ");
    if (!actual) return "The tooltip is empty.";
    if (text !== undefined && !(typeof text === "string" ? actual.includes(text) : text.test(actual))) return `The tooltip text is "${actual}", expected ${typeof text === "string" ? `"${text}"` : String(text)}.`;
  });

  await page.mouse.move(0, 0);
  await run.check("shows-on-focus", async () => {
    await trigger.first().focus({ timeout: SHORT });
    if (!(await waitShown(tooltip, true))) return "The tooltip is not shown when the trigger receives focus.";
  });

  await run.check("not-focusable", async () => {
    if (await containsFocus(tooltip)) return "Focus moved into the tooltip; tooltips must not receive focus.";
    if (!(await isFocused(trigger))) return `Focus is on ${await describeFocus(page)} instead of the trigger.`;
    const focusable = await tooltip.evaluate((el) => (el as HTMLElement).tabIndex >= 0 || el.querySelector("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])") !== null);
    if (focusable) return "The tooltip is, or contains, a focusable element.";
  });

  await run.check("escape-dismisses", async () => {
    if (!(await isFocused(trigger))) await trigger.first().focus({ timeout: SHORT });
    await page.keyboard.press("Escape");
    if (!(await waitShown(tooltip, false))) return "Escape did not hide the tooltip.";
    if (!(await isFocused(trigger))) return `After Escape, focus is on ${await describeFocus(page)} instead of the trigger.`;
  }, ["shows-on-focus"]);

  await run.check("hides-on-blur", async () => {
    await trigger.first().blur();
    await trigger.first().focus({ timeout: SHORT });
    await waitShown(tooltip, true);
    await trigger.first().blur();
    if (!(await waitShown(tooltip, false))) return "The tooltip stays shown after the trigger loses focus.";
  }, ["shows-on-focus"]);

  await run.check("shows-on-hover", async () => {
    await trigger.first().hover({ timeout: SHORT });
    if (!(await waitShown(tooltip, true))) return "The tooltip is not shown when the pointer is over the trigger.";
  });

  await run.check("hoverable", async () => {
    const box = await tooltip.boundingBox();
    const from = await trigger.first().boundingBox();
    if (!box || !from) return "The tooltip has no layout box to move the pointer onto.";
    for (const [x, y] of hoverPath(from, box)) await page.mouse.move(x, y, { steps: 4 });
    await settle(page);
    if (!(await waitShown(tooltip, true, 300))) return "The tooltip disappears when the pointer moves from the trigger onto it.";
  }, ["shows-on-hover"]);

  await page.mouse.move(0, 0);
  await trigger.first().blur().catch(() => {});
  return run;
}

type Box = { x: number; y: number; width: number; height: number };

/**
 * Pointer path from the trigger onto the tooltip that stays over the two elements, as a user
 * would move: first along the trigger to the edge it shares with the tooltip, then across it.
 */
function hoverPath(from: Box, to: Box): Array<[number, number]> {
  const center = (b: Box): [number, number] => [b.x + b.width / 2, b.y + b.height / 2];
  const overlap = (a0: number, a1: number, b0: number, b1: number) => (Math.max(a0, b0) + Math.min(a1, b1)) / 2;
  const [fx, fy] = center(from);
  const [tx, ty] = center(to);
  if (Math.max(from.x, to.x) < Math.min(from.x + from.width, to.x + to.width)) {
    const x = overlap(from.x, from.x + from.width, to.x, to.x + to.width);
    return [[x, fy], [x, ty], [tx, ty]];
  }
  if (Math.max(from.y, to.y) < Math.min(from.y + from.height, to.y + to.height)) {
    const y = overlap(from.y, from.y + from.height, to.y, to.y + to.height);
    return [[fx, y], [tx, y], [tx, ty]];
  }
  return [[tx, ty]];
}
