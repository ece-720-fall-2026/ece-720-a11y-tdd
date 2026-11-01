import type { Locator } from "@playwright/test";
import { attr, describe, hasName, poll, SHORT } from "../dom";
import { apgPatterns } from "../registry/apg";
import { PatternRun } from "../runner";

export interface CarouselOptions {
  /** Expected number of slides. */
  slides?: number;
  /** Set when the carousel rotates on its own; enables `rotation-control` and accepts `aria-live="off"`. */
  autoRotate?: boolean;
}

export async function checkCarousel(container: Locator, options: CarouselOptions = {}, checks?: readonly string[]): Promise<PatternRun> {
  const run = new PatternRun(apgPatterns.carousel, checks);
  const page = container.page();
  await container.first().waitFor({ state: "attached", timeout: SHORT * 5 });
  const root = container.first();
  const slides = root.locator('[aria-roledescription="slide" i]');
  const previous = root.getByRole("button", { name: /prev|back/i }).first();
  const next = root.getByRole("button", { name: /next|forward/i }).first();

  const shownIndexes = () => slides.evaluateAll((els) => els.flatMap((el, i) => {
    const rect = el.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true } as CheckVisibilityOptions) && !el.closest("[aria-hidden=true]");
    return visible ? [i] : [];
  }));
  const current = async () => (await shownIndexes())[0] ?? -1;
  const activate = async (button: Locator, expectedFrom: number) => {
    await button.focus({ timeout: SHORT });
    await page.keyboard.press("Enter");
    return poll(current, (i) => i !== expectedFrom, 500);
  };

  await run.check("container", async () => {
    const description = await attr(container, "aria-roledescription");
    if (!description || !/carousel/i.test(description)) return `${await describe(container)} has no aria-roledescription="carousel".`;
    if (!(await hasName(container))) return "The carousel has no accessible name; add aria-label (e.g. \"Product photos\").";
  });

  const count = await slides.count();
  await run.check("slides", async () => {
    if (count < 2) return `Found ${count} element(s) with aria-roledescription="slide"; render every slide (at least 2), hiding the inactive ones.`;
    if (options.slides !== undefined && count !== options.slides) return `Found ${count} slides, expected ${options.slides}.`;
    const problems = await slides.evaluateAll((els) => els.flatMap((el, i) => {
      const role = el.getAttribute("role");
      const labelledBy = (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
      const name = (el.getAttribute("aria-label") || labelledBy).trim();
      const issues: string[] = [];
      if (role !== "group" && role !== "tabpanel") issues.push(`slide ${i + 1} has ${role ? `role="${role}"` : "no role"} instead of role="group"`);
      if (!name) issues.push(`slide ${i + 1} has no accessible name (e.g. aria-label="${i + 1} of ${els.length}")`);
      return issues;
    }));
    if (problems.length) return `${problems.slice(0, 3).join("; ")}.`;
  });
  if (count < 2) {
    run.skipRemaining("Not checked because fewer than two slides were found.");
    return run;
  }
  const original = await current();

  await run.check("one-visible", async () => {
    const shown = await shownIndexes();
    if (shown.length !== 1) return `${shown.length} slides are shown at once; show only the current slide and hide the others (hidden attribute or display: none).`;
  });

  await run.check("controls", async () => {
    const missing = [];
    if ((await previous.count()) === 0) missing.push("Previous");
    if ((await next.count()) === 0) missing.push("Next");
    if (missing.length) return `No ${missing.join(" or ")} button was found inside the carousel; use <button> elements with names containing "Previous" and "Next".`;
    const from = await current();
    const to = await activate(next, from);
    if (to === from) return "Enter on the focused Next button did not change the slide.";
    const back = await activate(previous, to);
    if (back === to) return "Enter on the focused Previous button did not change the slide.";
  }, ["one-visible"]);

  await run.check("wraps", async () => {
    let index = await current();
    for (let i = 0; i < count && index !== count - 1; i++) index = await activate(next, index);
    if (index !== count - 1) return `Next never reached the last slide (stuck on slide ${index + 1}).`;
    const first = await activate(next, index);
    if (first !== 0) return `Next on the last slide showed ${first === index ? "no other slide" : `slide ${first + 1}`} instead of the first.`;
    const last = await activate(previous, 0);
    if (last !== count - 1) return `Previous on the first slide showed ${last === 0 ? "no other slide" : `slide ${last + 1}`} instead of the last.`;
  }, ["controls"]);

  await run.check("live-region", async () => {
    const live = await slides.first().evaluate((el, rootEl) => {
      for (let node: Element | null = el.parentElement; node; node = node.parentElement) {
        if (node.hasAttribute("aria-live")) return node.getAttribute("aria-live");
        if (node === rootEl) break;
      }
      return null;
    }, await root.elementHandle());
    const accepted = options.autoRotate ? ["polite", "off"] : ["polite"];
    if (live === null) return 'No element around the slides has aria-live; put aria-live="polite" on the slides wrapper.';
    if (!accepted.includes(live)) return `The slides wrapper has aria-live="${live}"; use "polite"${options.autoRotate ? ' (or "off" while rotating)' : ""}.`;
  });

  if (!options.autoRotate) {
    run.notApplicable("rotation-control", "The carousel does not rotate automatically (pass `autoRotate: true` if it does).");
  } else {
    await run.check("rotation-control", async () => {
      const control = root.getByRole("button", { name: /stop|pause|start|play|rotation/i }).first();
      if ((await control.count()) === 0) return 'No button to stop rotation was found; add a <button> named "Stop slide rotation".';
      const before = `${await attr(control, "aria-pressed")}|${await control.textContent()}|${await attr(control, "aria-label")}`;
      await control.focus({ timeout: SHORT });
      await page.keyboard.press("Enter");
      const after = await poll(async () => `${await attr(control, "aria-pressed")}|${await control.textContent()}|${await attr(control, "aria-label")}`, (v) => v !== before, 500);
      if (after === before) return "Enter on the rotation button did not change its label or aria-pressed, so its state is not exposed.";
      await page.keyboard.press("Enter");
    });
  }

  if (original >= 0 && (await next.count())) {
    for (let i = 0; i < count && (await current()) !== original; i++) await next.click({ timeout: SHORT }).catch(() => {});
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  return run;
}
