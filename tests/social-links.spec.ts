import { expect, test } from "@playwright/test";
import { isSafeSocialUrl } from "../lib/social-links";

test("email social links accept validated mailto URLs", () => {
  expect(isSafeSocialUrl("email", "mailto:hello@example.com")).toBe(true);
  expect(isSafeSocialUrl("email", "HELLO@example.com")).toBe(true);
  expect(isSafeSocialUrl("email", "mailto:not-an-email")).toBe(false);
  expect(isSafeSocialUrl("email", "mailto:hello@example.com?subject=Hi")).toBe(
    false,
  );
});

test("other social links still require safe HTTPS URLs", () => {
  expect(isSafeSocialUrl("github", "https://github.com/example")).toBe(true);
  expect(isSafeSocialUrl("github", "http://github.com/example")).toBe(false);
  expect(isSafeSocialUrl("github", "mailto:hello@example.com")).toBe(false);
});
