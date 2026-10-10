"use client";

import {
  FaBehance,
  FaDiscord,
  FaDribbble,
  FaFacebookF,
  FaGithub,
  FaInstagram,
  FaLinkedinIn,
  FaThreads,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import CachedImage from "./CachedImage";
import ProfileAwardsList from "./ProfileAwardsList";
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";
import InputArea from "./InputArea";
import CustomProfileSectionContent from "./CustomProfileSectionContent";
import { getProfileHandle } from "@/lib/profile-handle";
import { parseProfileAwards } from "@/lib/profile-awards";
import { isSafeExternalUrl } from "@/lib/safe-url";
import {
  getActiveCustomProfileSections,
  type CustomProfileSection,
} from "@/lib/profile-sections";

type TurnstileWidget = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidget;
  }
}

type ProfileModalProps = {
  profileId: string;
  handle?: string | null;
  name: string;
  role: string;
  bio: string | null;
  location?: string | null;
  awards?: string | null;
  experience?: string | null;
  customSections?: CustomProfileSection[];
  image?: string | null;
  hoverMedia?: {
    type: "image" | "video";
    url: string;
  } | null;
  socialLinks: {
    id: string;
    type: string;
    url: string;
  }[];
  isSaved: boolean;
  onToggleSave: (profileId: string) => void;
  onClose: () => void;
};

type ExperienceEntry = {
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
};

const parseExperienceEntries = (
  value: string | null | undefined,
): ExperienceEntry[] => {
  if (!value || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (item): item is Partial<ExperienceEntry> =>
            !!item && typeof item === "object",
        )
        .map((item) => ({
          role: typeof item.role === "string" ? item.role : "",
          company: typeof item.company === "string" ? item.company : "",
          startDate: typeof item.startDate === "string" ? item.startDate : "",
          endDate: typeof item.endDate === "string" ? item.endDate : "",
          description:
            typeof item.description === "string" ? item.description : "",
        }));
    }

    if (parsed && typeof parsed === "object") {
      const candidate = parsed as Partial<ExperienceEntry>;
      return [
        {
          role: typeof candidate.role === "string" ? candidate.role : "",
          company:
            typeof candidate.company === "string" ? candidate.company : "",
          startDate:
            typeof candidate.startDate === "string" ? candidate.startDate : "",
          endDate:
            typeof candidate.endDate === "string" ? candidate.endDate : "",
          description:
            typeof candidate.description === "string"
              ? candidate.description
              : "",
        },
      ];
    }
  } catch {
    // Legacy plain-text values are rendered as a single description.
  }

  return [
    {
      role: "",
      company: "",
      startDate: "",
      endDate: "",
      description: value.trim(),
    },
  ];
};

const formatExperienceDateRange = (entry: ExperienceEntry) => {
  const startDate = entry.startDate.trim();
  const endDate = entry.endDate.trim();

  if (!startDate && !endDate) return "";
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate) return `${startDate} – Present`;
  return endDate;
};

const getExperienceRecency = (entry: ExperienceEntry) => {
  const startDate = entry.startDate.trim();
  const endDate = entry.endDate.trim();

  if (!startDate && !endDate) return null;
  if (!endDate || /^(present|current)$/i.test(endDate)) {
    return Number.POSITIVE_INFINITY;
  }

  const endTimestamp = Date.parse(endDate);
  if (Number.isFinite(endTimestamp)) return endTimestamp;

  const startTimestamp = Date.parse(startDate);
  return Number.isFinite(startTimestamp) ? startTimestamp : null;
};

const formatExperienceTitle = (entry: ExperienceEntry) => {
  const role = entry.role.trim();
  const company = entry.company.trim();

  if (role && company) {
    return `${company} — ${role}`;
  }

  return role || company;
};

