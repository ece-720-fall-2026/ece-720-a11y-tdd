import type { Locator } from "@playwright/test";
import { describeFocus, poll, settle, SHORT } from "../dom";
import { statusSpec } from "../registry/wcag";
import { PatternRun } from "../runner";

export interface StatusOptions {
  /**
   * For error messages: the form field the error is about. Enables `error-linked`, which checks
   * that the field gets `aria-invalid="true"` and `aria-describedby` pointing at the message.
   */
  field?: Locator;
}

const LIVE = "[role=status], [role=alert], [role=log], [aria-live]:not([aria-live=off]), output";

declare global {
  interface Window {
    __wcagToolsLive?: WeakSet<Element>;
  }
}

export async function checkStatus(trigger: Locator, text: string | RegExp, options: StatusOptions = {}, checks?: readonly string[]): Promise<PatternRun> {
  const run = new PatternRun(statusSpec, checks);
  const page = trigger.page();
  await trigger.first().waitFor({ state: "attached", timeout: SHORT * 5 });
  const messages = page.getByText(text).filter({ visible: true });

  await page.evaluate((selector) => { window.__wcagToolsLive = new WeakSet(document.querySelectorAll(selector)); }, LIVE);
  const shownBefore = await messages.count();

  const appeared = async () => (await poll(() => messages.count(), (n) => n > shownBefore, SHORT * 2)) > shownBefore;
  let focusAfter: string | null = null;

  await run.check("activates-with-keyboard", async () => {
    await trigger.first().focus({ timeout: SHORT });
    await page.keyboard.press("Enter");
    if (await appeared()) {
      await settle(page);
      focusAfter = await describeFocus(page);
      return;
    }
    await trigger.first().click({ timeout: SHORT });
    if (await appeared()) {
      focusAfter = await describeFocus(page);
      return "Enter on the focused trigger did nothing; the message only appears after a mouse click.";
    }
    return `No visible message matching ${typeof text === "string" ? `"${text}"` : String(text)} appeared after Enter or a click.`;
  });
  if ((await messages.count()) <= shownBefore) {
    run.skipRemaining("Not checked because the message never appeared.");
    return run;
  }

  const info = await messages.evaluateAll((els, selector) => {
    const withRegion = els.map((el) => ({ el, region: el.closest(selector) }));
    const chosen = withRegion.find((m) => m.region) ?? withRegion[0];
    const region = chosen.region;
    return {
      inRegion: region !== null,
      regionTag: region ? `<${region.tagName.toLowerCase()}${region.getAttribute("role") ? ` role="${region.getAttribute("role")}"` : ""}${region.hasAttribute("aria-live") ? ` aria-live="${region.getAttribute("aria-live")}"` : ""}>` : "",
      existedBefore: region ? (window.__wcagToolsLive?.has(region) ?? false) : false,
      isAlert: region ? region.getAttribute("role") === "alert" : false,
      ids: [chosen.el, ...(region ? [region] : [])].flatMap((n) => {
        const ids: string[] = [];
        for (let node: Element | null = n; node; node = node.parentElement) if (node.id) ids.push(node.id);
        return ids;
      }),
      text: (chosen.el.textContent || "").trim().replace(/\s+/g, " "),
    };
  }, LIVE);

  await run.check("live-region", async () => {
    if (!info.inRegion) return `The message "${info.text}" is not inside a live region, so screen readers won't announce it; wrap it in role="status" (or role="alert" for errors).`;
  });

  await run.check("region-present-before", async () => {
    if (info.existedBefore || info.isAlert) return;
    return `The live region ${info.regionTag} was added to the page together with the message; render it empty from the start and only change its text.`;
  }, ["live-region"]);

  await run.check("focus-kept", async () => {
    if (focusAfter && focusAfter.startsWith("<body>")) return `After the action, focus is on ${focusAfter}.`;
  }, ["activates-with-keyboard"]);

  if (!options.field) {
    run.notApplicable("error-linked", "No `field` was given, so the message is not treated as a field error.");
  } else {
    const field = options.field;
    await run.check("error-linked", async () => {
      const invalid = await field.first().getAttribute("aria-invalid", { timeout: SHORT });
      const describedBy = ((await field.first().getAttribute("aria-describedby", { timeout: SHORT })) ?? "").split(/\s+/).filter(Boolean);
      const problems: string[] = [];
      if (invalid !== "true") problems.push(`the field has ${invalid === null ? "no aria-invalid" : `aria-invalid="${invalid}"`} (expected "true")`);
      if (!describedBy.some((id) => info.ids.includes(id))) {
        const linked = await page.evaluate(({ ids, message }) => ids.some((id) => (document.getElementById(id)?.textContent ?? "").includes(message)), { ids: describedBy, message: info.text });
        if (!linked) problems.push(describedBy.length ? `aria-describedby="${describedBy.join(" ")}" does not point at the message` : "the field has no aria-describedby pointing at the message");
      }
      if (problems.length) return `For the error "${info.text}", ${problems.join(" and ")}.`;
    });
  }
  return run;
}
