import { expect, test } from "@playwright/test";

test("a visitor can use and dismiss the directory search", async ({ page }) => {
  await page.goto("/");

  const searchTrigger = page.getByRole("button", {
    name: "Search profiles",
  });
  await expect(searchTrigger).toBeVisible();
  await searchTrigger.click();

  const dialog = page.getByRole("dialog", { name: "Search profiles" });
  const searchInput = dialog.locator(
    'input[aria-label="Search profiles by name, role, or location"]',
  );

  await expect(dialog).toBeVisible();
  await expect(searchInput).toBeFocused();
  await expect(dialog.getByRole("button", { name: "By role" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await dialog.getByRole("button", { name: "By location" }).click();
  await expect(
    dialog.getByRole("button", { name: "By location" }),
  ).toHaveAttribute("aria-pressed", "true");

  await searchInput.fill("playwright-no-profile-should-match");
  await expect(dialog).toContainText("No profiles match");

  await dialog.getByRole("button", { name: "Clear search" }).click();
  await expect(searchInput).toHaveValue("");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(searchTrigger).toBeFocused();
});
