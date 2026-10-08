export const isMobilePhoneUserAgent = (userAgent: string) =>
  /Mobi|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini|Android.*Mobile/i.test(
    userAgent,
  );
