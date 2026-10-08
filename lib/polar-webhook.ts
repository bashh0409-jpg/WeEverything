export const normalizePolarWebhookData = (data: Record<string, unknown>) => ({
  ...data,
  checkoutId: data.checkoutId ?? data.checkout_id ?? null,
  productId: data.productId ?? data.product_id ?? null,
});
