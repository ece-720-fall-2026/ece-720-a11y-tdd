import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

/**
 * Implementation-agnostic helpers. Generated widgets differ in markup (native
 * buttons, divs, radios, next/image, background images...), so every lookup
 * here goes through visible text, values and image URLs, never through roles,
 * ids or class names. Setup actions use DOM `el.click()` on purpose: they only
 * prepare state and must not depend on the semantics being measured.
 */

export const SIZES_IN_STOCK = ["7", "8", "9", "10"] as const;

export function resultsDir(): string {
  const dir = process.env.RESULTS_DIR;
  if (!dir) throw new Error("RESULTS_DIR is not set (use run.sh)");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeResult(name: string, data: unknown) {
  fs.writeFileSync(
    path.join(resultsDir(), name),
    JSON.stringify(data, null, 2) + "\n",
  );
}

export async function gotoProduct(page: Page) {
  await page.goto("/product");
  await page.waitForLoadState("networkidle");
}

/** Click the deepest element whose own text (or input value) matches `pattern`. */
export async function clickByText(page: Page, pattern: RegExp): Promise<boolean> {
  return page.evaluate(
    ({ source, flags }) => {
      const re = new RegExp(source, flags);
      const text = (el: Element) =>
        el instanceof HTMLInputElement && ["button", "submit"].includes(el.type)
          ? el.value
          : (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const all = Array.from(document.body.querySelectorAll("*")).filter((el) =>
        re.test(text(el)),
      );
      const deepest = all.filter((el) => !all.some((o) => o !== el && el.contains(o)));
      const target = deepest[0] as HTMLElement | undefined;
      if (!target) return false;
      target.click();
      return true;
    },
    { source: pattern.source, flags: pattern.flags },
  );
}

export async function clickAddToCart(page: Page) {
  return clickByText(page, /^add to cart$/i);
}

export async function clickSize(page: Page, size: string): Promise<boolean> {
  const viaRadio = await page.evaluate((s) => {
    const radio = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ).find(
      (r) =>
        r.value === s ||
        Array.from(r.labels ?? []).some((l) => l.textContent?.trim().startsWith(s)),
    );
    if (!radio) return false;
    radio.click();
    return true;
  }, size);
  if (viaRadio) return true;
  return clickByText(page, new RegExp(`^${size}$`));
}

export async function clickIncrease(page: Page) {
  return clickByText(page, /^(\+|＋|plus)$/i);
}

/** Click the thumbnail (smallest visible image) that shows `shoe-<n>`. */
export async function clickThumbnail(page: Page, n: number): Promise<boolean> {
  return page.evaluate((n) => {
    const imgs = Array.from(document.querySelectorAll("*")).filter((el) => {
      const src =
        (el instanceof HTMLImageElement ? el.currentSrc || el.src : "") +
        getComputedStyle(el).backgroundImage;
      return src.includes(`shoe-${n}`);
    }) as HTMLElement[];
    const visible = imgs.filter((el) => el.getBoundingClientRect().width > 0);
    visible.sort(
      (a, b) =>
        a.getBoundingClientRect().width * a.getBoundingClientRect().height -
        b.getBoundingClientRect().width * b.getBoundingClientRect().height,
    );
    const thumb = visible[0];
    if (!thumb) return false;
    thumb.click();
    return true;
  }, n);
}

/** Which shoe-N the largest visible product image currently shows, or null. */
export async function mainImage(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    let best: { n: number; area: number } | null = null;
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const src =
        (el instanceof HTMLImageElement ? el.currentSrc || el.src : "") +
        getComputedStyle(el).backgroundImage;
      const m = src.match(/shoe-(\d)/);
      if (!m) continue;
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > 0 && (!best || area > best.area)) best = { n: Number(m[1]), area };
    }
    return best?.n ?? null;
  });
}

/** Current quantity, read from the stepper's input or spinbutton. */
export async function quantity(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const input = Array.from(document.querySelectorAll<HTMLInputElement>("input")).find(
      (i) => !["radio", "checkbox", "hidden", "button", "submit"].includes(i.type),
    );
    if (input) return Number(input.value);
    const spin = document.querySelector('[role="spinbutton"]');
    if (spin) return Number(spin.getAttribute("aria-valuenow") ?? spin.textContent);
    return null;
  });
}

export async function isTextVisible(page: Page, pattern: RegExp): Promise<boolean> {
  const matches = page.getByText(pattern);
  const count = await matches.count();
  for (let i = 0; i < count; i++) {
    if (await matches.nth(i).isVisible()) return true;
  }
  return false;
}

export const SIZE_GUIDE_TEXT = /foot length/i;

export async function openSizeGuide(page: Page) {
  await clickByText(page, /^size guide$/i);
  await page.waitForTimeout(200);
  return isTextVisible(page, SIZE_GUIDE_TEXT);
}

/** Opens the color dropdown by clicking the closed control that shows "Blue". */
export async function openColorDropdown(page: Page) {
  await clickByText(page, /^blue$/i);
  await page.waitForTimeout(200);
  return isTextVisible(page, /^grey$/i);
}

/** True when the active element is inside the size guide modal. */
export async function focusInSizeGuide(page: Page): Promise<boolean> {
  return page.evaluate((source) => {
    const re = new RegExp(source, "i");
    const all = Array.from(document.querySelectorAll("*")).filter((el) =>
      re.test(el.textContent ?? ""),
    );
    const label = all.find((el) => !all.some((o) => o !== el && el.contains(o)));
    if (!label) return false;
    let root: Element | null = label;
    for (let e: Element | null = label; e && e !== document.body; e = e.parentElement) {
      if (
        e.tagName === "DIALOG" ||
        e.getAttribute("role") === "dialog" ||
        getComputedStyle(e).position === "fixed"
      ) {
        root = e;
      }
    }
    return !!document.activeElement && root !== label && root.contains(document.activeElement);
  }, SIZE_GUIDE_TEXT.source);
}

export async function bodyText(page: Page): Promise<string> {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
}
