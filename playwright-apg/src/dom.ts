import { expect, type Locator, type Page } from "@playwright/test";

export const SHORT = 1_000;

export async function poll<T>(read: () => Promise<T>, ok: (value: T) => boolean, timeout = SHORT): Promise<T> {
  const end = Date.now() + timeout;
  let value = await read();
  while (!ok(value) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 50));
    value = await read();
  }
  return value;
}

/** Waits briefly for the UI to settle, for checks that assert something did not change. */
export function settle(page: Page): Promise<void> {
  return page.waitForTimeout(150);
}

/**
 * Whether the element is rendered and visible to sighted users. Unlike Playwright's `isVisible`,
 * `opacity: 0` and `visibility: hidden` count as hidden, since tooltips and popups often use them.
 */
export async function isShown(locator: Locator): Promise<boolean> {
  if ((await locator.count()) === 0) return false;
  return locator.first().evaluate((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions);
    }
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    }
    return true;
  });
}

/** Waits until the element is shown (or hidden). Resolves to whether that state was reached. */
export async function waitShown(locator: Locator, shown: boolean, timeout = SHORT): Promise<boolean> {
  return (await poll(() => isShown(locator), (v) => v === shown, timeout)) === shown;
}

export async function isFocused(locator: Locator): Promise<boolean> {
  if ((await locator.count()) === 0) return false;
  return locator.first().evaluate((el) => el === document.activeElement);
}

export async function containsFocus(locator: Locator): Promise<boolean> {
  if ((await locator.count()) === 0) return false;
  return locator.first().evaluate((el) => el.contains(document.activeElement));
}

export function waitFocused(locator: Locator, timeout = SHORT): Promise<boolean> {
  return poll(() => isFocused(locator), Boolean, timeout);
}

/** Short description of the focused element, for failure messages. */
export function describeFocus(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return "<body> (focus was lost)";
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role");
    const label = el.getAttribute("aria-label") || (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `<${tag}${role ? ` role="${role}"` : ""}>${label ? ` "${label}"` : ""}`;
  });
}

export function describe(locator: Locator): Promise<string> {
  return locator.first().evaluate((el) => {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role");
    const label = el.getAttribute("aria-label") || (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `<${tag}${role ? ` role="${role}"` : ""}>${label ? ` "${label}"` : ""}`;
  });
}

export function attr(locator: Locator, name: string): Promise<string | null> {
  return locator.first().getAttribute(name, { timeout: SHORT });
}

/** Locates the elements referenced by an ID reference list such as `aria-controls`. */
export function byIdRefs(page: Page, refs: string | null): Locator | null {
  const ids = (refs ?? "").split(/\s+/).filter(Boolean);
  if (ids.length === 0) return null;
  return page.locator(ids.map((id) => `[id="${id.replace(/(["\\])/g, "\\$1")}"]`).join(", "));
}

export async function hasRole(locator: Locator, role: string): Promise<boolean> {
  try {
    await expect(locator.first()).toHaveRole(role as Parameters<ReturnType<typeof expect<Locator>>["toHaveRole"]>[0], { timeout: SHORT });
    return true;
  } catch {
    return false;
  }
}

export async function hasName(locator: Locator, expected: string | RegExp = /\S/): Promise<boolean> {
  try {
    await expect(locator.first()).toHaveAccessibleName(expected, { timeout: SHORT });
    return true;
  } catch {
    return false;
  }
}

/** The role Playwright computes for the element, among the candidates. */
export async function roleOf(locator: Locator, candidates: string[]): Promise<string | null> {
  for (const role of candidates) {
    if (await hasRole(locator, role)) return role;
  }
  return null;
}

/** Visible, enabled elements inside `container` that are in the tab sequence. */
export function tabbables(container: Locator): Promise<number> {
  return container.first().evaluate((root) => {
    const selector = "a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable='true']";
    return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      if (el.tabIndex < 0 || (el as HTMLButtonElement).disabled || el.closest("[inert]")) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
    }).length;
  });
}

/** The value a widget displays: the input value, or its text content (ignoring `aria-label`). */
export function valueOf(locator: Locator): Promise<string> {
  return locator.first().evaluate((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) return el.value;
    return (el.textContent || "").trim().replace(/\s+/g, " ");
  });
}

/** Accessible-ish text of an element: `aria-label`, then text content or input value. */
export function textOf(locator: Locator): Promise<string> {
  return locator.first().evaluate((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) return el.value;
    return (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
  });
}
