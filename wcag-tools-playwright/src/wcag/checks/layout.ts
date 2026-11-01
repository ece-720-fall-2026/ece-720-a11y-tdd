import type { Locator, Page } from "@playwright/test";

/** Elements that stick out past the right edge at 320 CSS pixels wide (WCAG 1.4.10). */
export async function reflowOverflow(page: Page): Promise<string | void> {
  const viewport = page.viewportSize();
  if (!viewport) return "The page has no fixed viewport size, so reflow could not be tested; set a viewport in the Playwright config.";
  await page.setViewportSize({ width: 320, height: 256 });
  try {
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      if (scrollWidth <= width + 1) return null;
      const clips = (el: Element) => /(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowX);
      const sticksOut = (el: Element) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.right <= width + 1) return false;
        for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) if (clips(p)) return false;
        return true;
      };
      const offenders = Array.from(document.body.querySelectorAll("*"))
        .filter((el) => sticksOut(el) && !(el.parentElement && el.parentElement !== document.body && sticksOut(el.parentElement)))
        .slice(0, 5)
        .map((el) => {
          const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
          return `<${el.tagName.toLowerCase()}${cls}> is ${Math.round(el.getBoundingClientRect().width)}px wide and ends at ${Math.round(el.getBoundingClientRect().right)}px`;
        });
      return { width, scrollWidth, offenders };
    });
    if (!result) return;
    return [`At 320px wide the page is ${result.scrollWidth}px wide and scrolls horizontally.`, ...result.offenders.map((o) => `  - ${o}`)].join("\n");
  } finally {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
  }
}

declare global {
  interface Window {
    __wcagToolsClipped?: WeakSet<Element>;
  }
}

const SPACING_CSS = "*, *::before, *::after { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }";

/** Text containers that start clipping their content with the WCAG 1.4.12 spacing applied. */
export async function textSpacingClipping(page: Page, scope: Locator | null): Promise<string | void> {
  const root = scope ? await scope.first().elementHandle() : null;
  const clipped = (mark: boolean) => page.evaluate(({ rootEl, markBaseline }) => {
    const found: Element[] = [];
    for (const el of Array.from((rootEl ?? document.body).querySelectorAll("*"))) {
      if (!(el as HTMLElement).innerText?.trim()) continue;
      const s = getComputedStyle(el);
      const clipsX = /(hidden|clip)/.test(s.overflowX);
      const clipsY = /(hidden|clip)/.test(s.overflowY);
      if (!clipsX && !clipsY) continue;
      const overflow = (clipsY && el.scrollHeight > el.clientHeight + 1) || (clipsX && el.scrollWidth > el.clientWidth + 1);
      if (overflow) found.push(el);
    }
    if (markBaseline) {
      window.__wcagToolsClipped = new WeakSet(found);
      return [];
    }
    return found.filter((el) => !window.__wcagToolsClipped?.has(el)).slice(0, 5).map((el) => `<${el.tagName.toLowerCase()}> "${((el as HTMLElement).innerText || "").trim().replace(/\s+/g, " ").slice(0, 40)}" (${Math.round(el.scrollHeight)}px of content in a ${Math.round(el.clientHeight)}px box)`);
  }, { rootEl: root, markBaseline: mark });

  await clipped(true);
  const style = await page.addStyleTag({ content: SPACING_CSS });
  try {
    await page.waitForTimeout(100);
    const offenders = await clipped(false);
    if (offenders.length) return ["With increased text spacing, these elements clip their text:", ...offenders.map((o) => `  - ${o}`)].join("\n");
  } finally {
    await style.evaluate((el) => (el as Element).remove());
  }
}

/** Elements that look clickable (pointer cursor or an interactive role) but can't receive focus (WCAG 2.1.1). */
export async function unfocusableClickables(page: Page, scope: Locator | null): Promise<string | void> {
  const root = scope ? await scope.first().elementHandle() : null;
  const offenders = await page.evaluate((rootEl) => {
    const roles = new Set(["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "menuitemcheckbox", "menuitemradio", "slider", "spinbutton", "combobox", "textbox", "searchbox"]);
    const focusable = "a[href], area[href], button, input, select, textarea, summary, label, iframe, [tabindex], [contenteditable='true']";
    const found: string[] = [];
    for (const el of Array.from((rootEl ?? document.body).querySelectorAll("*"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || !el.checkVisibility({ checkVisibilityCSS: true } as CheckVisibilityOptions) || el.closest("[inert]")) continue;
      const role = el.getAttribute("role") ?? "";
      const pointer = getComputedStyle(el).cursor === "pointer";
      if (!pointer && !roles.has(role)) continue;
      if (el.closest(focusable)) continue;
      // Composite widgets move a virtual focus with aria-activedescendant instead of DOM focus.
      if (el.closest("[role=listbox], [role=tree], [role=grid], [role=treegrid], [role=menu]")) continue;
      if (!roles.has(role) && el.parentElement && getComputedStyle(el.parentElement).cursor === "pointer") continue;
      const text = ((el as HTMLElement).innerText || el.getAttribute("aria-label") || el.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 40);
      found.push(`<${el.tagName.toLowerCase()}${role ? ` role="${role}"` : ""}>${text ? ` "${text}"` : ""}${pointer ? " (pointer cursor)" : ""}`);
    }
    return found;
  }, root);
  if (offenders.length === 0) return;
  return [
    `${offenders.length} element(s) look clickable but can't be reached with the keyboard; use <button>/<a href>, or add tabindex="0" and key handlers:`,
    ...offenders.slice(0, 5).map((o) => `  - ${o}`),
    ...(offenders.length > 5 ? [`  ...and ${offenders.length - 5} more`] : []),
  ].join("\n");
}
