import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["sponsorship.spec.ts", "social-links.spec.ts"],
  fullyParallel: true,
});
