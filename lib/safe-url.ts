export const isSafeExternalUrl = (value: string) => {
  try {
    const url = new URL(value.trim());

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
};
