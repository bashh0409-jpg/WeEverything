import { expect, test } from "@playwright/test";

test("a visitor can search profiles and dismiss the directory search", async ({
  page,
}) => {
  await page.goto("/");

  const searchTrigger = page.getByRole("button", {
    name: "Search profiles",
  });
  await expect(searchTrigger).toBeVisible();
  await searchTrigger.click();

  const dialog = page.getByRole("dialog", { name: "Search profiles" });
  const searchInput = dialog.getByRole("searchbox", {
    name: "Search profiles",
  });
  await expect(dialog).toBeVisible();
  await expect(searchInput).toBeFocused();

  await searchInput.fill("playwright-no-profile-should-match");
  await expect(dialog).toContainText("No results found");

  await dialog.getByRole("button", { name: "Clear search" }).click();
  await expect(searchInput).toHaveValue("");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(searchTrigger).toBeFocused();
});
