import type { Locator, Page } from "@playwright/test";

export interface WalkStep {
  /** Short description of the focused element. */
  desc: string;
  /** Visible on screen when focused. */
  shown: boolean;
  /** Its look (or its parent's) changed when focused. */
  indicator: boolean;
  /** Completely covered by other content when focused. */
  obscured: boolean;
}

export interface WalkResult {
  steps: WalkStep[];
  /** Focus left the page (or the scope), or wrapped back to the first element. */
  reachedEnd: boolean;
  /** Why the walk stopped without reaching the end. */
  stuck?: string;
}

declare global {
  interface Window {
    __wcagToolsWalk?: { base: Map<Element, string>; ids: Map<Element, number>; start: HTMLElement };
  }
}

/**
 * Presses Tab from the top of the page (or just before `scope`) and records every element that
 * receives focus, until focus leaves the page or the scope, wraps around, or stops moving.
 */
export async function tabWalk(page: Page, scope: Locator | null): Promise<WalkResult> {
  await page.mouse.move(0, 0);
  const scopeHandle = scope ? await scope.first().elementHandle() : null;
  const limit = await page.evaluate((root) => {
    const snapshot = (el: Element) => {
      const s = getComputedStyle(el);
      return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderBottomColor, s.borderTopWidth, s.backgroundColor, s.color, s.textDecorationLine].join("|");
    };
    const base = new Map<Element, string>();
    const selector = "a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable='true']";
    const candidates = Array.from((root ?? document).querySelectorAll(selector));
    for (const el of candidates) {
      base.set(el, snapshot(el));
      for (let p = el.parentElement, i = 0; p && i < 2; p = p.parentElement, i++) if (!base.has(p)) base.set(p, snapshot(p));
    }
    (document.activeElement as HTMLElement | null)?.blur();
    const start = document.createElement("span");
    start.tabIndex = -1;
    start.setAttribute("data-wcag-tools-start", "");
    if (root) root.before(start);
    else document.body.prepend(start);
    start.focus();
    window.__wcagToolsWalk = { base, ids: new Map(), start };
    return Math.min(candidates.length + 20, 400);
  }, scopeHandle);

  const steps: WalkStep[] = [];
  const seen: number[] = [];
  let result: WalkResult | null = null;
  for (let i = 0; i < limit && !result; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(30);
    const step = await page.evaluate((root) => {
      const walk = window.__wcagToolsWalk!;
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement || el === walk.start) return { end: true as const };
      if (root && !root.contains(el)) return { end: true as const };
      if (!walk.ids.has(el)) walk.ids.set(el, walk.ids.size);
      const id = walk.ids.get(el)!;
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role");
      const label = (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 40);
      const desc = `<${tag}${role ? ` role="${role}"` : ""}>${label ? ` "${label}"` : ""}`;
      const rect = el.getBoundingClientRect();
      const shown = rect.width > 1 && rect.height > 1 && rect.right > 0 && rect.left < innerWidth
        && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true } as CheckVisibilityOptions);
      const snapshot = (node: Element) => {
        const s = getComputedStyle(node);
        return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderBottomColor, s.borderTopWidth, s.backgroundColor, s.color, s.textDecorationLine].join("|");
      };
      const own = getComputedStyle(el);
      let indicator = !walk.base.has(el) && own.outlineStyle !== "none" && parseFloat(own.outlineWidth) > 0;
      for (let node: Element | null = el, depth = 0; node && depth < 3 && !indicator; node = node.parentElement, depth++) {
        const before = walk.base.get(node);
        if (before !== undefined && before !== snapshot(node)) indicator = true;
      }
      let obscured = false;
      if (shown) {
        const inset = Math.min(2, rect.width / 4, rect.height / 4);
        const points: Array<[number, number]> = [
          [rect.left + rect.width / 2, rect.top + rect.height / 2],
          [rect.left + inset, rect.top + inset],
          [rect.right - inset, rect.top + inset],
          [rect.left + inset, rect.bottom - inset],
          [rect.right - inset, rect.bottom - inset],
        ];
        const labels = (el as HTMLInputElement).labels ? Array.from((el as HTMLInputElement).labels ?? []) : [];
        obscured = !points.some(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return hit !== null && (hit === el || el.contains(hit) || labels.some((l) => l.contains(hit)));
        });
      }
      return { end: false as const, id, desc, shown, indicator, obscured };
    }, scopeHandle);

    if (step.end) {
      result = { steps, reachedEnd: true };
      break;
    }
    if (seen.length && seen[seen.length - 1] === step.id) {
      result = { steps, reachedEnd: false, stuck: `Focus stopped moving on ${step.desc}: pressing Tab again kept it there.` };
      break;
    }
    if (seen.includes(step.id)) {
      result = step.id === seen[0]
        ? { steps, reachedEnd: true }
        : { steps, reachedEnd: false, stuck: `Focus cycles back to ${step.desc} and never reaches the end of the page.` };
      break;
    }
    seen.push(step.id);
    steps.push({ desc: step.desc, shown: step.shown, indicator: step.indicator, obscured: step.obscured });
  }

  await page.evaluate(() => {
    const walk = window.__wcagToolsWalk;
    (document.activeElement as HTMLElement | null)?.blur();
    walk?.start.remove();
    delete window.__wcagToolsWalk;
  });
  return result ?? { steps, reachedEnd: false, stuck: `Focus did not reach the end of the page after ${limit} Tab presses.` };
}
