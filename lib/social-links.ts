export type SocialPlatform =
  | "portfolio"
  | "github"
  | "linkedin"
  | "instagram"
  | "dribbble"
  | "behance"
  | "awwwards"
  | "discord"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "x"
  | "threads"
  | "email";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const platformConfig: Record<
  Exclude<SocialPlatform, "portfolio" | "email">,
  { hosts: string[]; prefix: string }
> = {
  github: { hosts: ["github.com", "www.github.com"], prefix: "/" },
  linkedin: {
    hosts: ["linkedin.com", "www.linkedin.com"],
    prefix: "/in/",
  },
  instagram: { hosts: ["instagram.com", "www.instagram.com"], prefix: "/" },
  dribbble: { hosts: ["dribbble.com", "www.dribbble.com"], prefix: "/" },
  behance: { hosts: ["behance.net", "www.behance.net"], prefix: "/" },
  awwwards: { hosts: ["awwwards.com", "www.awwwards.com"], prefix: "/" },
  discord: { hosts: ["discord.com", "www.discord.com"], prefix: "/users/" },
  facebook: { hosts: ["facebook.com", "www.facebook.com"], prefix: "" },
  youtube: { hosts: ["youtube.com", "www.youtube.com"], prefix: "/@" },
  tiktok: { hosts: ["tiktok.com", "www.tiktok.com"], prefix: "/@" },
  x: {
    hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
    prefix: "",
  },
  threads: {
    hosts: ["threads.net", "www.threads.net"],
    prefix: "/@",
  },
};

const handlePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export const isValidEmailAddress = (value: string) =>
  emailPattern.test(value.trim());

export const isValidSocialHandle = (value: string) =>
  handlePattern.test(value.trim().replace(/^@/, ""));

export const getSocialUrl = (platform: SocialPlatform, value: string) => {
  const trimmedValue = value.trim();

  if (platform === "portfolio") return trimmedValue;
  if (platform === "email") {
    return isValidEmailAddress(trimmedValue) ? `mailto:${trimmedValue}` : null;
  }

  const handle = trimmedValue.replace(/^@/, "");
  if (!isValidSocialHandle(handle)) return null;

  const config = platformConfig[platform];
  return `https://${config.hosts[0]}${config.prefix}${encodeURIComponent(handle)}`;
};

export const getSocialInputValue = (
  platform: SocialPlatform,
  storedUrl: string,
) => {
  if (platform === "portfolio") return storedUrl;

  const storedValue = storedUrl.trim();

  if (platform === "email") {
    const emailValue = storedValue.replace(/^mailto:/i, "").trim();
    return isValidEmailAddress(emailValue) ? emailValue : "";
  }

  const storedHandle = storedValue.replace(/^@/, "");

  // Older records may contain a username instead of a canonical URL.
  if (isValidSocialHandle(storedHandle)) return storedHandle;

  try {
    const url = new URL(storedValue);
    const config = platformConfig[platform];

    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !config.hosts.includes(url.hostname.toLowerCase())
    ) {
      return "";
    }

    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    const pathSegments = path.split("/").filter(Boolean);
    const prefix = config.prefix.replace(/^\/+|\/+$/g, "");
    const handle =
      prefix === "@"
        ? pathSegments[0]?.replace(/^@/, "")
        : prefix
          ? pathSegments[0] === prefix
            ? pathSegments[1]
            : undefined
          : pathSegments[0];

    return handle ? decodeURIComponent(handle).replace(/^@/, "") : "";
  } catch {
    return "";
  }
};
