import { expect, test } from "@playwright/test";
import {
  getActivePromotion,
  getPromotionExpiry,
  isPromotionActive,
} from "../lib/sponsorship";
import { normalizePolarWebhookData } from "../lib/polar-webhook";

test("a promotion remains active until its exact duration boundary", () => {
  const paidAt = "2026-10-01T12:00:00.000Z";
  const expiresAt = getPromotionExpiry(paidAt, 7);

  expect(expiresAt?.toISOString()).toBe("2026-10-08T12:00:00.000Z");
  expect(
    isPromotionActive(
      { status: "paid", paid_at: paidAt, promotion_days: 7 },
      Date.parse("2026-10-08T11:59:59.999Z"),
    ),
  ).toBe(true);
  expect(
    isPromotionActive(
      { status: "paid", paid_at: paidAt, promotion_days: 7 },
      Date.parse("2026-10-08T12:00:00.000Z"),
    ),
  ).toBe(false);
});

test("the promotion with the latest valid expiry is selected", () => {
  const activePromotion = getActivePromotion(
    [
      {
        status: "paid",
        paid_at: "2026-10-01T12:00:00.000Z",
        promotion_days: 7,
      },
      {
        status: "paid",
        paid_at: "2026-10-06T12:00:00.000Z",
        promotion_days: 30,
      },
      {
        status: "refunded",
        paid_at: "2026-10-07T12:00:00.000Z",
        promotion_days: 90,
      },
    ],
    Date.parse("2026-10-08T12:00:00.000Z"),
  );

  expect(activePromotion).toMatchObject({ promotion_days: 30 });
});

test("Polar webhook snake_case identifiers are normalized for order matching", () => {
  const orderData = normalizePolarWebhookData({
    checkout_id: "3cdaecaa-f569-470f-b025-d6649bfdb160",
    product_id: "545a95a6-1c0c-4765-930e-3816aab19876",
  });

  expect(orderData.checkoutId).toBe("3cdaecaa-f569-470f-b025-d6649bfdb160");
  expect(orderData.productId).toBe("545a95a6-1c0c-4765-930e-3816aab19876");
});
