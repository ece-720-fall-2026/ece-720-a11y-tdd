import type { Locator } from "@playwright/test";
import { containsFocus, describeFocus, hasName, isShown, poll, SHORT, tabbables, waitFocused, waitShown } from "../dom";
import { CheckFailure, PatternRun } from "../runner";

export interface ModalDialogOptions {
  /** Expected accessible name of the dialog. Any non-empty name passes when omitted. */
  name?: string | RegExp;
  /** Locator for the dialog, when `getByRole("dialog")` is ambiguous. */
  dialog?: Locator;
}

export async function checkModalDialog(trigger: Locator, options: ModalDialogOptions = {}): Promise<PatternRun> {
  const run = new PatternRun("dialog-modal");
  const page = trigger.page();
  const dialog = options.dialog ?? page.getByRole("dialog", options.name ? { name: options.name } : {}).or(page.getByRole("alertdialog", options.name ? { name: options.name } : {}));

  const opened = () => waitShown(dialog, true);

  await run.check("opens-with-keyboard", async () => {
    await trigger.focus({ timeout: SHORT });
    await page.keyboard.press("Enter");
    if (await opened()) return;
    await trigger.click({ timeout: SHORT });
    if (await opened()) return "Enter on the focused trigger did nothing; the dialog only opens with a mouse click.";
    throw new CheckFailure(options.name ? `No visible dialog named ${String(options.name)} appeared after Enter or a click.` : "No visible dialog appeared after Enter or a click.");
  });
  if (!(await isShown(dialog))) {
    run.skipRemaining("Not checked because the dialog never opened.");
    return run;
  }
  const visibleDialog = dialog.first();

  await run.check("role-and-name", async () => {
    if (!(await hasName(visibleDialog, options.name ?? /\S/))) {
      return options.name ? `The dialog's accessible name does not match ${String(options.name)}.` : "The dialog has no accessible name; add aria-labelledby pointing at its title, or aria-label.";
    }
  });

  await run.check("modal", async () => {
    const modal = await visibleDialog.evaluate((el) => el.getAttribute("aria-modal") === "true" || (el instanceof HTMLDialogElement && el.matches(":modal")));
    if (!modal) return 'The dialog is not modal: set aria-modal="true", or open a native <dialog> with showModal().';
  });

  await run.check("focus-moves-in", async () => {
    const inside = await poll(() => containsFocus(visibleDialog), Boolean);
    if (!inside) return `After opening, focus is on ${await describeFocus(page)}, outside the dialog.`;
  });

  await run.check("tab-wraps", async () => {
    const count = Math.max(await tabbables(visibleDialog), 1);
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let i = 1; i <= count + 1; i++) {
        await page.keyboard.press(key);
        if (!(await poll(() => containsFocus(visibleDialog), Boolean, 300))) {
          return `After pressing ${key} ${i} time(s), focus moved to ${await describeFocus(page)}, outside the dialog.`;
        }
      }
    }
  }, ["focus-moves-in"]);

  await run.check("escape-closes", async () => {
    if (!(await containsFocus(visibleDialog))) {
      await visibleDialog.locator("a[href], button, input, select, textarea, [tabindex]").first().focus({ timeout: SHORT }).catch(() => {});
    }
    await page.keyboard.press("Escape");
    if (!(await waitShown(dialog, false))) return "Escape did not close the dialog.";
  });

  await run.check("focus-returns", async () => {
    if (!(await waitFocused(trigger))) return `After the dialog closed, focus is on ${await describeFocus(page)} instead of the trigger.`;
  }, ["escape-closes"]);

  if (await isShown(dialog)) await closeDialog(visibleDialog);
  return run;
}

async function closeDialog(dialog: Locator): Promise<void> {
  const close = dialog.getByRole("button", { name: /close|cancel|dismiss|×|✕/i }).first();
  if (await close.count()) await close.click({ timeout: SHORT }).catch(() => {});
  if (await isShown(dialog)) await dialog.page().keyboard.press("Escape");
}
