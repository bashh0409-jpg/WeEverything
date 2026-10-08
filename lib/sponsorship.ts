export const PROMOTION_PACKAGES = [
  { days: 7, amount: 500 },
  { days: 30, amount: 1500 },
  { days: 90, amount: 3000 },
] as const;

export type PromotionDays = (typeof PROMOTION_PACKAGES)[number]["days"];

export type PromotionPayment = {
  status: string;
  paid_at: string | null;
  promotion_days: number;
};

export const getPromotionPackage = (days: number) =>
  PROMOTION_PACKAGES.find((promotion) => promotion.days === days) ?? null;

export const getPromotionExpiry = (
  paidAt: string | null,
  promotionDays: number,
) => {
  if (!paidAt || !Number.isInteger(promotionDays) || promotionDays <= 0) {
    return null;
  }

  const timestamp = Date.parse(paidAt);
  if (!Number.isFinite(timestamp)) return null;

  return new Date(timestamp + promotionDays * 24 * 60 * 60 * 1000);
};

export const isPromotionActive = (
  payment: PromotionPayment | null,
  now = Date.now(),
) => {
  if (!payment || payment.status !== "paid") return false;

  const expiresAt = getPromotionExpiry(
    payment.paid_at,
    payment.promotion_days,
  );
  return expiresAt !== null && expiresAt.getTime() > now;
};

export const getActivePromotion = (
  payments: readonly PromotionPayment[],
  now = Date.now(),
) =>
  payments.reduce<PromotionPayment | null>((latest, payment) => {
    if (!isPromotionActive(payment, now)) return latest;
    if (!latest) return payment;

    const expiresAt =
      getPromotionExpiry(payment.paid_at, payment.promotion_days)?.getTime() ??
      0;
    const latestExpiresAt =
      getPromotionExpiry(latest.paid_at, latest.promotion_days)?.getTime() ?? 0;

    return expiresAt > latestExpiresAt ? payment : latest;
  }, null);
