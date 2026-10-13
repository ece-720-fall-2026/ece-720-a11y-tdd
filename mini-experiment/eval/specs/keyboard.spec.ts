import { test, type Page } from "@playwright/test";
import {
  SIZES_IN_STOCK,
  bodyText,
  clickAddToCart,
  clickIncrease,
  clickSize,
  clickThumbnail,
  gotoProduct,
  mainImage,
  quantity,
  writeResult,
} from "./helpers";

/**
 * Keyboard Accessibility Score (KAS). The denominator is fixed by
 * REQUIREMENTS.md so every scenario is scored against the same 12 controls:
 * 3 thumbnails, 4 in-stock sizes, decrease, quantity field, increase,
 * add to cart and wishlist. A control is "manipulated" when it can be reached
 * with Tab (plus arrow keys inside a radio group) and operated with
 * Enter/Space/typing so that its visible outcome happens.
 */

const MAX_TABS = 60;

type Desc = {
  sig: string;
  tag: string;
  type: string | null;
  role: string | null;
  name: string;
  thumbOf: number | null;
  inHeader: boolean;
  iconOnly: boolean;
  focusIndicator: boolean;
};

async function describeFocus(page: Page): Promise<Desc | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) return null;
    const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
    const byIds = (ids: string | null) =>
      clean(
        (ids ?? "")
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" "),
      );
    const labels =
      el instanceof HTMLInputElement ? clean(Array.from(el.labels ?? []).map((l) => l.textContent).join(" ")) : "";
    const imgAlt = clean(el.querySelector("img")?.getAttribute("alt"));
    const name =
      clean(el.getAttribute("aria-label")) ||
      byIds(el.getAttribute("aria-labelledby")) ||
      labels ||
      clean(el.getAttribute("title")) ||
      clean(el.textContent) ||
      imgAlt ||
      clean((el as HTMLInputElement).value);

    const srcOf = (e: Element) =>
      (e instanceof HTMLImageElement ? e.currentSrc || e.src : "") + getComputedStyle(e).backgroundImage;
    let mainArea = 0;
    for (const e of Array.from(document.querySelectorAll("*"))) {
      if (!/shoe-\d/.test(srcOf(e))) continue;
      const r = e.getBoundingClientRect();
      mainArea = Math.max(mainArea, r.width * r.height);
    }
    let thumbOf: number | null = null;
    for (const e of [el, ...Array.from(el.querySelectorAll("*"))]) {
      const m = srcOf(e).match(/shoe-(\d)/);
      if (!m) continue;
      const r = e.getBoundingClientRect();
      if (r.width * r.height < mainArea * 0.5) thumbOf = Number(m[1]);
    }

    const style = getComputedStyle(el);
    const focusIndicator =
      (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
      (style.boxShadow !== "none" && style.boxShadow !== "");

    const path: string[] = [];
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
      const i = e.parentElement ? Array.from(e.parentElement.children).indexOf(e) : 0;
      path.unshift(`${e.tagName}:${i}`);
    }

    return {
      sig: path.join(">"),
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type"),
      role: el.getAttribute("role"),
      name: name.slice(0, 80),
      thumbOf,
      inHeader: !!el.closest("header") || el.getBoundingClientRect().top < 64,
      iconOnly: !clean(el.textContent) && !!el.querySelector("svg"),
      focusIndicator,
    };
  });
}

async function resetFocus(page: Page) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
}

const isRadio = (d: Desc) => d.type === "radio" || d.role === "radio";

type Target = {
  id: string;
  match: (d: Desc) => boolean;
  setup?: (page: Page) => Promise<unknown>;
  /** Keys tried in order once the control is focused; outcome is checked after each. */
  operate: Array<string | ((page: Page) => Promise<void>)>;
  outcome: (page: Page) => Promise<boolean>;
  radioGroup?: boolean;
};

const notCart = (name: string) => !/add to cart/i.test(name);