const ProfileModal = ({
  profileId,
  handle,
  name,
  role,
  bio,
  location,
  awards,
  experience,
  customSections = [],
  image,
  hoverMedia,
  socialLinks,
  isSaved,
  onToggleSave,
  onClose,
}: ProfileModalProps) => {
  const formattedBio = bio
    ? bio.replace(
        /^(\s*)(\S)/,
        (_, whitespace, firstCharacter) =>
          `${whitespace}${firstCharacter.toUpperCase()}`,
      )
    : "No bio available.";
  const profileRoles = role
    .split(/[|,]/)
    .map((value) => value.trim())
    .filter(Boolean);
  const experienceEntries = parseExperienceEntries(experience).sort((left, right) => {
    const leftRecency = getExperienceRecency(left);
    const rightRecency = getExperienceRecency(right);

    if (leftRecency === rightRecency) return 0;
    if (leftRecency === null) return 1;
    if (rightRecency === null) return -1;
    return rightRecency - leftRecency;
  });
  const hasAwards = parseProfileAwards(awards).length > 0;

  const [isClosing, setIsClosing] = useState(false);
  const [isGalleryHovered, setIsGalleryHovered] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share profile");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("ZA");
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const isClosingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const closeTimerRef = useRef<number | null>(null);
  const inquiryFormRef = useRef<HTMLFormElement>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    void fetch("/api/profile-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    })
      .then((response) => {
        if (!response.ok) {
          console.error("Could not record profile view", response.status);
        }
      })
      .catch((error: unknown) => {
        console.error("Could not record profile view", error);
      });
  }, [profileId]);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!isContactOpen || !siteKey || !captchaRef.current) return;

    const removeWidget = () => {
      const currentWidgetId = widgetIdRef.current;
      if (currentWidgetId && window.turnstile) {
        try {
          window.turnstile.remove(currentWidgetId);
        } catch {
          // Ignore stale widget cleanup attempts; the widget may already be gone.
        }
      }
      widgetIdRef.current = null;
      setCaptchaToken("");
    };

    const renderCaptcha = () => {
      if (!captchaRef.current || !window.turnstile) return;

      removeWidget();
      captchaRef.current.innerHTML = "";
      widgetIdRef.current = window.turnstile.render(captchaRef.current, {
        sitekey: siteKey,
        callback: setCaptchaToken,
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setCaptchaToken(""),
      });
    };

    if (window.turnstile) {
      renderCaptcha();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.onload = renderCaptcha;
      document.head.appendChild(script);
    }

    return () => {
      removeWidget();
    };
  }, [isContactOpen]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeModal = useCallback(() => {
    if (isClosingRef.current) return;

    isClosingRef.current = true;
    setIsClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      onCloseRef.current();
    }, 500);
  }, []);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?profile=${encodeURIComponent(handle ?? getProfileHandle(name))}`;
    setShareLabel("Copying...");

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLabel("Link copied");
      window.setTimeout(() => setShareLabel("Share profile"), 2000);
    } catch {
      setShareLabel("Could not share");
      window.setTimeout(() => setShareLabel("Share profile"), 2000);
    }
  };

  const handleInquirySubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
      setInquiryStatus("error");
      setInquiryMessage("Please complete the CAPTCHA and try again.");
      return;
    }
    setInquiryStatus("sending");
    setInquiryMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        senderName: formData.get("senderName"),
        senderEmail: formData.get("senderEmail"),
        senderCountry: phoneCountry,
        senderPhone: formData.get("senderPhone"),
        captchaToken,
        projectType: formData.get("projectType"),
        companyName: formData.get("companyName"),
        project: formData.get("project"),
        budget: formData.get("budget"),
        timeline: formData.get("timeline"),
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setInquiryStatus("error");
      setInquiryMessage(result.error ?? "Could not send your inquiry.");
      return;
    }

    posthog.capture("profile_inquiry_sent");
    setInquiryStatus("sent");
    setInquiryMessage("Your inquiry has been sent.");
    inquiryFormRef.current?.reset();
  };

  const socialLabels: Record<string, string> = {
    portfolio: "Portfolio",
    github: "GitHub",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    dribbble: "Dribbble",
    behance: "Behance",
    discord: "Discord",
    awwwards: "awwwards",
    facebook: "Facebook",
    youtube: "YouTube",
    tiktok: "TikTok",
    x: "X",
    threads: "Threads",
    booking: "Booking link",
  };

  const socialIcons: Record<string, React.ReactNode> = {
    portfolio: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 rotate-90"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
    ),
    github: <FaGithub aria-hidden="true" />,
    linkedin: <FaLinkedinIn aria-hidden="true" />,
    instagram: <FaInstagram aria-hidden="true" />,
    dribbble: <FaDribbble aria-hidden="true" />,
    behance: <FaBehance aria-hidden="true" />,
    awwwards: (
      <svg width="20" height="16" fill="currentColor" viewBox="0 0 30 16">
        <path d="m18.4 0-2.803 10.855L12.951 0H9.34L6.693 10.855 3.892 0H0l5.012 15.812h3.425l2.708-10.228 2.709 10.228h3.425L22.29 0h-3.892ZM24.77 13.365c0 1.506 1.12 2.635 2.615 2.635C28.879 16 30 14.87 30 13.365c0-1.506-1.12-2.636-2.615-2.636s-2.615 1.13-2.615 2.636Z"></path>
      </svg>
    ),
    discord: <FaDiscord aria-hidden="true" />,
    facebook: <FaFacebookF aria-hidden="true" />,
    youtube: <FaYoutube aria-hidden="true" />,
    tiktok: <FaTiktok aria-hidden="true" />,
    x: <FaXTwitter aria-hidden="true" />,
    threads: <FaThreads aria-hidden="true" />,
    booking: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18M8 15h3" />
      </svg>
    ),
  };
  const visibleSocialLinks = socialLinks.filter((link) =>
    isSafeExternalUrl(link.url),
  );

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [closeModal]);

  return (
    <>
      <button
        type="button"
        aria-label="Close profile modal"
        onClick={closeModal}
        className={`profile-modal-backdrop fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm ${
          isClosing ? "profile-modal-backdrop-exit" : ""
        }`}
      />

      <button
        type="button"
        aria-label="Close profile modal"
        onClick={closeModal}
        className={`profile-modal-close w-8 p-1 bg-white h-8 flex items-center justify-center fixed right-1/2 bottom-[calc(90vh+8px)] z-50 translate-x-1/2 cursor-pointer rounded-full  text-white ${
          isClosing ? "profile-modal-close-exit" : ""
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#000"
        >
          <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
        </svg>
      </button>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        data-lenis-prevent
        onWheelCapture={(event) => event.stopPropagation()}
        onTouchMoveCapture={(event) => event.stopPropagation()}
        className={`profile-modal-sheet fixed bottom-0 left-0 right-0 z-50 flex h-[90vh] max-h-[90dvh] min-h-0 touch-pan-y flex-col overflow-y-scroll overscroll-contain rounded-t bg-white px-6 py-10 shadow-2xl geist sm:px-10 ${
          isClosing ? "profile-modal-sheet-exit" : ""
        }`}
      >
        <div
          className={`${isContactOpen ? "hidden" : "profile-modal-view profile-modal-view-profile mx-auto mt-10 flex w-full max-w-xl flex-col gap-6 pb-10"}`}
        >
          <div className="flex flex-col gap-2">
            <h1
              id="profile-modal-title"
              className="mb-1  text-3xl font-semibold leading-tight tracking-tighter sm:text-4xl md:text-6xl md:leading-12"
            >
              {name}
            </h1>

            <span className=" flex flex-col gap-1 text-sm font-medium capitalize tracking-tight">
              <span className="flex flex-wrap gap-1">
                {(profileRoles.length ? profileRoles : ["Developer"]).map(
                  (profileRole, index, rolesToDisplay) => (
                    <span key={profileRole} className="w-fit rounded-full">
                      {profileRole}
                      {index < rolesToDisplay.length - 1 ? "," : ""}
                    </span>
                  ),
                )}
              </span>
            </span>
            <span className=" -mt-2 flex flex-col gap-1 text-xs mono font-medium capitalize tracking-tight text-[#999]">
              <span className="w-fit rounded-full uppercase text-[#999] ">
                {location || "Unknown location"}
              </span>
            </span>
            <span className=" flex mt-10 gap-2">
              {visibleSocialLinks.length ? (
                <div className=" grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                  <span className="text-sm font-medium tracking-tight text-[#999]">
                    Let&apos;s Connect
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {visibleSocialLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={socialLabels[link.type] ?? link.type}
                        title={socialLabels[link.type] ?? link.type}
                        className="flex h-7 w-5 items-center justify-center rounded-full text-base transition"
                      >
                        {socialIcons[link.type] ?? (
                          <span className="text-xl font-semibold uppercase">
                            {link.type.slice(0, 2)}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </span>
          </div>

          <div className=" grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <span className="text-sm font-medium tracking-tight text-[#999]">
              About Me
            </span>

            <span className="whitespace-pre-line text-justify text-sm font-medium leading-4 tracking-tight">
              {formattedBio}
            </span>
          </div>
          {experienceEntries.length ? (
            <div className=" grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
              <span className="text-sm font-medium tracking-tight text-[#999]">
                Work Experiences
              </span>

              <div className="flex flex-col gap-6">
                {experienceEntries.map((experienceEntry, index) => {
                  const hasDetail =
                    experienceEntry.role ||
                    experienceEntry.company ||
                    experienceEntry.startDate ||
                    experienceEntry.endDate ||
                    experienceEntry.description;

                  if (!hasDetail) return null;

                  const dateRange = formatExperienceDateRange(experienceEntry);

                  return (
                    <div
                      key={`${experienceEntry.company}-${experienceEntry.role}-${index}`}
                      className=" flex flex-col gap-1"
                    >
                      <div className="flex flex-col ">
                        <span className="text-sm font-medium leading-tight capitalize tracking-tight text-black">
                          {experienceEntry.company}
                        </span>
                        {dateRange ? (
                          <span className=" text-xs  font-semibold uppercase tracking-tight text-[#999]">
                            {dateRange}{" "}
                          </span>
                        ) : (
                          <span className=" text-sm font-semibold tracking-tight text-black/45">
                            —
                          </span>
                        )}

                        {experienceEntry.description ? (
                          <p className="mt-4 geist font-medium text-justify whitespace-pre-line text-sm leading-4 tracking-tight  text-[#000]">
                            {experienceEntry.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {hasAwards ? (
            <div className=" grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
              <span className="text-sm font-medium tracking-tight text-[#999]">
                Honours
              </span>
              <ProfileAwardsList value={awards ?? ""} />
            </div>
          ) : null}
          {getActiveCustomProfileSections(customSections).map(
            (section, index) => (
              <div
                key={`${section.title}-${index}`}
                className="grid gap-3  border-black/10 pt-5 sm:grid-cols-[140px_minmax(0,1fr)]"
              >
                <span className="text-sm capitalize font-medium tracking-tight text-[#999]">
                  {section.title}
                </span>
                <CustomProfileSectionContent content={section.content} />
              </div>
            ),
          )}

          <div className=" grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <span className="text-sm font-medium tracking-tight text-[#999]">
              Gallery
            </span>

            <div
              className="group relative aspect-[4/5] w-70 overflow-hidden bg-black/5"
              role="group"
              onMouseEnter={() => setIsGalleryHovered(true)}
              onMouseLeave={() => setIsGalleryHovered(false)}
              onFocus={() => setIsGalleryHovered(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsGalleryHovered(false);
                }
              }}
              tabIndex={hoverMedia ? 0 : undefined}
              aria-label={`${name} profile image${hoverMedia ? ". Hover or focus to view alternate media." : ""}`}
            >
              {image ? (
                <CachedImage
                  src={image}
                  alt={`${name} profile`}
                  className={`absolute cursor-pointer inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                    isGalleryHovered && hoverMedia ? "opacity-0" : "opacity-100"
                  }`}
                />
              ) : null}
              {hoverMedia?.type === "image" ? (
                <CachedImage
                  src={hoverMedia.url}
                  alt={`${name} alternate profile image`}
                  className={`absolute cursor-pointer inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                    isGalleryHovered ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : null}
              {isGalleryHovered && hoverMedia?.type === "video" ? (
                <video
                  src={hoverMedia.url}
                  autoPlay
                  loop
                  playsInline
                  controls={false}
                  aria-label={`${name} profile video`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              {!image && !isGalleryHovered ? (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[#999]">
                  No profile image.
                </div>
              ) : null}
            </div>
          </div>

          <div className=" grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <span className="text-sm font-medium tracking-tight text-[#999]">
              Quick Actions
            </span>
            <div className=" flex items-center justify-between w-full">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="max-w-full geist max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
                >
                  {shareLabel === "Share profile" ? "Share" : shareLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsContactOpen(true);
                    setInquiryStatus("idle");
                    setInquiryMessage("");
                  }}
                  className="max-w-full geist max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
                >
                  Contact
                </button>{" "}
                <button
                  type="button"
                  aria-label={
                    isSaved
                      ? `Remove ${name} from saved profiles`
                      : `Save ${name} profile`
                  }
                  aria-pressed={isSaved}
                  title={
                    isSaved ? "Remove from saved profiles" : "Save profile"
                  }
                  onClick={() => onToggleSave(profileId)}
                  className="max-w-full geist max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
                >
                  {isSaved ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
        {isContactOpen ? (
          inquiryStatus === "sent" ? (
            <div className="profile-modal-view h-full mx-auto mt-10 flex w-full max-w-xl self-center flex-col items-center justify-center gap-5 pb-10 text-center">
              <div>
                <h2 className="mt-2 text-4xl font-semibold tracking-tighter">
                  You&apos;re all set.
                </h2>
                <p className="mt-3 max-w-md font-medium tracking-tight text-sm leading-relaxed mono uppercase text-[#999]">
                  {name} has received your details and can follow up by email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsContactOpen(false);
                  setInquiryStatus("idle");
                  setInquiryMessage("");
                }}
                className="w-fit mono hidden cursor-pointer rounded-full bg-black p-1 px-2 mono text-xs font-semibold uppercase tracking-tight text-white transition hover:bg-[#1c40f2]/50"
              >
                Close
              </button>
            </div>
          ) : (
            <form
              ref={inquiryFormRef}
              onSubmit={handleInquirySubmit}
              className="profile-modal-view profile-modal-view-form mx-auto mt-10 flex w-full max-w-xl flex-col gap-5 pb-10"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="mt-2 text-4xl font-semibold tracking-tighter">
                    {name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsContactOpen(false)}
                  className="text-sm font-semibold text-[#666] transition hover:text-black"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#999"
                  >
                    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                  </svg>
                </button>
              </div>

              <span className="text-[#999] mono text-sm mb-2 font-medium tracking-tighter uppercase ">
                Tell {name} what you need.
              </span>

              <div className="flex gap-4">
                <InputArea
                  name="senderName"
                  required
                  placeholder="Full name"
                  className="text-sm outline-none focus:border-black"
                />
                <InputArea
                  name="senderEmail"
                  required
                  type="email"
                  placeholder="Email address"
                  className="text-sm outline-none focus:border-black"
                />
              </div>
              <div className="relative flex items-center">
                <button
                  type="button"
                  aria-label="Choose country calling code"
                  aria-expanded={isCountryPickerOpen}
                  onClick={() => setIsCountryPickerOpen((current) => !current)}
                  className="mr-1 flex items-center gap-1 rounded bg-black px-2 py-2 text-sm font-semibold text-white"
                >
                  +{getCountryCallingCode(phoneCountry)}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 -960 960 960"
                    width="16"
                    height="16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" />
                  </svg>
                </button>
                {isCountryPickerOpen ? (
                  <div className="absolute scrollbar-hide left-0 z-20 mb-2 max-h-64 w-64 overflow-y-auto rounded border border-black/10 bg-white p-1 shadow-2xl">
                    {getCountries().map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => {
                          setPhoneCountry(country);
                          setIsCountryPickerOpen(false);
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded px-3 py-2 text-left text-xs transition hover:bg-black hover:text-white ${
                          country === phoneCountry ? "bg-black/10" : ""
                        }`}
                      >
                        <span>{country}</span>
                        <span>+{getCountryCallingCode(country)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <InputArea
                  name="senderPhone"
                  type="tel"
                  placeholder="Phone number"
                  className="border-0 text-sm outline-none focus:border-black"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <InputArea
                  name="projectType"
                  maxLength={120}
                  placeholder="Project type (optional)"
                  className="text-sm outline-none focus:border-black"
                />
                <InputArea
                  name="companyName"
                  maxLength={200}
                  placeholder="Company name (optional)"
                  className="text-sm outline-none focus:border-black"
                />
              </div>
              <InputArea
                as="textarea"
                name="project"
                required
                minLength={1}
                rows={5}
                placeholder="What are you looking to make?"
                className=" p-3 text-sm outline-none focus:border-black/0"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex bg-black/5 w-full items-center  pl-2 w-fit h-fit rounded">
                  <span className="  text-sm font-semibold ">$</span>
                  <InputArea
                    name="budget"
                    placeholder="Budget (optional)"
                    className="border-none bg-transparent"
                  />
                </div>
                <div className="bg-black/5 pr-1 rounded">
                  <select
                    name="timeline"
                    defaultValue=""
                    className="w-full p-2 rounded text-sm font-medium tracking-tight text-black outline-none focus:border-black"
                  >
                    <option value="" disabled>
                      Choose timeline
                    </option>
                    <option value="ASAP">ASAP</option>
                    <option value="2 weeks">2 weeks</option>
                    <option value="1 month">1 month</option>
                    <option value="By a specific date">
                      By a specific date
                    </option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
              </div>
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                <div ref={captchaRef} />
              ) : null}
              <button
                type="submit"
                disabled={inquiryStatus === "sending"}
                className="max-w-full geist max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere] w-fit"
              >
                {inquiryStatus === "sending" ? "Sending..." : "Send"}
              </button>
              {inquiryMessage ? (
                <p
                  className={`text-sm font-medium tracking-tight ${inquiryStatus === "error" ? "text-red-600" : "text-[#1c40f2]"}`}
                >
                  {inquiryMessage}
                </p>
              ) : null}
            </form>
          )
        ) : null}
      </section>
    </>
  );
};

export default ProfileModal;
