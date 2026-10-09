export const PASSKEY_RP_ID = "weeverything.xyz";

export const getPasskeyDomainError = (hostname: string) => {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
  const isSupportedDomain =
    normalizedHostname === PASSKEY_RP_ID ||
    normalizedHostname.endsWith(`.${PASSKEY_RP_ID}`);

  return isSupportedDomain
    ? null
    : `Passkeys work on ${PASSKEY_RP_ID}. Open https://${PASSKEY_RP_ID} to add or use a passkey.`;
};
