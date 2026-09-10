import { test, expect } from "@playwright/test"

test.describe("Modal Component - Baseline Functional Contract (Before)", () => {
  test("opens and closes modal using DOM locators", async ({ page }) => {
    await page.goto("/modal-demo")

    // 1. Open the modal
    const openBtn = page.locator("button.open-btn")
    await openBtn.click()

    // Assert visual overlay appears
    const modalOverlay = page.locator(".modal-overlay")
    await expect(modalOverlay).toBeVisible()

    // 2. Interact with content inside modal
    const modalTitle = page.locator(".modal-title")
    await expect(modalTitle).toHaveText("Settings")

    // 3. Close the modal via close button click
    const closeBtn = page.locator(".modal-close")
    await closeBtn.click()

    // Assert overlay is hidden
    await expect(modalOverlay).not.toBeVisible()
  })
})
