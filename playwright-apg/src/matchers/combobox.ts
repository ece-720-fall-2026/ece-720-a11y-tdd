import type { Locator } from "@playwright/test";
import { attr, byIdRefs, describe, describeFocus, hasName, hasRole, isFocused, isShown, poll, SHORT, textOf, valueOf, waitShown } from "../dom";
import { PatternRun } from "../runner";

export interface ComboboxOptions {
  /** Expected option names, in display order. */
  options?: string[];
  /** Expected accessible name of the combobox. Any non-empty name passes when omitted. */
  name?: string | RegExp;
}

export async function checkCombobox(combobox: Locator, options: ComboboxOptions = {}): Promise<PatternRun> {
  const run = new PatternRun("combobox");
  const page = combobox.page();
  await combobox.first().waitFor({ state: "attached", timeout: SHORT * 5 });

  await run.check("role-and-name", async () => {
    if (!(await hasRole(combobox, "combobox"))) return `${await describe(combobox)} does not have role combobox.`;
    if (!(await hasName(combobox, options.name))) return options.name ? `The accessible name does not match ${String(options.name)}.` : "The combobox has no accessible name; associate a visible label with aria-labelledby.";
  });

  if (await combobox.first().evaluate((el) => el instanceof HTMLSelectElement)) {
    await run.check("controls-listbox", async () => {
      if (!options.options) return;
      const names = await combobox.first().evaluate((el) => Array.from((el as HTMLSelectElement).options).map((o) => o.text.trim()));
      if (names.join("|") !== options.options.join("|")) return `Options are [${names.join(", ")}], expected [${options.options.join(", ")}].`;
    });
    run.native(["collapsed-state", "opens-with-keyboard", "arrow-keys", "enter-selects", "selected-state", "escape-closes"], "Provided by the native <select> element.");
    return run;
  }

  const originalValue = await valueOf(combobox);
  const expanded = async () => (await attr(combobox, "aria-expanded")) === "true";
  const listbox = async () => byIdRefs(page, (await attr(combobox, "aria-controls")) ?? (await attr(combobox, "aria-owns")));
  const isOpen = async () => {
    if (await expanded()) return true;
    const list = await listbox();
    return list !== null && (await isShown(list));
  };
  const waitOpen = async (open: boolean) => (await poll(isOpen, (v) => v === open)) === open;
  const ensureClosed = async () => {
    if (!(await isOpen())) return;
    await combobox.first().focus({ timeout: SHORT });
    await page.keyboard.press("Escape");
    if (!(await waitOpen(false))) await combobox.first().click({ timeout: SHORT }).catch(() => {});
    await waitOpen(false);
  };
  const activeOption = async () => {
    const id = await attr(combobox, "aria-activedescendant");
    const option = byIdRefs(page, id);
    return option && (await option.count()) ? textOf(option) : null;
  };

  await run.check("collapsed-state", async () => {
    const value = await attr(combobox, "aria-expanded");
    if (value !== "false") return value === null ? 'aria-expanded is missing; set aria-expanded="false" while the listbox is closed.' : `aria-expanded is "${value}" while the listbox should be closed.`;
  });

  await run.check("opens-with-keyboard", async () => {
    const failures: string[] = [];
    for (const key of ["Enter", "Space", "ArrowDown"]) {
      await ensureClosed();
      await combobox.first().focus({ timeout: SHORT });
      await page.keyboard.press(key === "Space" ? " " : key);
      const isExpanded = (await poll(expanded, Boolean)) === true;
      const list = await listbox();
      const shown = list ? await waitShown(list, true) : false;
      const focused = await isFocused(combobox);
      if (!isExpanded || !shown) failures.push(`${key} did not open the listbox (aria-expanded ${isExpanded ? "true" : "not true"}, listbox ${shown ? "shown" : "not shown"}).`);
      else if (!focused) failures.push(`${key} opened the listbox but moved DOM focus to ${await describeFocus(page)}; focus must stay on the combobox.`);
    }
    if (failures.length) return failures.join(" ");
  });

  await ensureClosed();
  await combobox.first().focus({ timeout: SHORT });
  await page.keyboard.press("ArrowDown");
  const opened = await waitOpen(true);
  const focusAfterOpen = (await isFocused(combobox)) ? null : await describeFocus(page);

  await run.check("controls-listbox", async () => {
    const list = await listbox();
    if (!list || (await list.count()) === 0) return "aria-controls does not refer to an element in the page.";
    if (!(await hasRole(list, "listbox"))) return `The element referenced by aria-controls is ${await describe(list)}, not a listbox.`;
    const count = await list.first().getByRole("option").count();
    if (count === 0) return "The listbox contains no elements with role option.";
    if (options.options) {
      const names = (await list.first().getByRole("option").allTextContents()).map((t) => t.trim().replace(/\s+/g, " "));
      const expected = options.options;
      if (names.length !== expected.length || !expected.every((e, i) => names[i].includes(e))) return `Options are [${names.join(", ")}], expected [${expected.join(", ")}].`;
    }
  }, opened ? [] : ["opens-with-keyboard"]);

  let chosen: string | null = null;
  await run.check("arrow-keys", async () => {
    if (!opened) return "The listbox could not be opened with Down Arrow.";
    if (focusAfterOpen) return `Opening the listbox moved DOM focus to ${focusAfterOpen}; it must stay on the combobox, with aria-activedescendant pointing at the active option.`;
    const start = await poll(activeOption, (v) => v !== null);
    await page.keyboard.press("ArrowDown");
    const next = await poll(activeOption, (v) => v !== null && v !== start);
    if (next === null) return "aria-activedescendant does not refer to an option; it must point at the visually focused option.";
    if (next === start) {
      await page.keyboard.press("ArrowUp");
      const previous = await poll(activeOption, (v) => v !== start);
      if (previous === start) return "Down Arrow and Up Arrow do not change aria-activedescendant.";
    }
    if (!(await isFocused(combobox))) return `DOM focus moved to ${await describeFocus(page)}; it must stay on the combobox while options are navigated.`;
    chosen = await activeOption();
  });

  await run.check("enter-selects", async () => {
    await page.keyboard.press("Enter");
    if (!(await waitOpen(false))) return "Enter did not close the listbox.";
    const value = await poll(() => valueOf(combobox), (v) => v.includes(chosen!));
    if (!value.includes(chosen!)) return `After Enter on "${chosen}", the combobox shows "${value}".`;
    if (!(await isFocused(combobox))) return `After Enter, focus is on ${await describeFocus(page)} instead of the combobox.`;
  }, ["arrow-keys"]);

  await run.check("selected-state", async () => {
    await ensureClosed();
    await combobox.first().focus({ timeout: SHORT });
    await page.keyboard.press("ArrowDown");
    await waitOpen(true);
    const list = await listbox();
    const selected = list ? await list.first().locator('[role="option"][aria-selected="true"]').allTextContents() : [];
    await page.keyboard.press("Escape");
    await waitOpen(false);
    if (selected.length !== 1) return `${selected.length} options have aria-selected="true"; exactly one (the selected value) should.`;
    if (!selected[0].includes(chosen!)) return `aria-selected="true" is on "${selected[0].trim()}", but the value is "${chosen}".`;
  }, ["enter-selects"]);

  await run.check("escape-closes", async () => {
    await ensureClosed();
    await combobox.first().focus({ timeout: SHORT });
    const before = await valueOf(combobox);
    await page.keyboard.press("ArrowDown");
    if (!(await waitOpen(true))) return "The listbox could not be opened to test Escape.";
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    if (!(await waitOpen(false))) return "Escape did not close the listbox.";
    const after = await valueOf(combobox);
    if (after !== before) return `Escape changed the value from "${before}" to "${after}".`;
    if (!(await isFocused(combobox))) return `After Escape, focus is on ${await describeFocus(page)} instead of the combobox.`;
  });

  await ensureClosed();
  if ((await valueOf(combobox)) !== originalValue) {
    await combobox.first().focus({ timeout: SHORT }).catch(() => {});
    await page.keyboard.press("ArrowDown");
    await waitOpen(true);
    await page.keyboard.press("Home");
    for (let i = 0; i < 50; i++) {
      const active = await activeOption();
      if (active && originalValue.includes(active)) break;
      await page.keyboard.press("ArrowDown");
    }
    await page.keyboard.press("Enter");
  }
  await ensureClosed();
  return run;
}
