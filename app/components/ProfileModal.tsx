"use client";

import {
  FaBehance,
  FaDiscord,
  FaDribbble,
  FaFacebookF,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaThreads,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";
import InputArea from "./InputArea";

type ProfileModalProps = {
  profileId: string;
  name: string;
  role: string;
  bio: string | null;
  location?: string | null;
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
  onClose: () => void;
};

const ProfileModal = ({
  profileId,
  name,
  role,
  bio,
  location,
  image,
  hoverMedia,
  socialLinks,
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

  const [isClosing, setIsClosing] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share profile");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("ZA");
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const isClosingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const closeTimerRef = useRef<number | null>(null);
  const inquiryFormRef = useRef<HTMLFormElement>(null);

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
    const shareUrl = `${window.location.origin}/?profile=${encodeURIComponent(profileId)}`;
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
    facebook: "Facebook",
    youtube: "YouTube",
    tiktok: "TikTok",
    x: "X",
    threads: "Threads",
  };

  const socialIcons: Record<string, React.ReactNode> = {
    portfolio: <FaGlobe aria-hidden="true" />,
    github: <FaGithub aria-hidden="true" />,
    linkedin: <FaLinkedinIn aria-hidden="true" />,
    instagram: <FaInstagram aria-hidden="true" />,
    dribbble: <FaDribbble aria-hidden="true" />,
    behance: <FaBehance aria-hidden="true" />,
    discord: <FaDiscord aria-hidden="true" />,
    facebook: <FaFacebookF aria-hidden="true" />,
    youtube: <FaYoutube aria-hidden="true" />,
    tiktok: <FaTiktok aria-hidden="true" />,
    x: <FaXTwitter aria-hidden="true" />,
    threads: <FaThreads aria-hidden="true" />,
  };

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
        className={`profile-modal-close w-10 h-10 flex items-center justify-center fixed right-1/2 bottom-[calc(90vh+0px)] z-50 translate-x-1/2 cursor-pointer rounded-full  text-white ${
          isClosing ? "profile-modal-close-exit" : ""
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="40px"
          viewBox="0 -960 960 960"
          width="40px"
          fill="currentColor"
        >
          <path d="M160-380v-66.67h640V-380H160Zm0-133.33V-580h640v66.67H160Z" />
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
              className="mb-2 max-w-full text-3xl font-semibold leading-tight tracking-tighter sm:text-4xl md:max-w-[60%] md:text-6xl md:leading-12"
            >
              {name}
            </h1>

            <span className=" flex flex-col gap-1 text-sm font-medium capitalize tracking-tight">
              <span className="flex flex-wrap gap-1">
                {(profileRoles.length ? profileRoles : ["Designer"]).map(
                  (profileRole, index, rolesToDisplay) => (
                    <span key={profileRole} className="w-fit rounded-full">
                      {profileRole}
                      {index < rolesToDisplay.length - 1 ? "," : ""}
                    </span>
                  ),
                )}
              </span>
            </span>
            <span className="mb-4 flex flex-col gap-1 text-sm font-medium capitalize tracking-tight">
              <span className="w-fit rounded-full bg-black/10 px-2 py-1">
                {location || "Unknown location"}
              </span>
            </span>
            <span className="flex gap-2 -mt-4">
              {socialLinks.length ? (
                <div className="flex flex-wrap">
                  {socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={socialLabels[link.type] ?? link.type}
                      title={socialLabels[link.type] ?? link.type}
                      className="flex w-7 h-7 items-center justify-center rounded-full text-base transition "
                    >
                      {socialIcons[link.type] ?? (
                        <span className="text-lg font-semibold uppercase">
                          {link.type.slice(0, 2)}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-medium">
                  No social links added.
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium tracking-tight text-[#999]">
              About Me
            </span>

            <span className="text-sm font-medium leading-4 tracking-tight">
              {formattedBio}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium tracking-tight text-[#999]">
              Profile
            </span>

            {hoverMedia?.type === "video" ? (
              <video
                src={hoverMedia.url}
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                aria-label={`${name} profile video`}
                className="aspect-[4/5] w-80 object-cover"
              />
            ) : image ? (
              <img
                src={image}
                alt={`${name} profile`}
                className="aspect-[4/5] w-80 object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] w-80 items-center justify-center bg-black/10 text-sm font-medium text-[#999]">
                No profile image.
              </div>
            )}
          </div>

          <div className="flex flex-col hidden gap-2">
            <span className="text-sm font-medium tracking-tight text-[#999]">
              Find Me On
            </span>

            {socialLinks.length ? (
              <div className="flex flex-wrap">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={socialLabels[link.type] ?? link.type}
                    title={socialLabels[link.type] ?? link.type}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-base transition hover:bg-black hover:text-white"
                  >
                    {socialIcons[link.type] ?? (
                      <span className="text-xs font-semibold uppercase">
                        {link.type.slice(0, 2)}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-sm font-medium">
                No social links added.
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="w-fit cursor-pointer text-xs mono text-white   font-semibold uppercase tracking-tight  bg-black p-1 rounded-full px-2 transition hover:bg-black/50 "
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
              className="w-fit cursor-pointer rounded-full bg-[#1c40f2] p-1 px-2 mono text-xs font-semibold uppercase tracking-tight text-white transition hover:bg-[#1c40f2]/50"
            >
              Contact
            </button>
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
                className="w-fit mono cursor-pointer rounded-full bg-black p-1 px-2 mono text-xs font-semibold uppercase tracking-tight text-white transition hover:bg-[#1c40f2]/50"
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
                  placeholder="Your name"
                  className="text-sm outline-none focus:border-black"
                />
                <InputArea
                  name="senderEmail"
                  required
                  type="email"
                  placeholder="Your email"
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
                  <div className="absolute bottom-ful left-0 z-20 mb-2 max-h-64 w-64 overflow-y-auto rounded border border-black/10 bg-white p-1 shadow-2xl">
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
                  placeholder="Phone number (optional)"
                  className="border-0 text-sm outline-none focus:border-black"
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
                <div className="flex bg-black/5 w-full items-center  px-2 w-fit h-fit rounded">
                  <span className="pr-2  text-sm font-semibold text-[#999]">
                    $
                  </span>
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
              <button
                type="submit"
                disabled={inquiryStatus === "sending"}
                className="w-fit cursor-pointer rounded-full bg-black p-1 px-2 mono text-xs font-semibold uppercase tracking-tight text-white transition hover:bg-[#1c40f2]/50"
              >
                {inquiryStatus === "sending" ? "Sending..." : "Send inquiry"}
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
