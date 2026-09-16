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

type ProfileModalProps = {
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
  const isClosingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const closeTimerRef = useRef<number | null>(null);

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
        <div className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-6 pb-10">
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
        </div>
      </section>
    </>
  );
};

export default ProfileModal;
