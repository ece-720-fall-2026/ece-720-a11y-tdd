import { test, expect } from "@playwright/test"

test.describe("Modal Component - aAXTree State Contract (After)", () => {
  test("enforces dynamic ARIA roles, focus traps, and keyboard contracts", async ({
    page,
  }) => {
    await page.goto("/modal-demo")

    // STEP 1: Assert Initial Accessibility Tree (Modal must NOT exist in tree)
    await expect(page.locator("body")).toMatchAriaSnapshot(`
      - button "Open Modal"
    `)

    // STEP 2: Trigger Action via Keyboard & Assert Focus + Role State
    const triggerBtn = page.getByRole("button", { name: "Open Modal" })
    await triggerBtn.focus()
    await page.keyboard.press("Enter")

    // Assert aAXTree contains a formal 'dialog' role with an accessible name
    await expect(page.locator("body")).toMatchAriaSnapshot(`
      - dialog "Settings":
        - heading "Settings" [level=2]
        - button "Save Changes"
        - button "Close"
    `)

    // STEP 3: Assert Focus Management (Focus must automatically move inside the dialog)
    const closeButton = page.getByRole("button", { name: "Close" })
    await expect(closeButton).toBeFocused()

    // STEP 4: Assert Focus Trap (Tabbing from the last element loops within the dialog)
    await page.keyboard.press("Tab") // Move to 'Save Changes'
    await page.keyboard.press("Tab") // Should loop back to 'Close'
    await expect(closeButton).toBeFocused()

    // STEP 5: Assert Keyboard Dismissal & Focus Restoration
    await page.keyboard.press("Escape")

    // Modal must be removed from aAXTree, and focus MUST return to trigger button
    await expect(page.locator("body")).toMatchAriaSnapshot(`
      - button "Open Modal"
    `)
    await expect(triggerBtn).toBeFocused()
  })
})