const targets: Target[] = [
  ...[1, 2, 3].map<Target>((n) => ({
    id: `thumbnail-${n}`,
    setup: n === 1 ? (page) => clickThumbnail(page, 2) : undefined,
    match: (d) => d.thumbOf === n,
    operate: ["Enter", "Space"],
    outcome: async (page) => (await mainImage(page)) === n,
  })),
  ...SIZES_IN_STOCK.map<Target>((s) => ({
    id: `size-${s}`,
    radioGroup: true,
    match: (d) =>
      new RegExp(`^(size\\s*)?${s}\\b`, "i").test(d.name) && !/out of stock/i.test(d.name),
    operate: ["Space", "Enter"],
    outcome: async (page) => {
      await clickAddToCart(page);
      await page.waitForTimeout(150);
      return new RegExp(`added[^.]*size ${s}\\b`, "i").test(await bodyText(page));
    },
  })),
  {
    id: "decrease",
    setup: (page) => clickIncrease(page),
    match: (d) => /^(−|-|–|minus)$|decrease|less|remove one|subtract/i.test(d.name),
    operate: ["Enter", "Space"],
    outcome: async (page) => (await quantity(page)) === 1,
  },
  {
    id: "quantity-field",
    match: (d) =>
      (d.tag === "input" && !["radio", "checkbox", "button", "submit"].includes(d.type ?? "")) ||
      d.role === "spinbutton",
    operate: [
      "ArrowUp",
      async (page) => {
        await page.keyboard.press("ControlOrMeta+A");
        await page.keyboard.type("3");
        await page.keyboard.press("Tab");
      },
    ],
    outcome: async (page) => [2, 3].includes((await quantity(page)) ?? -1),
  },
  {
    id: "increase",
    match: (d) => /^(\+|＋|plus)$|increase|more|add one/i.test(d.name) && notCart(d.name),
    operate: ["Enter", "Space"],
    outcome: async (page) => (await quantity(page)) === 2,
  },
  {
    id: "add-to-cart",
    setup: (page) => clickSize(page, "9"),
    match: (d) => /add to cart/i.test(d.name),
    operate: ["Enter", "Space"],
    outcome: async (page) => /added .*to cart/i.test(await bodyText(page)),
  },
  {
    id: "wishlist",
    match: (d) =>
      /wish|save|favou?rite|heart|like/i.test(d.name) ||
      (d.iconOnly && !d.inHeader && d.thumbOf === null),
    operate: ["Enter", "Space"],
    outcome: async (page) =>
      page.evaluate(
        () =>
          document.activeElement?.outerHTML !==
          (window as unknown as { __kbBefore: string }).__kbBefore,
      ),
  },
];

async function attempt(page: Page, target: Target) {
  await gotoProduct(page);
  if (target.setup) await target.setup(page);
  await page.waitForTimeout(150);
  await resetFocus(page);

  let reached: Desc | null = null;
  let tabs = 0;
  let first: string | null = null;
  outer: for (; tabs < MAX_TABS; tabs++) {
    await page.keyboard.press("Tab");
    const d = await describeFocus(page);
    if (!d) continue;
    if (first === d.sig && tabs > 0) break;
    first ??= d.sig;
    if (target.match(d)) {
      reached = d;
      break;
    }
    if (target.radioGroup && isRadio(d)) {
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("ArrowRight");
        const r = await describeFocus(page);
        if (r && target.match(r)) {
          reached = r;
          break outer;
        }
      }
    }
  }
  if (!reached) return { id: target.id, reachable: false, manipulated: false, tabs };

  for (const step of target.operate) {
    await page.evaluate(() => {
      (window as unknown as { __kbBefore: string }).__kbBefore =
        document.activeElement?.outerHTML ?? "";
    });
    if (typeof step === "string") await page.keyboard.press(step);
    else await step(page);
    await page.waitForTimeout(150);
    if (await target.outcome(page)) {
      return { id: target.id, reachable: true, manipulated: true, via: typeof step === "string" ? step : "typing", tabs, focused: reached };
    }
  }
  return { id: target.id, reachable: true, manipulated: false, tabs, focused: reached };
}

test("keyboard-only operability of the 12 required controls", async ({ page }) => {
  const controls = [];
  for (const target of targets) controls.push(await attempt(page, target));

  await gotoProduct(page);
  await resetFocus(page);
  const tabOrder: Desc[] = [];
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    const d = await describeFocus(page);
    if (!d) continue;
    if (tabOrder.some((t) => t.sig === d.sig)) break;
    tabOrder.push(d);
  }

  const manipulated = controls.filter((c) => c.manipulated).length;
  writeResult("keyboard.json", {
    summary: {
      manipulated,
      total: targets.length,
      reachable: controls.filter((c) => c.reachable).length,
      kas: Number(((manipulated / targets.length) * 100).toFixed(2)),
      tabStops: tabOrder.length,
      // Heuristic: only detects outline / box-shadow focus styles, not border or background changes.
      tabStopsWithFocusIndicator: tabOrder.filter((t) => t.focusIndicator).length,
    },
    controls,
    tabOrder,
  });
});
