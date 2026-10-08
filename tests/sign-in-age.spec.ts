import { expect, test } from "@playwright/test";

test("sign-in requires an 18+ affirmation", async ({ page }) => {
  await page.goto("/signin");

  const ageConfirmation = page.getByRole("checkbox", {
    name: /I confirm that I am at least 18 years old/,
  });
  const googleButton = page.getByRole("button", { name: "Google" });

  await expect(ageConfirmation).toBeVisible();
  await expect(googleButton).toBeDisabled();
  await ageConfirmation.check();
  await expect(ageConfirmation).toBeChecked();

  const supabaseNotConfigured = page.getByText(
    "Configure your Supabase environment variables to enable the sign-in flow.",
  );
  if ((await supabaseNotConfigured.count()) > 0) {
    await expect(googleButton).toBeDisabled();
  } else {
    await expect(googleButton).toBeEnabled();
  }
});
