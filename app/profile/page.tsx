"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  FaBehance,
  FaDiscord,
  FaDribbble,
  FaEnvelope,
  FaFacebookF,
  FaGithub,
  FaInstagram,
  FaLinkedinIn,
  FaThreads,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { User } from "@supabase/supabase-js";
import Navbar from "../components/Navbar";
import InputArea from "../components/InputArea";
import { supabase } from "@/lib/supabase/client";
import { getProfileHandle } from "@/lib/profile-handle";
import { roles } from "@/lib/roles";
import { isSafeExternalUrl } from "@/lib/safe-url";
import {
  getSocialInputValue,
  getSocialUrl,
  isValidEmailAddress,
  isValidSocialHandle,
} from "@/lib/social-links";
import {
  MAX_CUSTOM_PROFILE_SECTIONS,
  MAX_CUSTOM_PROFILE_SECTION_CONTENT_LENGTH,
  MAX_CUSTOM_PROFILE_SECTION_TITLE_LENGTH,
  getActiveCustomProfileSections,
  isCustomProfileSectionExpired,
  parseCustomProfileSections,
  type CustomProfileSection,
} from "@/lib/profile-sections";

type ProfileRecord = {
  id: string;
  handle: string | null;
  name: string | null;
  role: string | null;
  bio: string | null;
  location: string | null;
  awards: string | null;
  experience: string | null;
  custom_sections: CustomProfileSection[] | null;
  avatar_url: string | null;
  is_published: boolean | null;
};

type ProfileMedia = {
  id: string;
  profile_id: string;
  storage_path: string;
  media_type: "image" | "video";
  position: number;
};

type SponsorshipPayment = {
  status: string;
  paid_at: string | null;
};

const SPONSORSHIP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const isActiveSponsorship = (payment: SponsorshipPayment | null) => {
  if (!payment || payment.status !== "paid" || !payment.paid_at) return false;

  const paidAt = Date.parse(payment.paid_at);
  if (!Number.isFinite(paidAt)) return false;

  return Date.now() - paidAt <= SPONSORSHIP_TTL_MS;
};

type ProfileInquiry = {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  project_type: string | null;
  company_name: string | null;
  project_brief: string;
  budget: string | null;
  timeline: string | null;
  created_at: string;
  archived_at: string | null;
};

type SocialType =
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
  | "email"
  | "booking";

type SocialLink = {
  id: string;
  type: SocialType;
  url: string;
};

type ProfileForm = {
  name: string;
  role: string;
  bio: string;
  location: string;
  awards: string;
  experience: string;
  custom_sections: CustomProfileSection[];
  avatar_url: string;
  is_published: boolean;
};

type SocialForm = Record<SocialType, string>;

const MEDIA_BUCKET = "profile-media";
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const acceptedMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
];

const ROLE_SEPARATOR = " | ";
const MAX_DISCIPLINES = 6;
const MIN_BIO_WORDS = 20;
const MAX_BIO_WORDS = 350;
const MAX_EXPERIENCE_DESCRIPTION_WORDS = 50;
const EMPTY_CUSTOM_PROFILE_SECTION: CustomProfileSection = {
  title: "",
  content: "",
  expiresOn: null,
};
const MAX_BIO_STYLE_INSTRUCTION_LENGTH = 300;
const MIN_LOCATION_QUERY_LENGTH = 3;
const standardRoles = new Set<string>(roles.filter((role) => role !== "Other"));

const parseRoles = (value: string) =>
  value
    .split("|")
    .map((role) => role.trim())
    .filter(Boolean);

const normalizeCustomRole = (value: string) =>
  value
    .replace(/\|/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

const formatRoles = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join(
    ROLE_SEPARATOR,
  );

const getCustomRole = (value: string) =>
  parseRoles(value).find(
    (role) => role !== "Other" && !standardRoles.has(role),
  ) ?? "";

const getDisciplineCount = (value: string) => {
  const selectedRoles = new Set(
    parseRoles(value).filter((role) => role !== "Other"),
  );

  if (parseRoles(value).includes("Other") && !getCustomRole(value)) {
    selectedRoles.add("Other");
  }

  return selectedRoles.size;
};

const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;

const truncateToWordLimit = (value: string, maximum: number) => {
  let wordCount = 0;

  for (const match of value.matchAll(/\S+/g)) {
    wordCount += 1;
    if (wordCount > maximum) {
      return value.slice(0, match.index).trimEnd();
    }
  }

  return value;
};

const getDeviceTypeLabel = () => {
  if (typeof navigator === "undefined") return "Unknown device";

  const userAgent = navigator.userAgent;

  if (/Mobi|Android|iPhone|iPad|iPod/.test(userAgent)) {
    return "Mobile phone";
  }

  if (/Tablet/.test(userAgent)) {
    return "Tablet";
  }

  return "Desktop computer";
};

const getBrowserDetails = () => {
  if (typeof navigator === "undefined") return "Unknown";

  const userAgent = navigator.userAgent;

  const browser = /EdgA?\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Browser";

  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Macintosh|Mac OS X/i.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad|iPod/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Unknown OS";

  return `${browser} on ${os}`;
};

const parseAwards = (value: string) =>
  value
    .split("\n")
    .map((award) => award.trim())
    .filter(Boolean);

type ExperienceEntry = {
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
};

type LocationSearchStatus = "idle" | "loading" | "error";

const parseLocationSuggestions = (value: unknown): string[] => {
  if (!value || typeof value !== "object" || !("features" in value)) {
    return [];
  }

  const features = value.features;
  if (!Array.isArray(features)) return [];

  const suggestions = features.flatMap((feature): string[] => {
    if (!feature || typeof feature !== "object" || !("properties" in feature)) {
      return [];
    }

    const properties = feature.properties;
    if (!properties || typeof properties !== "object") return [];

    const location = properties as Record<string, unknown>;
    const city =
      (typeof location.city === "string" && location.city.trim()) ||
      (typeof location.name === "string" && location.name.trim());
    const country =
      typeof location.country === "string" ? location.country.trim() : "";

    if (!city || !country) return [];
    return [`${city}, ${country}`];
  });

  return Array.from(new Set(suggestions));
};

const emptyExperienceEntry = (): ExperienceEntry => ({
  role: "",
  company: "",
  startDate: "",
  endDate: "",
  description: "",
});

const hasExperienceEntryData = (entry: ExperienceEntry) =>
  Object.values(entry).some((value) => value.trim());

const parseExperienceEntries = (
  value: string | null | undefined,
): ExperienceEntry[] => {
  if (!value || !value.trim()) return [emptyExperienceEntry()];

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
    // Legacy plain-text values are preserved as a single entry.
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

const serializeExperienceEntries = (entries: ExperienceEntry[]) =>
  JSON.stringify(
    entries
      .map((entry) => ({
        role: entry.role.trim(),
        company: entry.company.trim(),
        startDate: entry.startDate.trim(),
        endDate: entry.endDate.trim(),
        description: entry.description.trim(),
      }))
      .filter(
        (entry) =>
          entry.role ||
          entry.company ||
          entry.startDate ||
          entry.endDate ||
          entry.description,
      ),
  );

const socialOptions: { type: SocialType; label: string }[] = [
  { type: "portfolio", label: "Portfolio" },
  { type: "github", label: "GitHub" },
  { type: "linkedin", label: "LinkedIn" },
  { type: "instagram", label: "Instagram" },
  { type: "dribbble", label: "Dribbble" },
  { type: "behance", label: "Behance" },
  { type: "awwwards", label: "Awwwards" },
  { type: "discord", label: "Discord" },
  { type: "facebook", label: "Facebook" },
  { type: "youtube", label: "YouTube" },
  { type: "tiktok", label: "TikTok" },
  { type: "x", label: "X" },
  { type: "threads", label: "Threads" },
  { type: "email", label: "Email" },
  { type: "booking", label: "Booking link" },
];

const getSocialIcon = (type: SocialType) => {
  switch (type) {
    case "portfolio":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
      );
    case "github":
      return <FaGithub className="text-base" />;
    case "linkedin":
      return <FaLinkedinIn className="text-base" />;
    case "instagram":
      return <FaInstagram className="text-base" />;
    case "dribbble":
      return <FaDribbble className="text-base" />;
    case "behance":
      return <FaBehance className="text-base" />;
    case "awwwards":
      return (
        <svg width="20" height="16" fill="currentColor" viewBox="0 0 30 16">
          <path d="m18.4 0-2.803 10.855L12.951 0H9.34L6.693 10.855 3.892 0H0l5.012 15.812h3.425l2.708-10.228 2.709 10.228h3.425L22.29 0h-3.892ZM24.77 13.365c0 1.506 1.12 2.635 2.615 2.635C28.879 16 30 14.87 30 13.365c0-1.506-1.12-2.636-2.615-2.636s-2.615 1.13-2.615 2.636Z"></path>
        </svg>
      );
    case "discord":
      return <FaDiscord className="text-base" />;
    case "facebook":
      return <FaFacebookF className="text-base" />;
    case "youtube":
      return <FaYoutube className="text-base" />;
    case "tiktok":
      return <FaTiktok className="text-base" />;
    case "x":
      return <FaXTwitter className="text-base" />;
    case "threads":
      return <FaThreads className="text-base" />;
    case "email":
      return <FaEnvelope className="text-base" />;
    case "booking":
      return (
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
      );
    default:
      return null;
  }
};

const getSocialInputIcon = (type: SocialType) => {
  if (type === "email") return <FaEnvelope className="h-3 w-3" />;
  if (type === "booking") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          type === "portfolio"
            ? "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            : "M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
        }
      />
    </svg>
  );
};

const getProfileFieldIcon = (
  field: "name" | "company" | "location" | "award" | "discipline" | "time",
) => {
  const paths = {
    name: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0114 0" />
      </>
    ),
    company: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="1" />
        <path d="M9 21V3h6v18M3 11h6m6 0h6M3 15h6m6 0h6" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="m8.5 12-1 9 4.5-3 4.5 3-1-9" />
      </>
    ),
    discipline: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" />
      </>
    ),
    time: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[field]}
    </svg>
  );
};

const getHandle = (user: User) =>
  user.email?.split("@")[0]?.toLowerCase() ?? "member";

const getFallbackName = (user: User) => {
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;

  return typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : getHandle(user);
};

const toForm = (user: User, profile: ProfileRecord | null): ProfileForm => ({
  name: profile?.name ?? getFallbackName(user),
  role: profile?.role ?? "Designer",
  bio: profile?.bio ?? "",
  location: profile?.location ?? "",
  awards: profile?.awards ?? "",
  experience: profile?.experience ?? "",
  custom_sections: parseCustomProfileSections(profile?.custom_sections),
  avatar_url:
    profile?.avatar_url ??
    (typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : ""),
  is_published: profile?.is_published ?? false,
});

const emptySocials = (): SocialForm =>
  Object.fromEntries(socialOptions.map(({ type }) => [type, ""])) as SocialForm;

const toSocialForm = (links: SocialLink[]): SocialForm => {
  const next = emptySocials();

  links.forEach((link) => {
    if (socialOptions.some((option) => option.type === link.type)) {
      next[link.type] = getSocialInputValue(link.type, link.url);
    }
  });

  return next;
};

const createMediaUrl = async (storagePath: string) => {
  const client = supabase;
  if (!client) return "";

  const { data, error } = await client.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    console.error("Could not create a profile media URL", error);
    return "";
  }

  return data?.signedUrl ?? "";
};

const ProfileVideo = ({
  src,
  profileName,
}: {
  src: string;
  profileName: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div
      className="group relative aspect-[4/5] overflow-hidden bg-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        src={src}
        controls={false}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="h-full w-full object-cover"
      />
      {(!isPlaying || isHovered) && (
        <button
          type="button"
          aria-label={
            isPlaying
              ? `Pause media for ${profileName}`
              : `Play media for ${profileName}`
          }
          onClick={togglePlayback}
          className="absolute left-1/2 top-1/2 flex h-7 p-1 w-7  -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black transition hover:bg-[#1c40f2] hover:text-white"
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6  w-6"
              aria-hidden="true"
            >
              <path d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" />{" "}
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 -ml-0.5 w-6"
              aria-hidden="true"
            >
              {" "}
              <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l10.46-6.86a1 1 0 0 0 0-1.72L9.52 4.28A1 1 0 0 0 8 5.14Z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [media, setMedia] = useState<ProfileMedia[]>([]);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [inquiries, setInquiries] = useState<ProfileInquiry[]>([]);
  const [readInquiryIds, setReadInquiryIds] = useState<string[]>([]);
  const [deletingInquiryId, setDeletingInquiryId] = useState<string | null>(
    null,
  );
  const [inquiryPendingDeletion, setInquiryPendingDeletion] =
    useState<ProfileInquiry | null>(null);
  const [showArchivedInquiries, setShowArchivedInquiries] = useState(false);
  const [isWelcomeOverlayOpen, setIsWelcomeOverlayOpen] = useState(false);
  const [isInquiryDrawerOpen, setIsInquiryDrawerOpen] = useState(false);
  const [socials, setSocials] = useState<SocialForm>(emptySocials);
  const [newAward, setNewAward] = useState("");
  const [newExperience, setNewExperience] = useState<ExperienceEntry>(
    emptyExperienceEntry(),
  );
  const [experienceError, setExperienceError] = useState("");
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<
    number | null
  >(null);
  const [enteringExperienceIndex, setEnteringExperienceIndex] = useState<
    number | null
  >(null);
  const [removingExperienceIndex, setRemovingExperienceIndex] = useState<
    number | null
  >(null);
  const [newCustomSection, setNewCustomSection] =
    useState<CustomProfileSection>(EMPTY_CUSTOM_PROFILE_SECTION);
  const [editingCustomSectionIndex, setEditingCustomSectionIndex] = useState<
    number | null
  >(null);
  const [enteringCustomSectionIndex, setEnteringCustomSectionIndex] = useState<
    number | null
  >(null);
  const [removingCustomSectionIndex, setRemovingCustomSectionIndex] = useState<
    number | null
  >(null);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [disciplineSearch, setDisciplineSearch] = useState("");
  const [isDisciplineMenuOpen, setIsDisciplineMenuOpen] = useState(false);
  const [enteringRole, setEnteringRole] = useState<string | null>(null);
  const [removingRole, setRemovingRole] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [locationSearchStatus, setLocationSearchStatus] =
    useState<LocationSearchStatus>("idle");
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [selectedLocationSuggestion, setSelectedLocationSuggestion] = useState<
    string | null
  >(null);
  const [sponsored, setSponsored] = useState(false);
  const [profileViews, setProfileViews] = useState(0);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [sponsorshipAmount, setSponsorshipAmount] = useState(1500);
  const [sponsorshipIdempotencyKey, setSponsorshipIdempotencyKey] = useState<
    string | null
  >(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [isEditing, setIsEditing] = useState(false);
  const [editingSocialType, setEditingSocialType] = useState<SocialType | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [enhancingBio, setEnhancingBio] = useState(false);
  const [showBioStyleInstruction, setShowBioStyleInstruction] = useState(false);
  const [bioStyleInstruction, setBioStyleInstruction] = useState("");
  const [bioSuggestion, setBioSuggestion] = useState<{
    original: string;
    enhanced: string;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [shareLabel, setShareLabel] = useState("Share profile");
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
  const bioStyleInstructionRef = useRef<HTMLTextAreaElement>(null);
  const experienceErrorRef = useRef<HTMLParagraphElement>(null);
  const profileFormRef = useRef<HTMLFormElement>(null);
  const disciplinePickerRef = useRef<HTMLDivElement>(null);
  const locationPickerRef = useRef<HTMLDivElement>(null);
  const loadedProfileUserId = useRef<string | null>(null);
  const [message, setMessage] = useState(() =>
    supabase
      ? ""
      : "Supabase is not configured yet. Add your public environment variables first.",
  );

  useEffect(() => {
    if (showBioStyleInstruction) {
      bioStyleInstructionRef.current?.focus();
    }
  }, [showBioStyleInstruction]);

  useEffect(() => {
    if (isEditing && experienceError) {
      experienceErrorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [experienceError, isEditing]);

  useEffect(() => {
    const query = locationSearch.trim();
    if (
      !isEditing ||
      query.length < MIN_LOCATION_QUERY_LENGTH ||
      selectedLocationSuggestion === query
    ) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLocationSearchStatus("loading");

      try {
        const response = await fetch(
          `/api/locations?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(
            result.error ??
              `Location search failed with status ${response.status}`,
          );
        }

        const result: unknown = await response.json();
        setLocationSuggestions(parseLocationSuggestions(result));
        setLocationSearchStatus("idle");
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!(error instanceof Error)) {
          console.error("Could not load location suggestions", error);
        }
        setLocationSuggestions([]);
        setLocationSearchStatus("error");
      }
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isEditing, locationSearch, selectedLocationSuggestion]);

  useEffect(() => {
    if (!isLocationMenuOpen) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !locationPickerRef.current?.contains(event.target)
      ) {
        setIsLocationMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [isLocationMenuOpen]);

  useEffect(() => {
    if (!isDisciplineMenuOpen) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !disciplinePickerRef.current?.contains(event.target)
      ) {
        setIsDisciplineMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [isDisciplineMenuOpen]);

  useEffect(() => {
    const client = supabase;

    if (!client) return;

    let isMounted = true;

    const loadProfile = async (currentUser: User | null) => {
      if (!currentUser) {
        loadedProfileUserId.current = null;
        if (!isMounted) return;

        setUser(null);
        setProfile(null);
        setForm(null);
        setMedia([]);
        setMediaUrls({});
        setSocialLinks([]);
        setInquiries([]);
        setReadInquiryIds([]);
        setSocials(emptySocials());
        setSponsored(false);
        setProfileViews(0);
        setLoading(false);
        return;
      }

      if (loadedProfileUserId.current === currentUser.id) return;
      loadedProfileUserId.current = currentUser.id;

      setLoading(true);
      setUser(currentUser);

      const [
        profileResult,
        mediaResult,
        linksResult,
        paymentResult,
        viewsResult,
        inquiriesResult,
      ] = await Promise.all([
        client
          .from("profiles")
          .select(
            "id, handle, name, role, bio, location, awards, experience, custom_sections, avatar_url, is_published",
          )
          .eq("id", currentUser.id)
          .maybeSingle(),
        client
          .from("profile_media")
          .select("id, profile_id, storage_path, media_type, position")
          .eq("profile_id", currentUser.id)
          .order("position"),
        client
          .from("links")
          .select("id, type, url")
          .eq("profile_id", currentUser.id)
          .in(
            "type",
            socialOptions.map(({ type }) => type),
          ),
        client
          .from("sponsorship_payments")
          .select("status, paid_at")
          .eq("user_id", currentUser.id)
          .eq("status", "paid")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", currentUser.id),
        client
          .from("profile_inquiries")
          .select(
            "id, sender_name, sender_email, sender_phone, project_type, company_name, project_brief, budget, timeline, created_at, archived_at",
          )
          .eq("profile_id", currentUser.id)
          .order("created_at", { ascending: false }),
      ]);

      const loadedMedia = (mediaResult.data ?? []) as ProfileMedia[];
      const signedMediaUrls = Object.fromEntries(
        await Promise.all(
          loadedMedia.map(async (item) => [
            item.storage_path,
            await createMediaUrl(item.storage_path),
          ]),
        ),
      );

      if (!isMounted || loadedProfileUserId.current !== currentUser.id) return;

      const errors = [
        profileResult.error,
        mediaResult.error,
        linksResult.error,
        paymentResult.error,
        viewsResult.error,
        inquiriesResult.error,
      ].filter(Boolean);

      setMessage(errors[0]?.message ?? "");
      setProfile(profileResult.data ?? null);
      setForm(toForm(currentUser, profileResult.data ?? null));
      setCustomRoleInput(getCustomRole(profileResult.data?.role ?? ""));

      const loadedLinks = (linksResult.data ?? []) as SocialLink[];

      setMedia(loadedMedia);
      setMediaUrls(signedMediaUrls);
      setSocialLinks(loadedLinks);
      setSocials(toSocialForm(loadedLinks));
      setSponsored(
        isActiveSponsorship(paymentResult.data as SponsorshipPayment | null),
      );
      setProfileViews(viewsResult.count ?? 0);
      const loadedInquiries = (inquiriesResult.data ?? []) as ProfileInquiry[];
      setInquiries(loadedInquiries);
      const storedReadIds = window.localStorage.getItem(
        `read-inquiries:${currentUser.id}`,
      );
      setReadInquiryIds(
        storedReadIds ? (JSON.parse(storedReadIds) as string[]) : [],
      );
      setLoading(false);
    };

    void client.auth.getSession().then(({ data: { session } }) => {
      void loadProfile(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (url.searchParams.get("welcome") !== "1") return;

    const timeoutId = window.setTimeout(() => setIsWelcomeOverlayOpen(true), 0);
    url.searchParams.delete("welcome");
    window.history.replaceState({}, "", url.toString());

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsEditing(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing]);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = event.target;

    setForm((current) =>
      current
        ? {
            ...current,
            [name]:
              type === "checkbox"
                ? (event.target as HTMLInputElement).checked
                : value,
          }
        : current,
    );
  };

  const handleBioChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const bio = truncateToWordLimit(event.target.value, MAX_BIO_WORDS);
    setBioSuggestion(null);
    setForm((current) => (current ? { ...current, bio } : current));
  };

  const handleEnhanceBio = async () => {
    if (!form || enhancingBio) return;

    const bioWordCount = countWords(form.bio);
    if (bioWordCount < MIN_BIO_WORDS) {
      setMessage(
        `Write at least ${MIN_BIO_WORDS} words before enhancing your bio.`,
      );
      return;
    }

    setEnhancingBio(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai/enhance-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: form.bio,
          styleInstruction: bioStyleInstruction,
        }),
      });
      const result = (await response.json()) as {
        bio?: string;
        error?: string;
      };

      if (!response.ok || !result.bio) {
        setMessage(result.error ?? "Could not enhance your bio.");
        return;
      }

      const enhancedBio = truncateToWordLimit(result.bio, MAX_BIO_WORDS);
      setBioSuggestion({ original: form.bio, enhanced: enhancedBio });
      setForm((current) =>
        current ? { ...current, bio: enhancedBio } : current,
      );
      setMessage("Bio enhanced. Review it before saving.");
    } catch {
      setMessage("Could not reach the bio enhancement service.");
    } finally {
      setEnhancingBio(false);
    }
  };

  const rejectBioSuggestion = () => {
    if (!bioSuggestion) return;

    setForm((current) =>
      current ? { ...current, bio: bioSuggestion.original } : current,
    );
    setBioSuggestion(null);
    setShowBioStyleInstruction(false);
    setMessage("Enhanced bio rejected. Your original bio was restored.");
  };

  const approveBioSuggestion = () => {
    setBioSuggestion(null);
    setShowBioStyleInstruction(false);
    setMessage("Enhanced bio approved. Review it once more before saving.");
  };

  const handleRoleToggle = (role: string) => {
    const selectedRoles = parseRoles(form?.role ?? "");
    const alreadySelected =
      role === "Other"
        ? selectedRoles.includes("Other") ||
          Boolean(getCustomRole(form?.role ?? ""))
        : selectedRoles.includes(role);

    if (
      !alreadySelected &&
      getDisciplineCount(form?.role ?? "") >= MAX_DISCIPLINES
    ) {
      setMessage(`You can select up to ${MAX_DISCIPLINES} roles.`);
      return;
    }

    setMessage("");
    setForm((current) => {
      if (!current) return current;

      const currentRoles = parseRoles(current.role);
      if (role === "Other") {
        const hasOther =
          currentRoles.includes("Other") ||
          Boolean(getCustomRole(current.role));

        if (hasOther) {
          setCustomRoleInput("");
          return {
            ...current,
            role: formatRoles(
              currentRoles.filter((selectedRole) =>
                standardRoles.has(selectedRole),
              ),
            ),
          };
        }

        return {
          ...current,
          role: formatRoles([...currentRoles, "Other"]),
        };
      }

      const isSelected = currentRoles.includes(role);
      const nextRoles = isSelected
        ? currentRoles.filter((selectedRole) => selectedRole !== role)
        : [...currentRoles, role];

      return { ...current, role: formatRoles(nextRoles) };
    });
  };

  const handleCustomRoleChange = (value: string) => {
    const nextValue = normalizeCustomRole(value);
    setCustomRoleInput(value);

    setForm((current) => {
      if (!current) return current;

      const standardSelections = parseRoles(current.role).filter((role) =>
        standardRoles.has(role),
      );

      const nextRoles = nextValue
        ? [...standardSelections, nextValue]
        : [...standardSelections, "Other"];

      return {
        ...current,
        role: formatRoles(nextRoles),
      };
    });
  };

  const removeCustomRole = () => {
    setCustomRoleInput("");
    setForm((current) => {
      if (!current) return current;

      return {
        ...current,
        role: formatRoles(
          parseRoles(current.role).filter((role) => standardRoles.has(role)),
        ),
      };
    });
  };

  const addRoleWithAnimation = (role: string) => {
    if (removingRole) return;

    setEnteringRole(role);
    handleRoleToggle(role);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEnteringRole(null));
    });
  };

  const removeRoleWithAnimation = (role: string) => {
    if (removingRole) return;

    setRemovingRole(role);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 300;

    window.setTimeout(() => {
      if (role !== "Other" && !standardRoles.has(role)) {
        removeCustomRole();
      } else {
        handleRoleToggle(role);
      }
      setRemovingRole(null);
    }, delay);
  };

  const handleSocialChange = (
    type: SocialType,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setSocials((current) => ({ ...current, [type]: event.target.value }));
  };

  const addAward = () => {
    const award = newAward.trim();
    if (!award) return;

    setForm((current) =>
      current
        ? {
            ...current,
            awards: [...parseAwards(current.awards), award].join("\n"),
          }
        : current,
    );
    setNewAward("");
  };

  const removeAward = (awardIndex: number) => {
    setForm((current) =>
      current
        ? {
            ...current,
            awards: parseAwards(current.awards)
              .filter((_, index) => index !== awardIndex)
              .join("\n"),
          }
        : current,
    );
  };

  const addExperience = () => {
    if (!form || removingExperienceIndex !== null) return;

    const description = truncateToWordLimit(
      newExperience.description.trim(),
      MAX_EXPERIENCE_DESCRIPTION_WORDS,
    );

    const nextEntry = {
      role: newExperience.role.trim(),
      company: newExperience.company.trim(),
      startDate: newExperience.startDate.trim(),
      endDate: newExperience.endDate.trim(),
      description,
    };

    if (!hasExperienceEntryData(nextEntry)) {
      setExperienceError("");
      return;
    }

    if (
      !nextEntry.role ||
      !nextEntry.company ||
      !nextEntry.startDate ||
      !nextEntry.description
    ) {
      setExperienceError(
        "Role, company, start date, and description are required once you start a work experience entry.",
      );
      return;
    }

    setExperienceError("");

    if (editingExperienceIndex === null) {
      const nextIndex = parseExperienceEntries(form.experience).filter(
        (entry) =>
          entry.role ||
          entry.company ||
          entry.startDate ||
          entry.endDate ||
          entry.description,
      ).length;
      setEnteringExperienceIndex(nextIndex);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEnteringExperienceIndex(null));
      });
    }

    setForm((current) => {
      if (!current) return current;

      const nextEntries = parseExperienceEntries(current.experience);
      if (editingExperienceIndex !== null) {
        nextEntries[editingExperienceIndex] = nextEntry;
        return {
          ...current,
          experience: serializeExperienceEntries(nextEntries),
        };
      }

      return {
        ...current,
        experience: serializeExperienceEntries([...nextEntries, nextEntry]),
      };
    });

    setNewExperience(emptyExperienceEntry());
    setEditingExperienceIndex(null);
  };

  const removeExperience = (experienceIndex: number) => {
    if (removingExperienceIndex !== null) return;
    setRemovingExperienceIndex(experienceIndex);

    window.setTimeout(() => {
      setForm((current) => {
        if (!current) return current;

        const nextEntries = parseExperienceEntries(current.experience).filter(
          (_, index) => index !== experienceIndex,
        );

        return {
          ...current,
          experience: serializeExperienceEntries(nextEntries),
        };
      });

      if (editingExperienceIndex === experienceIndex) {
        setNewExperience(emptyExperienceEntry());
        setEditingExperienceIndex(null);
      } else {
        setEditingExperienceIndex((current) =>
          current !== null && current > experienceIndex ? current - 1 : current,
        );
      }
      setRemovingExperienceIndex(null);
    }, 300);
  };

  const editExperience = (experienceIndex: number, entry: ExperienceEntry) => {
    setNewExperience(entry);
    setEditingExperienceIndex(experienceIndex);
  };

  const cancelExperienceEdit = () => {
    setNewExperience(emptyExperienceEntry());
    setEditingExperienceIndex(null);
  };

  const saveCustomSection = () => {
    if (!form || removingCustomSectionIndex !== null) return;

    const nextSection = {
      title: newCustomSection.title.trim(),
      content: newCustomSection.content.trim(),
      expiresOn: newCustomSection.expiresOn || null,
    };

    if (!nextSection.title || !nextSection.content) {
      setMessage("Add both a title and body to your custom section.");
      return;
    }

    const sections = [...form.custom_sections];
    if (editingCustomSectionIndex !== null) {
      sections[editingCustomSectionIndex] = nextSection;
    } else {
      if (sections.length >= MAX_CUSTOM_PROFILE_SECTIONS) return;
      setEnteringCustomSectionIndex(sections.length);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEnteringCustomSectionIndex(null));
      });
      sections.push(nextSection);
    }

    setForm((current) =>
      current ? { ...current, custom_sections: sections } : current,
    );
    setNewCustomSection(EMPTY_CUSTOM_PROFILE_SECTION);
    setEditingCustomSectionIndex(null);
    setMessage("");
  };

  const removeCustomSection = (sectionIndex: number) => {
    if (removingCustomSectionIndex !== null) return;
    setRemovingCustomSectionIndex(sectionIndex);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 300;

    window.setTimeout(() => {
      setForm((current) =>
        current
          ? {
              ...current,
              custom_sections: current.custom_sections.filter(
                (_, index) => index !== sectionIndex,
              ),
            }
          : current,
      );

      if (editingCustomSectionIndex === sectionIndex) {
        setNewCustomSection(EMPTY_CUSTOM_PROFILE_SECTION);
        setEditingCustomSectionIndex(null);
      } else {
        setEditingCustomSectionIndex((current) =>
          current !== null && current > sectionIndex ? current - 1 : current,
        );
      }
      setRemovingCustomSectionIndex(null);
    }, delay);
  };

  const editCustomSection = (
    sectionIndex: number,
    section: CustomProfileSection,
  ) => {
    if (
      editingCustomSectionIndex !== sectionIndex &&
      (newCustomSection.title.trim() ||
        newCustomSection.content.trim() ||
        newCustomSection.expiresOn)
    ) {
      setMessage("Save or clear this custom section before editing another.");
      return;
    }

    setMessage("");
    setNewCustomSection(section);
    setEditingCustomSectionIndex(sectionIndex);
  };

  const cancelCustomSectionEdit = () => {
    setNewCustomSection(EMPTY_CUSTOM_PROFILE_SECTION);
    setEditingCustomSectionIndex(null);
  };

  const handleSponsorProfile = () => {
    setIsSponsorModalOpen(true);
    setSponsorshipIdempotencyKey(crypto.randomUUID());
    setMessage("");
  };

  const handleShareProfile = async () => {
    if (!user) return;

    if (!profile?.is_published) {
      setMessage("You cannot share a draft profile. Publish it first.");
      return;
    }

    const profileHandle = profile?.handle ?? getProfileHandle(getHandle(user));
    const shareUrl = `${window.location.origin}/?profile=${encodeURIComponent(profileHandle)}`;
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

  const handleSponsorCheckout = async () => {
    if (startingCheckout) return;

    setStartingCheckout(true);
    setMessage("");

    const response = await fetch("/api/sponsor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: sponsorshipAmount,
        idempotencyKey: sponsorshipIdempotencyKey,
      }),
    });
    const result = (await response.json()) as { error?: string; url?: string };

    if (!response.ok || !result.url) {
      setStartingCheckout(false);
      setMessage(result.error ?? "Could not start sponsorship checkout.");
      return;
    }

    posthog.capture("sponsorship_checkout_started", {
      amount: sponsorshipAmount,
    });
    window.location.assign(result.url);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !user || !form) return;
    if (removingExperienceIndex !== null) return;

    if (hasExperienceEntryData(newExperience)) {
      const hasRequiredExperienceFields =
        newExperience.role.trim() &&
        newExperience.company.trim() &&
        newExperience.startDate.trim() &&
        newExperience.description.trim();

      setExperienceError(
        hasRequiredExperienceFields
          ? "Save or clear the work experience entry before saving your profile."
          : "Role, company, start date, and description are required once you start a work experience entry.",
      );
      return;
    }

    const bioWordCount = countWords(form.bio);

    if (bioWordCount < MIN_BIO_WORDS) {
      setMessage(
        `Your bio is required and must contain at least ${MIN_BIO_WORDS} words. It currently has ${bioWordCount}.`,
      );
      return;
    }

    if (bioWordCount > MAX_BIO_WORDS) {
      setMessage(`Your bio must be ${MAX_BIO_WORDS} words or fewer.`);
      return;
    }

    if (
      newCustomSection.title.trim() ||
      newCustomSection.content.trim() ||
      newCustomSection.expiresOn
    ) {
      setMessage(
        "Save or clear your custom section before saving your profile.",
      );
      return;
    }

    const customSections = form.custom_sections
      .map((section) => ({
        title: section.title.trim(),
        content: section.content.trim(),
        expiresOn: section.expiresOn,
      }))
      .filter((section) => section.title || section.content);

    if (customSections.some((section) => !section.title || !section.content)) {
      setMessage("Each custom section needs both a title and some content.");
      return;
    }

    const hasPrimaryImage = media.some(
      (item) => item.position === 0 && item.media_type === "image",
    );

    if (form.is_published && !hasPrimaryImage) {
      setMessage(
        "Upload an image in container 1 before publishing your profile.",
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const experienceValue =
      form.experience.trim() && form.experience !== "[]"
        ? form.experience
        : null;

    const profilePayload = {
      handle: profile?.handle ?? getProfileHandle(getHandle(user)),
      name: form.name.trim(),
      role: form.role,
      bio: form.bio.trim() || null,
      location: form.location.trim() || null,
      awards: form.awards.trim() || null,
      experience: experienceValue,
      custom_sections: customSections,
      avatar_url: form.avatar_url.trim() || null,
      is_published: form.is_published,
    };
    const profileResult = profile
      ? await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", user.id)
          .select(
            "id, handle, name, role, bio, location, awards, experience, custom_sections, avatar_url, is_published",
          )
          .single()
      : await supabase
          .from("profiles")
          .insert({ id: user.id, ...profilePayload })
          .select(
            "id, handle, name, role, bio, location, awards, experience, custom_sections, avatar_url, is_published",
          )
          .single();
    const { data, error } = profileResult;

    if (error) {
      setSaving(false);
      setMessage(error.message);
      return;
    }

    const invalidSocialInput = socialOptions.some(({ type }) => {
      const value = socials[type].trim();

      if (!value) return false;

      if (type === "portfolio" || type === "booking") {
        return !isSafeExternalUrl(value);
      }
      if (type === "email") return !isValidEmailAddress(value);
      return !isValidSocialHandle(value);
    });

    if (invalidSocialInput) {
      setSaving(false);
      setMessage(
        "Use valid usernames for social accounts, a valid email address, and valid HTTPS URLs for your portfolio and booking link.",
      );
      return;
    }

    const { error: deleteSocialsError } = await supabase
      .from("links")
      .delete()
      .eq("profile_id", user.id)
      .in(
        "type",
        socialOptions.map(({ type }) => type),
      );

    if (deleteSocialsError) {
      setSaving(false);
      setProfile(data);
      setMessage("Profile saved, but your social links could not be updated.");
      return;
    }

    const socialPayload = socialOptions.flatMap(({ type }) => {
      const inputValue = socials[type].trim();
      const existingLink = socialLinks.find((link) => link.type === type);
      const url = inputValue
        ? getSocialUrl(type, inputValue)
        : editingSocialType !== type
          ? (existingLink?.url ?? null)
          : null;
      return url ? [{ profile_id: user.id, type, url }] : [];
    });

    let savedSocials: SocialLink[] = [];

    if (socialPayload.length) {
      const { data: insertedSocials, error: insertSocialsError } =
        await supabase
          .from("links")
          .insert(socialPayload)
          .select("id, type, url");

      if (insertSocialsError) {
        setSaving(false);
        setProfile(data);
        setMessage(
          "Profile saved, but your social links could not be updated.",
        );
        return;
      }

      savedSocials = (insertedSocials ?? []) as SocialLink[];
    }

    setSaving(false);
    setProfile(data);
    setForm(toForm(user, data));
    setSocialLinks(savedSocials);
    setSocials(toSocialForm(savedSocials));
    setEditingSocialType(null);
    setIsEditing(false);
    posthog.capture("profile_saved_changes", {
      is_published: data.is_published,
      social_link_count: savedSocials.length,
    });
    setMessage("Profile changes saved.");
  };

  const handlePublishToggle = async () => {
    if (!supabase || !user || !form || publishing || saving) return;

    const nextPublishedState = !form.is_published;
    const bioWordCount = countWords(form.bio);
    const hasPrimaryImage = media.some(
      (item) => item.position === 0 && item.media_type === "image",
    );

    if (nextPublishedState && bioWordCount < MIN_BIO_WORDS) {
      setMessage(
        `Your bio must contain at least ${MIN_BIO_WORDS} words before publishing. It currently has ${bioWordCount}.`,
      );
      return;
    }

    if (nextPublishedState && bioWordCount > MAX_BIO_WORDS) {
      setMessage(`Your bio must be ${MAX_BIO_WORDS} words or fewer.`);
      return;
    }

    if (nextPublishedState && !hasPrimaryImage) {
      setMessage(
        "Upload an image in container 1 before publishing your profile.",
      );
      return;
    }

    setPublishing(true);
    setMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .update({ is_published: nextPublishedState })
      .eq("id", user.id)
      .select(
        "id, handle, name, role, bio, location, awards, experience, custom_sections, avatar_url, is_published",
      )
      .single();

    if (error) {
      setPublishing(false);
      setMessage(error.message);
      return;
    }

    setProfile(data);
    setForm((current) =>
      current ? { ...current, is_published: nextPublishedState } : current,
    );
    setPublishing(false);
    posthog.capture(
      nextPublishedState ? "profile_published" : "profile_unpublished",
    );
    setMessage(
      nextPublishedState ? "Profile published." : "Profile unpublished.",
    );
  };

  const handleMediaUpload = async (
    position: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    await processMediaFile(position, file);
  };

  const processMediaFile = async (position: number, file: File | undefined) => {
    if (!file || !supabase || !user) return;

    if (!acceptedMediaTypes.includes(file.type)) {
      setMessage("Use a JPG, PNG, WebP, AVIF, MP4, or WebM file.");
      return;
    }

    if (file.size > MAX_MEDIA_BYTES) {
      setMessage("Media files must be 8 MB or smaller.");
      return;
    }

    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const hasPrimaryImage = media.some(
      (item) => item.position === 0 && item.media_type === "image",
    );

    if (position === 0 && mediaType !== "image") {
      setMessage("Container 1 must be an image.");
      return;
    }

    if (position === 1 && !hasPrimaryImage) {
      setMessage(
        "Upload an image in container 1 first, then choose container 2.",
      );
      return;
    }

    setUploadingSlot(position);
    setDraggingSlot(null);
    setMessage("");

    const extension =
      file.name.split(".").pop()?.toLowerCase() ?? file.type.split("/")[1];
    const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const previousItem = media.find((item) => item.position === position);

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setUploadingSlot(null);
      setMessage(uploadError.message);
      return;
    }

    const { data, error } = await supabase
      .from("profile_media")
      .upsert(
        {
          profile_id: user.id,
          storage_path: storagePath,
          media_type: mediaType,
          position,
        },
        { onConflict: "profile_id,position" },
      )
      .select("id, profile_id, storage_path, media_type, position")
      .single();

    if (error) {
      await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
      setUploadingSlot(null);
      setMessage(error.message);
      return;
    }

    if (previousItem) {
      await supabase.storage
        .from(MEDIA_BUCKET)
        .remove([previousItem.storage_path]);
    }

    setMedia((current) =>
      [...current.filter((item) => item.position !== position), data].sort(
        (first, second) => first.position - second.position,
      ),
    );
    const mediaUrl = await createMediaUrl(data.storage_path);
    setMediaUrls((current) => ({ ...current, [data.storage_path]: mediaUrl }));
    if (previousItem) {
      setMediaUrls((current) => {
        const next = { ...current };
        delete next[previousItem.storage_path];
        return next;
      });
    }
    setUploadingSlot(null);
    posthog.capture("profile_media_uploaded", {
      media_type: mediaType,
      slot: position + 1,
      replaced_existing_media: Boolean(previousItem),
    });
    setMessage("Media uploaded.");
  };

  const handleMediaDrop = async (
    position: number,
    event: React.DragEvent<HTMLLabelElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingSlot(null);
    await processMediaFile(position, event.dataTransfer.files?.[0]);
  };

  const handleSocialRemove = async (link: SocialLink) => {
    if (!supabase) return;

    const { error } = await supabase
      .from("links")
      .delete()
      .eq("id", link.id)
      .eq("profile_id", user?.id ?? "");

    if (error) {
      setMessage(error.message);
      return;
    }

    setSocialLinks((current) =>
      current.filter((currentLink) => currentLink.id !== link.id),
    );
    setSocials((current) => ({ ...current, [link.type]: "" }));
    if (editingSocialType === link.type) setEditingSocialType(null);
    setMessage(`${link.type} link removed.`);
  };

  const openSocialEditor = (link: SocialLink) => {
    if (!user) return;

    setMessage("");
    setForm(toForm(user, profile));
    setSocials(toSocialForm(socialLinks));
    setEditingSocialType(link.type);
    setIsEditing(true);
  };

  const handleMediaRemove = async (item: ProfileMedia) => {
    if (!supabase) return;

    if (item.position === 0) {
      setMessage(
        "Container 1 must remain an image. Replace it with a new image instead.",
      );
      return;
    }

    setUploadingSlot(item.position);
    setMessage("");

    const { error } = await supabase
      .from("profile_media")
      .delete()
      .eq("id", item.id);

    if (error) {
      setUploadingSlot(null);
      setMessage(error.message);
      return;
    }

    await supabase.storage.from(MEDIA_BUCKET).remove([item.storage_path]);
    setMedia((current) => current.filter((entry) => entry.id !== item.id));
    setMediaUrls((current) => {
      const next = { ...current };
      delete next[item.storage_path];
      return next;
    });
    setUploadingSlot(null);
  };

  const openDeleteAccountModal = () => {
    if (!deletingAccount) {
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (!supabase || deletingAccount) return;

    setDeletingAccount(true);
    setIsDeleteModalOpen(false);
    setMessage("");

    const response = await fetch("/api/account", { method: "DELETE" });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setDeletingAccount(false);
      setMessage(result.error ?? "Could not delete your account.");
      return;
    }

    posthog.capture("account_deletion_scheduled");
    await supabase.auth.signOut();
    router.push("/account-deleted");
  };

  if (loading) {
    return (
      <div>
        <Navbar />

        <main className="flex min-h-screen items-center justify-center px-6 py-20">
          <p className="mono text-sm font-medium uppercase tracking-tight text-[#999]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#999"
              className="inline-block  ml-2 animate-spin"
            >
              <path d="M325-111.5q-73-31.5-127.5-86t-86-127.5Q80-398 80-480.5t31.5-155q31.5-72.5 86-127t127.5-86Q398-880 480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480.5-80Q398-80 325-111.5Z" />
            </svg>
          </p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar />

        <main className="flex min-h-screen mono uppercase text-sm tracking-tight text-[#999] items-center justify-center px-6 py-20">
          No user is signed in. Please sign in to view your profile.
        </main>
      </div>
    );
  }

  const activeForm = form ?? toForm(user, profile);
  const profileName = profile?.name || getFallbackName(user);
  const handle = getHandle(user);
  const avatarUrl = activeForm.avatar_url;
  const visibleExperienceEntries = parseExperienceEntries(activeForm.experience)
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) =>
        entry.role ||
        entry.company ||
        entry.startDate ||
        entry.endDate ||
        entry.description,
    );
  const visibleSocials = socialLinks.filter(
    (link) => link.url && isSafeExternalUrl(link.url),
  );
  const mediaByPosition = new Map(media.map((item) => [item.position, item]));
  const deviceType = getDeviceTypeLabel();
  const browserDetails = getBrowserDetails();
  const thisDeviceLocation =
    profile?.location || user?.user_metadata?.location || "Unknown location";
  const unreadInquiryCount = inquiries.filter(
    (inquiry) => !inquiry.archived_at && !readInquiryIds.includes(inquiry.id),
  ).length;
  const archivedInquiryCount = inquiries.filter((inquiry) =>
    Boolean(inquiry.archived_at),
  ).length;
  const visibleInquiries = inquiries.filter((inquiry) =>
    showArchivedInquiries ? Boolean(inquiry.archived_at) : !inquiry.archived_at,
  );

  const markAllInquiriesAsRead = () => {
    const inquiryIds = inquiries.map((inquiry) => inquiry.id);
    setReadInquiryIds(inquiryIds);
    if (user) {
      window.localStorage.setItem(
        `read-inquiries:${user.id}`,
        JSON.stringify(inquiryIds),
      );
    }
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    if (!supabase || !user || deletingInquiryId) return;

    setDeletingInquiryId(inquiryId);
    const { error } = await supabase
      .from("profile_inquiries")
      .delete()
      .eq("id", inquiryId)
      .eq("profile_id", user.id);

    if (error) {
      setDeletingInquiryId(null);
      setMessage(error.message);
      return;
    }

    setInquiries((current) =>
      current.filter((inquiry) => inquiry.id !== inquiryId),
    );
    setReadInquiryIds((current) => {
      const nextIds = current.filter((id) => id !== inquiryId);
      window.localStorage.setItem(
        `read-inquiries:${user.id}`,
        JSON.stringify(nextIds),
      );
      return nextIds;
    });
    setDeletingInquiryId(null);
    setInquiryPendingDeletion(null);
  };

  const handleArchiveInquiry = async (inquiry: ProfileInquiry) => {
    if (!supabase || !user) return;

    const archivedAt = inquiry.archived_at ? null : new Date().toISOString();
    const { error } = await supabase
      .from("profile_inquiries")
      .update({ archived_at: archivedAt })
      .eq("id", inquiry.id)
      .eq("profile_id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setInquiries((current) =>
      current.map((currentInquiry) =>
        currentInquiry.id === inquiry.id
          ? { ...currentInquiry, archived_at: archivedAt }
          : currentInquiry,
      ),
    );
  };

  const openBioEditor = () => {
    if (!user) return;

    setMessage("");
    setForm(toForm(user, profile));
    setLocationSearch(profile?.location ?? "");
    setSelectedLocationSuggestion(profile?.location ?? null);
    setLocationSuggestions([]);
    setLocationSearchStatus("idle");
    setIsLocationMenuOpen(false);
    setCustomRoleInput(getCustomRole(profile?.role ?? ""));
    setSocials(toSocialForm(socialLinks));
    setEditingSocialType(null);
    setNewAward("");
    setNewExperience(emptyExperienceEntry());
    setEditingExperienceIndex(null);
    setNewCustomSection(EMPTY_CUSTOM_PROFILE_SECTION);
    setEditingCustomSectionIndex(null);
    setIsEditing(true);
    window.setTimeout(() => bioInputRef.current?.focus(), 0);
  };

  const handleUpdateClick = () => {
    const shouldOpen = !isEditing;

    setMessage("");
    setForm(toForm(user, profile));
    setLocationSearch(profile?.location ?? "");
    setSelectedLocationSuggestion(profile?.location ?? null);
    setLocationSuggestions([]);
    setLocationSearchStatus("idle");
    setIsLocationMenuOpen(false);
    setCustomRoleInput(getCustomRole(profile?.role ?? ""));
    setSocials(toSocialForm(socialLinks));
    setEditingSocialType(null);
    setNewAward("");
    setNewExperience(emptyExperienceEntry());
    setEditingExperienceIndex(null);
    setNewCustomSection(EMPTY_CUSTOM_PROFILE_SECTION);
    setEditingCustomSectionIndex(null);
    setIsEditing(shouldOpen);
  };

  return (
    <div>
      <Navbar />

      <main className="min-h-screen px-6 pb-28 pt-32 text-black sm:px-10">
        <section className="mx-auto w-full max-w-6xl border- mt-10 border-black pt-5">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <h1 className="mt-3 geist text-4xl font-medium tracking-tighter sm:text-6xl">
                {profileName}
              </h1>
            </div>

            <div className="flex mono tracking-tight flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => void handlePublishToggle()}
                disabled={publishing || saving}
                className={`rounded-full  uppercase cursor-pointer px-3 py-1 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 ${profile?.is_published ? "bg-black" : "bg-[#1c40f2]"}`}
              >
                {publishing
                  ? "Working..."
                  : profile?.is_published
                    ? "Unpublish"
                    : "Publish"}
              </button>
              <button
                type="button"
                onClick={handleSponsorProfile}
                className="rounded-full  uppercase  cursor-pointer bg-[#1c40f2] px-3 py-1 text-xs  font-semibold text-white transition hover:bg-black"
              >
                Promote
              </button>
              <button
                type="button"
                onClick={handleUpdateClick}
                className="rounded-full  uppercase  cursor-pointer border border-black px-3 py-1 text-xs  font-semibold transition hover:bg-black hover:text-white"
              >
                {isEditing ? "Close editor" : "Update"}
              </button>
              <button
                type="button"
                onClick={() => void handleShareProfile()}
                className="rounded-full  uppercase  cursor-pointer border border-black px-3 py-1 text-xs  font-semibold transition hover:bg-black hover:text-white"
              >
                {shareLabel}
              </button>

              <button
                type="button"
                aria-label="Open project inquiries"
                title="Project inquiries"
                onClick={() => setIsInquiryDrawerOpen(true)}
                className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-black transition hover:bg-black hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 -960 960 960"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M160-200v-80h640v80H160Zm0-200v-80h640v80H160Zm0-200v-80h640v80H160Z" />
                </svg>
                {unreadInquiryCount ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1c40f2] px-1 text-[9px] font-bold text-white">
                    {unreadInquiryCount > 9 ? "9+" : unreadInquiryCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {message ? (
            <p className="mt-6 border geist uppercas tracking-tight rounded-md font-medium border-[#1c40f2]/20 bg-[#1c40f2]/5 px-3 py-1 text-sm text-[#1734a9]">
              {message}
            </p>
          ) : null}

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
            <div>
              <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/5 text-4xl font-semibold uppercase text-black">
                  <span
                    aria-hidden
                    className="relative animate-spin [animation-duration:10s] block w-8 h-8"
                  >
                    <div
                      className="absolute w-2 h-2 rounded-full bg-black shrink-0"
                      style={{
                        top: "5%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div
                      className="absolute w-2 h-2 rounded-full bg-black shrink-0"
                      style={{
                        top: "18.2%",
                        left: "81.8%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div
                      className="absolute w-2 h-2 rounded-full bg-black shrink-0"
                      style={{
                        top: "50%",
                        left: "95%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div
                      className="absolute w-2 h-2 rounded-full bg-black shrink-0"
                      style={{
                        top: "81.8%",
                        left: "81.8%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div
                      className="absolute w-2 h-2 rounded-full bg-black shrink-0"
                      style={{
                        top: "95%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div
                      className="absolute w-2 h-2 rounded-full bg-black shrink-0"
                      style={{
                        top: "81.8%",
                        left: "18.2%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div
                      className="absolute w-2 h-2 rounded-full bg-black shrink-0"
                      style={{
                        top: "50%",
                        left: "5%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                    <div
                      className="absolute w-2 h-2 rounded-full bg-black shrink-0"
                      style={{
                        top: "18.2%",
                        left: "18.2%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </span>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${profileName}'s profile photo`}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </div>

                <div>
                  <p className="mon flex items-center geist text-xs uppercase font-medium uppercas tracking-tigh text-[#1c40f2]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25"
                      />
                    </svg>
                    {handle}
                  </p>
                  <p className="mt-2 geis mono text-xl font-medium tracking-tight">
                    {profile?.role || "Add your role"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full mono tracking-tight bg-black px-3 py-1 text-xs font-semibold text-white">
                      {profile?.is_published ? "Live profile" : "Draft profile"}
                    </span>
                    {profile?.location ? (
                      <span className="rounded-full mono tracking-tight border border-black/15 px-3 py-1 text-xs font-semibold text-[#666]">
                        {profile.location}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>{" "}
              <div className="grid mt-10 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="flex justify-between ">
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    About me
                  </p>
                </div>
                <div>
                  <p className=" whitespace-pre-line text-justify text-sm geist leading-4 tracking-tight font-medium text-[#444]">
                    {activeForm.bio ||
                      "Add a short introduction so the community knows what you make and how you work."}
                  </p>
                  <button
                    type="button"
                    onClick={openBioEditor}
                    aria-label="Edit bio"
                    title="Edit bio"
                    className="flex h-5 justify-end mt-1 w-full cursor-pointer items-center justify-center rounded-full text-black transition "
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {profile?.awards ? (
                <section className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] mt-10">
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    Honors
                  </p>
                  <p className=" geist whitespace-pre-line text-sm leading-tight font-medium tracking-tight text-[#444]">
                    {profile.awards}
                  </p>
                </section>
              ) : null}
              {parseExperienceEntries(profile?.experience).length ? (
                <section className="mt-14 max-w-2xl border-t border-black/10 pt-5">
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    Work Experiences
                  </p>

                  <div className="mt-5 space-y-8">
                    {parseExperienceEntries(profile?.experience).map(
                      (experienceEntry, index) => {
                        const hasDetail =
                          experienceEntry.role ||
                          experienceEntry.company ||
                          experienceEntry.startDate ||
                          experienceEntry.endDate ||
                          experienceEntry.description;

                        if (!hasDetail) return null;

                        const dateRange = (() => {
                          const startDate = experienceEntry.startDate.trim();
                          const endDate = experienceEntry.endDate.trim();

                          if (!startDate && !endDate) return "";
                          if (startDate && endDate)
                            return `${startDate} – ${endDate}`;
                          if (startDate) return `${startDate} – Present`;
                          return endDate;
                        })();

                        return (
                          <div
                            key={`${experienceEntry.company}-${experienceEntry.role}-${index}`}
                            className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]"
                          >
                            <div className="mon geist text-sm font-medium tracking-tight text-black/45">
                              {dateRange || "—"}
                            </div>

                            <div className="min-w-0">
                              <p className="geist text-lg capitalize font-medium leading-tight tracking-tight text-black sm:text-lg">
                                {(() => {
                                  const role = experienceEntry.role.trim();
                                  const company =
                                    experienceEntry.company.trim();

                                  if (role && company) {
                                    return `${company} — ${role}`;
                                  }

                                  return role || company;
                                })()}
                              </p>

                              {experienceEntry.description ? (
                                <p className="mt-2 geist font-medium whitespace-pre-line text-sm leading-4 text-justify tracking-tight text-[#999]">
                                  {experienceEntry.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>
              ) : null}
              {getActiveCustomProfileSections(profile?.custom_sections).map(
                (section, index) => (
                  <section
                    key={`${section.title}-${index}`}
                    className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] mt-10"
                  >
                    <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                      {section.title}
                    </p>
                    <div>
                      <p className=" geist whitespace-pre-line text-sm leading-tight font-medium tracking-tight text-[#444]">
                        {section.content}
                      </p>
                      {section.expiresOn ? (
                        <p className="mt-2 geist text-xs font-medium uppercase tracking-tight text-[#999]">
                          {section.expiresOn}
                        </p>
                      ) : null}
                    </div>
                  </section>
                ),
              )}
              {visibleSocials.length ? (
                <section className="mt-14 border-t border-black/10 pt-5">
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    Let&apos;s connect
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-1 gap-y-3">
                    {visibleSocials.map((link) => {
                      const option = socialOptions.find(
                        (entry) => entry.type === link.type,
                      );

                      return (
                        <div
                          key={link.id}
                          className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-black/[0.04] text-black transition hover:border-black hover:bg-black hover:text-white"
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            title={option?.label ?? link.type}
                            aria-label={option?.label ?? link.type}
                            className="flex h-full w-full items-center justify-center rounded-full"
                          >
                            {getSocialIcon(link.type)}
                          </a>
                          <span className="pointer-events-none absolute -right-1 -top-1 flex translate-y-1 gap-0.5 opacity-0 transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label={`Edit ${option?.label ?? link.type} link`}
                              title="Edit link"
                              onClick={() => openSocialEditor(link)}
                              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-black bg-white text-black shadow-sm transition hover:bg-black hover:text-white"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="11"
                                height="11"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${option?.label ?? link.type} link`}
                              title="Remove link"
                              onClick={() => void handleSocialRemove(link)}
                              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-red-600 bg-white text-red-600 shadow-sm transition hover:bg-red-600 hover:text-white"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="11"
                                height="11"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                aria-hidden="true"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="m19 6-1 14H6L5 6" />
                              </svg>
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              {media.length ? (
                <section className="mt-14 border-t border-black/10 pt-5">
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    Profile media
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {media.map((item) => {
                      const mediaUrl = mediaUrls[item.storage_path] ?? "";

                      if (!mediaUrl) return null;

                      return item.media_type === "video" ? (
                        <ProfileVideo
                          key={item.id}
                          src={mediaUrl}
                          profileName={profileName}
                        />
                      ) : (
                        <img
                          key={item.id}
                          src={mediaUrl}
                          alt={`Selected work by ${profileName}`}
                          className="aspect-[4/5] w-full bg-black/5 object-cover"
                        />
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="border-t border-black pt-5 h-fit lg:border-t-0 lg:border-l lg:pl-8">
              <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                Profile status
              </p>
              <p className="mt-4 text-lg mono font-medium tracking-tighter text-[#1c40f2]">
                {profile?.is_published
                  ? "Visible to everyone"
                  : "Only visible to you"}
              </p>
              {sponsored ? (
                <span className="mt-3 mono inline-flex rounded-full bg-[#1c40f2] px-3 py-1 text-xs font-semibold uppercase tracking-tight text-white">
                  Sponsored profile
                </span>
              ) : null}
              <p className="mt-4 text-xs mono uppercase font-medium text-[#666]">
                <span className="geist">{profileViews.toLocaleString()}</span>{" "}
                profile views
              </p>
              <p className="mt-2 text-[#1734a9] geist text-sm leading-tight tracking-tight font-medium text-[#666]">
                {profile?.is_published
                  ? "Your profile is ready to appear in the directory."
                  : "Finish your details, then switch on public visibility when you are ready."}
              </p>

              <div className="mt-8 border-t border-black/10 pt-5">
                <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                  Signed in as
                </p>
                <div>
                  <p className="mono hidden text-xs mt-1 font-medium uppercase tracking-tight text-[#1c40f2]">
                    Name:{" "}
                    {user.user_metadata.full_name || user.user_metadata.name}
                  </p>
                  <p className="mono text-[#1c40f2] text-xs font-medium uppercase tracking-tight ">
                    Email: {user.email}
                  </p>
                </div>
                <p className="mono mt-4 text-xs font-medium uppercase tracking-tight text-[#999]">
                  Active Device
                </p>
                <div className="mt-2 flex rounded text-[#1c40f2] border border-[#1c40f2]/20 bg-[#1c40f2]/5 items-center gap-2 bg-[#1c40f2]/5 p-1">
                  <div className="flex h-5 w-5 items-center justify-center">
                    {deviceType === "Mobile phone" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="mono text-[#1c40f2] text-xs font-medium uppercase tracking-tight ">
                      {browserDetails || user.user_metadata.device || "Unknown"}
                    </p>
                    <p className="mono hidden text-[#1c40f2] text-xs font-medium uppercase tracking-tight ">
                      {thisDeviceLocation}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-red-200 pt-5">
                <p className="mono text-xs font-medium uppercase tracking-tight text-red-500">
                  Danger zone
                </p>
                <button
                  type="button"
                  onClick={openDeleteAccountModal}
                  disabled={deletingAccount}
                  className="mt-3 rounded-full mono tracking-tight uppercase cursor-pointer border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingAccount ? "Deleting account..." : "Delete account"}
                </button>
              </div>
            </aside>
          </div>

          {isEditing ? (
            <div className="pointer-events-none fixed inset-0 z-50">
              <button
                type="button"
                aria-label="Close profile editor"
                onClick={() => setIsEditing(false)}
                className="profile-modal-backdrop pointer-events-auto fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm"
              />
              <button
                type="button"
                aria-label="Close profile editor"
                onClick={() => setIsEditing(false)}
                className="profile-modal-close pointer-events-auto fixed right-1/2 bottom-[calc(90vh+0px)] z-50 flex h-10 w-10 translate-x-1/2 cursor-pointer items-center justify-center rounded-full text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="40"
                  viewBox="0 -960 960 960"
                  width="40"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M160-380v-66.67h640V-380H160Zm0-133.33V-580h640v66.67H160Z" />
                </svg>
              </button>
              <form
                ref={profileFormRef}
                onSubmit={handleSave}
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-editor-title"
                data-lenis-prevent
                onWheelCapture={(event) => event.stopPropagation()}
                onTouchMoveCapture={(event) => event.stopPropagation()}
                className="  pointer-events-auto fixed bottom-0 left-0 right-0 z-50 flex h-[90vh] max-h-[90dvh] scrollbar-hide min-h-0 touch-pan-y flex-col overflow-y-auto overscroll-contain rounded-t bg-white px-6 py-10 shadow-2xl sm:px-10"
              >
                <div className="max-w-3xl mx-auto w-full geist tracking-tight font-medium">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="mono text-sm font-medium tracking-tighter uppercase tracking-tight text-[#999]">
                        update your Profile
                      </p>
                      <h2
                        id="profile-editor-title"
                        className="mt-2 text-2xl font-semibold tracking-tighter"
                      >
                        Make it yours.
                      </h2>
                    </div>
                    <button
                      type="submit"
                      disabled={saving || removingExperienceIndex !== null}
                      className="rounded-full bg-[#1c40f2] mono uppercase cursor-pointer px-3 py-1 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#9caeff]"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>

                  <div className="mt-8 grid gap-6 md:grid-cols-2">
                    <label className="text-xs uppercase tracking-tight text-[#999] font-medium">
                      Full Name <span>*</span>
                      <InputArea
                        leadingIcon={getProfileFieldIcon("name")}
                        wrapperClassName="mt-2 flex min-w-0 items-center gap-2 rounded bg-black/5 px-2"
                        variant="plain"
                        required
                        name="name"
                        value={activeForm.name}
                        onChange={handleChange}
                        className="geist text-sm"
                      />
                    </label>
                    <div className="text-xs font-medium">
                      <label
                        htmlFor="profile-location"
                        className=" uppercase tracking-tight text-[#999]"
                      >
                        Location <span>*</span>
                      </label>
                      <div ref={locationPickerRef} className="relative mt-2">
                        <InputArea
                          id="profile-location"
                          leadingIcon={getProfileFieldIcon("location")}
                          wrapperClassName="flex min-w-0 items-center gap-2 rounded bg-black/5 px-2"
                          variant="plain"
                          required
                          name="location"
                          autoComplete="off"
                          role="combobox"
                          aria-expanded={
                            isLocationMenuOpen &&
                            locationSearch.trim().length >=
                              MIN_LOCATION_QUERY_LENGTH
                          }
                          aria-controls="location-suggestions"
                          aria-autocomplete="list"
                          value={locationSearch}
                          onFocus={() => {
                            if (selectedLocationSuggestion !== locationSearch) {
                              setIsLocationMenuOpen(true);
                            }
                          }}
                          onChange={(event) => {
                            const value = event.target.value;
                            setLocationSearch(value);
                            setSelectedLocationSuggestion(null);
                            setLocationSuggestions([]);
                            setLocationSearchStatus("idle");
                            setIsLocationMenuOpen(true);
                            setForm((current) =>
                              current
                                ? { ...current, location: value }
                                : current,
                            );
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setIsLocationMenuOpen(false);
                            }
                          }}
                          placeholder="Type at least 3 letters to search places"
                          className="geist text-sm placeholder:text-[#aaa]"
                        />
                        {isLocationMenuOpen &&
                        locationSearch.trim().length >=
                          MIN_LOCATION_QUERY_LENGTH ? (
                          <div
                            id="location-suggestions"
                            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded border border-black/10 bg-white p-1 shadow-lg"
                          >
                            {locationSearchStatus === "loading" ? (
                              <p className="px-3 py-2 text-sm text-[#999]">
                                Searching places...
                              </p>
                            ) : null}
                            {locationSearchStatus === "error" ? (
                              <p
                                role="status"
                                className="px-3 py-2 text-sm text-[#666]"
                              >
                                Couldn&apos;t load places. Check your connection
                                and try again.
                              </p>
                            ) : null}
                            {locationSearchStatus === "idle" &&
                            locationSuggestions.length ? (
                              <ul>
                                {locationSuggestions.map((suggestion) => (
                                  <li key={suggestion}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLocationSearch(suggestion);
                                        setSelectedLocationSuggestion(
                                          suggestion,
                                        );
                                        setLocationSuggestions([]);
                                        setIsLocationMenuOpen(false);
                                        setForm((current) =>
                                          current
                                            ? {
                                                ...current,
                                                location: suggestion,
                                              }
                                            : current,
                                        );
                                      }}
                                      className="block w-full rounded px-3 py-2 text-left text-sm text-[#666] transition hover:bg-black/5 hover:text-black focus-visible:bg-black/5 focus-visible:outline-none"
                                    >
                                      {suggestion}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {locationSearchStatus === "idle" &&
                            !locationSuggestions.length ? (
                              <p className="px-3 py-2 text-sm text-[#999]">
                                No matching cities or towns found.
                              </p>
                            ) : null}
                            <p className="border-none border-black/5 px-3 py-2 text-[10px]  text-[#999]">
                              Search powered by Photon. Map data ©{" "}
                              <a
                                href="https://www.openstreetmap.org/copyright"
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2"
                              >
                                OpenStreetMap contributors
                              </a>
                              .
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <fieldset className="text-xs font-semibold">
                      <legend className="uppercase tracking-tight text-[#999] font-medium">
                        What do you do? <span>*</span>
                      </legend>

                      <div
                        ref={disciplinePickerRef}
                        className="relative mt-3 space-y-3"
                      >
                        <InputArea
                          id="discipline-search"
                          leadingIcon={getProfileFieldIcon("discipline")}
                          wrapperClassName="flex min-w-0 items-center gap-2 rounded bg-black/5 px-2"
                          variant="plain"
                          role="combobox"
                          aria-expanded={isDisciplineMenuOpen}
                          aria-controls="discipline-search-menu"
                          aria-autocomplete="list"
                          aria-label="Search and add a role"
                          value={disciplineSearch}
                          onFocus={() => setIsDisciplineMenuOpen(true)}
                          onChange={(event) => {
                            setDisciplineSearch(event.target.value);
                            setIsDisciplineMenuOpen(true);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setIsDisciplineMenuOpen(false);
                            }
                          }}
                          placeholder="Designer or developer"
                          className="geist text-sm placeholder:text-[#aaa]"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          {parseRoles(activeForm.role)
                            .filter(
                              (role) =>
                                role === "Other" ||
                                standardRoles.has(role) ||
                                role === getCustomRole(activeForm.role),
                            )
                            .map((role) => (
                              <div
                                key={role}
                                className={`inline-grid overflow-hidden transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out motion-reduce:transition-none ${
                                  enteringRole === role || removingRole === role
                                    ? "grid-rows-[0fr] -translate-y-1 opacity-0"
                                    : "grid-rows-[1fr] translate-y-0 opacity-100"
                                }`}
                              >
                                <div className="min-h-0 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeRoleWithAnimation(role)
                                    }
                                    disabled={removingRole !== null}
                                    aria-label={`Remove ${role} role`}
                                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#1c40f2] px-3 py-1 text-sm font-medium tracking-tight text-white transition hover:bg-black disabled:pointer-events-none"
                                  >
                                    {role}
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                        {isDisciplineMenuOpen ? (
                          <div
                            id="discipline-search-menu"
                            className="absolute left-0 top-full z-20 mt-1 w-full max-w-sm rounded border border-black/10 bg-white p-1 shadow-lg"
                          >
                            <div
                              role="group"
                              aria-label="Available roles"
                              className=" max-h-40 scrollbar-hide  overflow-y-auto"
                            >
                              {roles
                                .filter((role) => {
                                  const selectedRoles = parseRoles(
                                    activeForm.role,
                                  );
                                  const isSelected =
                                    role === "Other"
                                      ? selectedRoles.includes("Other") ||
                                        Boolean(getCustomRole(activeForm.role))
                                      : selectedRoles.includes(role);

                                  return (
                                    !isSelected &&
                                    role
                                      .toLowerCase()
                                      .includes(
                                        disciplineSearch.trim().toLowerCase(),
                                      )
                                  );
                                })
                                .map((role) => (
                                  <button
                                    key={role}
                                    type="button"
                                    disabled={
                                      removingRole !== null ||
                                      getDisciplineCount(activeForm.role) >=
                                        MAX_DISCIPLINES
                                    }
                                    onClick={() => {
                                      addRoleWithAnimation(role);
                                      setDisciplineSearch("");
                                      setIsDisciplineMenuOpen(true);
                                    }}
                                    className="block w-full rounded px-2 py-2 text-left text-sm font-medium tracking-tight text-[#999] transition hover:bg-black/5 hover:text-black focus-visible:bg-black/5 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {role}
                                  </button>
                                ))}
                              {!roles.some((role) => {
                                const selectedRoles = parseRoles(
                                  activeForm.role,
                                );
                                const isSelected =
                                  role === "Other"
                                    ? selectedRoles.includes("Other") ||
                                      Boolean(getCustomRole(activeForm.role))
                                    : selectedRoles.includes(role);

                                return (
                                  !isSelected &&
                                  role
                                    .toLowerCase()
                                    .includes(
                                      disciplineSearch.trim().toLowerCase(),
                                    )
                                );
                              }) ? (
                                <p className="px-3 py-2 text-sm font-medium text-[#999]">
                                  No matching roles.
                                </p>
                              ) : null}
                              {getDisciplineCount(activeForm.role) >=
                              MAX_DISCIPLINES ? (
                                <p className="px-2 py-2 text-xs font-medium text-[#999]">
                                  You&apos;ve reached the {MAX_DISCIPLINES}-role
                                  limit. Remove a role to add another.
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsDisciplineMenuOpen(false)}
                              className="mt-3 px-3 text-xs font-semibold uppercase tracking-tight text-[#666] transition hover:text-black"
                            >
                              Done
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </fieldset>
                  </div>

                  <div className="mt-8 mono text-sm font-Medium uppercase tracking-tight text-[#999]">
                    <div className="flex items-center justify-between">
                      <label htmlFor="profile-bio text-xs">About Me *</label>
                      <div className="flex items-center gap-3">
                        <p
                          id="bio-word-count"
                          className="mt-2 text-xs geist tracking-tighter font-semibold capitalize mon uppercase text-[#999]"
                        >
                          {countWords(activeForm.bio)} / {MAX_BIO_WORDS}
                        </p>
                      </div>
                    </div>{" "}
                    <textarea
                      ref={bioInputRef}
                      id="profile-bio"
                      required
                      name="bio"
                      aria-describedby="bio-word-count"
                      value={activeForm.bio}
                      onChange={handleBioChange}
                      rows={4}
                      minLength={20}
                      placeholder="Tell people what you do in at least 20 words."
                      className="mt-2 w-full text-justify  min-h-50 text-black geist resize-none scrollbar-none bg-black/5 rounded p-3 outline-none transition placeholder:text-[#aaa] "
                    />
                    <div
                      id="bio-style-instruction-panel"
                      aria-hidden={
                        !showBioStyleInstruction ||
                        enhancingBio ||
                        bioSuggestion !== null
                      }
                      inert={
                        !showBioStyleInstruction ||
                        enhancingBio ||
                        bioSuggestion !== null
                      }
                      className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out motion-reduce:transition-none ${
                        showBioStyleInstruction &&
                        !enhancingBio &&
                        !bioSuggestion
                          ? "mt-3 translate-y-0 grid-rows-[1fr] opacity-100"
                          : "mt-0 -translate-y-1 grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <label
                          htmlFor="bio-style-instruction"
                          className="mono text-xs font-medium uppercase tracking-tight text-[#999]"
                        >
                          Tone (optional)
                        </label>
                        <textarea
                          ref={bioStyleInstructionRef}
                          id="bio-style-instruction"
                          tabIndex={
                            showBioStyleInstruction &&
                            !enhancingBio &&
                            !bioSuggestion
                              ? 0
                              : -1
                          }
                          value={bioStyleInstruction}
                          onChange={(event) =>
                            setBioStyleInstruction(event.target.value)
                          }
                          maxLength={MAX_BIO_STYLE_INSTRUCTION_LENGTH}
                          rows={2}
                          placeholder="e.g. Warm and confident, while staying professional."
                          className="mt-2 w-full geist resize-none rounded bg-black/5 p-3 text-sm normal-case tracking-tight text-black outline-none transition placeholder:text-[#aaa] "
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {!bioSuggestion ? (
                        <button
                          type="button"
                          onClick={() => void handleEnhanceBio()}
                          disabled={
                            enhancingBio ||
                            countWords(activeForm.bio) < MIN_BIO_WORDS
                          }
                          className="rounded-full border border-[#1c40f2]/30 px-3 py-1 text-xs font-semibold uppercase tracking-tight text-[#1c40f2] transition hover:bg-[#1c40f2] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {enhancingBio ? "Enhancing..." : "Enhance bio"}
                        </button>
                      ) : null}
                      {!enhancingBio && !bioSuggestion ? (
                        <button
                          type="button"
                          aria-expanded={showBioStyleInstruction}
                          aria-controls="bio-style-instruction-panel"
                          onClick={() =>
                            setShowBioStyleInstruction((visible) => !visible)
                          }
                          className="rounded-full uppercase border border-black/10 px-3 py-1 text-xs font-medium normal-case tracking-tight text-[#666] transition hover:border-black/30 hover:text-black"
                        >
                          {showBioStyleInstruction
                            ? "Hide tone"
                            : bioStyleInstruction.trim()
                              ? "Set tone"
                              : "Set tone"}
                        </button>
                      ) : null}
                    </div>
                    {bioSuggestion ? (
                      <div className="mt-2 flex flex-col gap-2  ">
                        <p className="text-xs hidden font-semibold normal-case tracking-tight geist text-[#666]">
                          AI can make mistakes. Verify the information before
                          approving or saving this bio.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={approveBioSuggestion}
                            className="rounded-full bg-[#1c40f2] px-3 py-1 text-xs font-semibold uppercase tracking-tight text-white transition hover:bg-black"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={rejectBioSuggestion}
                            className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-tight text-black transition hover:bg-black/5"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <section className="mt-8 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className=" text-xs font-medium uppercase tracking-tight text-[#999]">
                        work experience
                      </p>
                    </div>
                    <p className="mt-2 hidden text-xs font-medium tracking-tight text-[#999]">
                      Optional. Leave every field blank to skip. If you enter
                      any details, role, company, start date, and description
                      are required.
                    </p>
                    {experienceError ? (
                      <p
                        ref={experienceErrorRef}
                        role="alert"
                        className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium tracking-tight text-red-700"
                      >
                        {experienceError}
                      </p>
                    ) : null}

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <InputArea
                        leadingIcon={getProfileFieldIcon("discipline")}
                        wrapperClassName="flex min-w-0 items-center gap-1 rounded bg-black/5 px-2"
                        variant="plain"
                        value={newExperience.role}
                        onChange={(event) => {
                          setExperienceError("");
                          setNewExperience((current) => ({
                            ...current,
                            role: event.target.value,
                          }));
                        }}
                        placeholder="Role"
                        className="min-w-0 capitalize text-sm placeholder:text-[#aaa]"
                      />

                      <InputArea
                        leadingIcon={getProfileFieldIcon("company")}
                        wrapperClassName="flex min-w-0 items-center gap-1 rounded bg-black/5 px-2"
                        variant="plain"
                        value={newExperience.company}
                        onChange={(event) => {
                          setExperienceError("");
                          setNewExperience((current) => ({
                            ...current,
                            company: event.target.value,
                          }));
                        }}
                        placeholder="Company"
                        className="min-w-0 capitalize text-sm placeholder:text-[#aaa]"
                      />

                      <InputArea
                        leadingIcon={getProfileFieldIcon("time")}
                        wrapperClassName="flex min-w-0 items-center gap-1 rounded bg-black/5 px-2"
                        variant="plain"
                        value={newExperience.startDate}
                        onChange={(event) => {
                          setExperienceError("");
                          setNewExperience((current) => ({
                            ...current,
                            startDate: event.target.value,
                          }));
                        }}
                        placeholder="Start date"
                        className="min-w-0 capitalize text-sm placeholder:text-[#aaa]"
                      />

                      <InputArea
                        leadingIcon={getProfileFieldIcon("time")}
                        wrapperClassName="flex min-w-0 items-center gap-1 rounded bg-black/5 px-2"
                        variant="plain"
                        value={newExperience.endDate}
                        onChange={(event) => {
                          setExperienceError("");
                          setNewExperience((current) => ({
                            ...current,
                            endDate: event.target.value,
                          }));
                        }}
                        placeholder="End date"
                        className="min-w-0 capitalize text-sm placeholder:text-[#aaa]"
                      />
                    </div>

                    <textarea
                      value={newExperience.description}
                      onChange={(event) => {
                        setExperienceError("");
                        setNewExperience((current) => ({
                          ...current,
                          description: truncateToWordLimit(
                            event.target.value,
                            MAX_EXPERIENCE_DESCRIPTION_WORDS,
                          ),
                        }));
                      }}
                      rows={4}
                      placeholder="Short description of your work, impact, or notable projects."
                      className="mt-3 w-full resize-none rounded bg-black/5 p-3 text-sm normal-case tracking-tight text-black outline-none transition placeholder:text-[#aaa] "
                    />

                    <div className="mt-2 w-full flex justify-between items-center">
                      <button
                        type="button"
                        onClick={addExperience}
                        disabled={removingExperienceIndex !== null}
                        className="rounded-full border mono border-[#1c40f2]/30 px-3 py-1 text-xs font-semibold uppercase tracking-tight text-[#1c40f2] transition hover:bg-[#1c40f2] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {editingExperienceIndex === null
                          ? "Save experience"
                          : "Update experience"}
                      </button>
                      {editingExperienceIndex !== null ? (
                        <button
                          type="button"
                          onClick={cancelExperienceEdit}
                          className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-tight text-[#666] transition hover:border-black hover:text-black"
                        >
                          Cancel
                        </button>
                      ) : null}

                      <span className="mt-2 text-xs geist tracking-tighter font-semibold capitalize mon uppercase text-[#999]">
                        {countWords(newExperience.description)} /{" "}
                        {MAX_EXPERIENCE_DESCRIPTION_WORDS}
                      </span>
                    </div>

                    {visibleExperienceEntries.length ? (
                      <div className="mt-5">
                        <p className="mono text-xs hidden font-medium uppercase tracking-tight text-[#999]">
                          Added experience
                        </p>

                        <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          {visibleExperienceEntries.map(({ entry, index }) => (
                            <li
                              key={`${entry.company}-${entry.role}-${index}`}
                              className={`grid overflow-hidden rounded bg-black/5 transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out motion-reduce:transition-none ${
                                removingExperienceIndex === index ||
                                enteringExperienceIndex === index
                                  ? "grid-rows-[0fr] -translate-y-1 opacity-0"
                                  : "grid-rows-[1fr] translate-y-0 opacity-100"
                              } ${
                                editingExperienceIndex === index
                                  ? "ring-1 ring-[#1c40f2]/40"
                                  : ""
                              } ${
                                removingExperienceIndex === null
                                  ? "hover:bg-black/[0.08]"
                                  : "pointer-events-none"
                              }`}
                            >
                              <div className="min-h-0 overflow-hidden p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <button
                                    type="button"
                                    onClick={() => editExperience(index, entry)}
                                    disabled={removingExperienceIndex !== null}
                                    aria-label={`Edit ${entry.role || entry.company || "experience"}`}
                                    className="min-w-0 flex-1 cursor-pointer text-left text-sm tracking-tight text-[#444] outline-none focus-visible:ring-2 focus-visible:ring-[#1c40f2]"
                                  >
                                    {(entry.role || entry.company) && (
                                      <p className="font-medium tracking-tight capitalize text-[#999]">
                                        {entry.role}
                                        {entry.role && entry.company
                                          ? " • "
                                          : ""}
                                        {entry.company}
                                      </p>
                                    )}
                                    {(entry.startDate || entry.endDate) && (
                                      <p className="mt-1 text-[#666]">
                                        {entry.startDate}
                                        {entry.startDate && entry.endDate
                                          ? " – "
                                          : ""}
                                        {entry.endDate || " - Present"}
                                      </p>
                                    )}
                                    {entry.description ? (
                                      <p className="mt-2 whitespace-pre-line w-full leading-4 text-justify text-xs text-[#999]">
                                        {entry.description}
                                      </p>
                                    ) : null}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removeExperience(index)}
                                    disabled={removingExperienceIndex !== null}
                                    aria-label={`Remove ${entry.role || entry.company || "experience"}`}
                                    className="shrink-0 fixed right-2 text-[10px]  font-semibold uppercase tracking-tight text-[#666] transition hover:text-black"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      height="18px"
                                      viewBox="0 -960 960 960"
                                      width="18px"
                                      fill="#999"
                                    >
                                      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </section>

                  <section className="mt-8 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-tight text-[#999]">
                          Custom sections
                        </p>{" "}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 ">
                      <InputArea
                        value={newCustomSection.title}
                        onChange={(event) =>
                          setNewCustomSection((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        maxLength={MAX_CUSTOM_PROFILE_SECTION_TITLE_LENGTH}
                        placeholder="Section title"
                        aria-label="Custom section title"
                        className="min-w-10 rounded max-h-8 px-3 py-2 text-sm placeholder:text-[#aaa]"
                      />

                      <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold capitalize tracking-tight text-[#999]">
                        <input
                          type="date"
                          value={newCustomSection.expiresOn ?? ""}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(event) =>
                            setNewCustomSection((current) => ({
                              ...current,
                              expiresOn: event.target.value || null,
                            }))
                          }
                          className="min-w-0 max-h-8 rounded bg-black/5 px-3 py-2 text-sm font-medium normal-case tracking-tight text-black outline-none"
                        />{" "}
                        optional
                      </label>
                    </div>

                    <textarea
                      value={newCustomSection.content}
                      onChange={(event) =>
                        setNewCustomSection((current) => ({
                          ...current,
                          content: event.target.value,
                        }))
                      }
                      maxLength={MAX_CUSTOM_PROFILE_SECTION_CONTENT_LENGTH}
                      rows={4}
                      placeholder="Write the details you want to share."
                      aria-label="Custom section body"
                      className="mt-3 w-full resize-none rounded bg-black/5 p-3 text-sm leading-5 tracking-tight text-black outline-none placeholder:text-[#aaa]"
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={saveCustomSection}
                          disabled={
                            removingCustomSectionIndex !== null ||
                            (editingCustomSectionIndex === null &&
                              activeForm.custom_sections.length >=
                                MAX_CUSTOM_PROFILE_SECTIONS)
                          }
                          className="rounded-full border mono border-[#1c40f2]/30 px-3 py-1 text-xs font-semibold uppercase tracking-tight text-[#1c40f2] transition hover:bg-[#1c40f2] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {editingCustomSectionIndex === null
                            ? "Save section"
                            : "Update section"}
                        </button>
                        {editingCustomSectionIndex !== null ? (
                          <button
                            type="button"
                            onClick={cancelCustomSectionEdit}
                            className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-tight text-[#666] transition hover:border-black hover:text-black"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                      <span className="text-xs hidden font-medium tracking-tight text-[#999]">
                        {activeForm.custom_sections.length} /{" "}
                        {MAX_CUSTOM_PROFILE_SECTIONS} sections
                      </span>
                    </div>

                    {activeForm.custom_sections.length ? (
                      <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {activeForm.custom_sections.map((section, index) => (
                          <li
                            key={`${section.title}-${index}`}
                            className={`grid overflow-hidden rounded bg-black/5 transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out motion-reduce:transition-none ${
                              removingCustomSectionIndex === index ||
                              enteringCustomSectionIndex === index
                                ? "grid-rows-[0fr] -translate-y-1 opacity-0"
                                : "grid-rows-[1fr] translate-y-0 opacity-100"
                            } ${
                              editingCustomSectionIndex === index
                                ? "ring-1 ring-[#1c40f2]/40"
                                : ""
                            } ${
                              removingCustomSectionIndex === null
                                ? "hover:bg-black/[0.08]"
                                : "pointer-events-none"
                            }`}
                          >
                            <div className="min-h-0 overflow-hidden p-3">
                              <div className="flex items-start justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    editCustomSection(index, section)
                                  }
                                  disabled={removingCustomSectionIndex !== null}
                                  aria-label={`Edit ${section.title || "custom section"}`}
                                  className="min-w-0 flex-1 cursor-pointer text-left text-sm tracking-tight text-[#444] outline-none focus-visible:ring-2 focus-visible:ring-[#1c40f2]"
                                >
                                  <p className="font-medium tracking-tight text-[#999]">
                                    {section.title || "Untitled section"}
                                  </p>
                                  <p className="mt-2 whitespace-pre-line font-medium tracking-tight text-xs leading-4 text-justify text-[#666]">
                                    {section.content}
                                  </p>
                                  {section.expiresOn ? (
                                    <p className="mt-2  text-xs font-medium uppercase tracking-tight text-[#999]">
                                      {isCustomProfileSectionExpired(section)
                                        ? "Expired"
                                        : ""}{" "}
                                      {section.expiresOn}
                                    </p>
                                  ) : null}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCustomSection(index)}
                                  disabled={removingCustomSectionIndex !== null}
                                  aria-label={`Remove ${section.title || "custom section"}`}
                                  className="shrink-0 fixed right-2  text-[10px] font-semibold uppercase tracking-tight text-[#666] transition hover:text-black"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    height="18px"
                                    viewBox="0 -960 960 960"
                                    width="18px"
                                    fill="#999"
                                  >
                                    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>

                  <section className="mt-4 pt-5">
                    <p className="text-sm font-medium uppercase tracking-tight text-[#999]">
                      gallery <span>*</span>
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {[0, 1].map((position) => {
                        const item = mediaByPosition.get(position);
                        const isUploading = uploadingSlot === position;
                        const mediaUrl = item
                          ? (mediaUrls[item.storage_path] ?? "")
                          : "";

                        return (
                          <div key={position}>
                            <label
                              className={`group relative flex max-w-xs aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden border border-dashed transition hover:border-black ${draggingSlot === position ? "border-black bg-black/[0.06]" : "border-black/20 bg-black/[0.03]"}`}
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (!isUploading) setDraggingSlot(position);
                              }}
                              onDragEnter={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (!isUploading) setDraggingSlot(position);
                              }}
                              onDragLeave={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (draggingSlot === position) {
                                  setDraggingSlot(null);
                                }
                              }}
                              onDrop={(event) => {
                                void handleMediaDrop(position, event);
                              }}
                            >
                              <input
                                type="file"
                                accept={acceptedMediaTypes.join(",")}
                                onChange={(event) => {
                                  void handleMediaUpload(position, event);
                                }}
                                disabled={isUploading}
                                className="sr-only"
                              />
                              {item?.media_type === "video" ? (
                                <video
                                  src={mediaUrl}
                                  muted
                                  playsInline
                                  className="h-full w-full object-cover"
                                />
                              ) : item ? (
                                <img
                                  src={mediaUrl}
                                  alt={`Work media ${position + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    height="24px"
                                    viewBox="0 -960 960 960"
                                    width="24px"
                                    fill="#000"
                                    aria-hidden="true"
                                  >
                                    <path d="M170-228q-38-45-61-99T80-440h82q6 43 22 82.5t42 73.5l-56 56ZM80-520q8-59 30-113t60-99l56 56q-26 34-42 73.5T162-520H80ZM438-82q-59-6-112.5-28.5T226-170l56-58q35 26 74 43t82 23v80ZM284-732l-58-58q47-37 101-59.5T440-878v80q-43 6-82.5 23T284-732ZM518-82v-80q44-6 83.5-22.5T676-228l58 58q-47 38-101.5 60T518-82Zm160-650q-35-26-75-43t-83-23v-80q59 6 113.5 28.5T734-790l-56 58Zm112 504-56-56q26-34 42-73.5t22-82.5h82q-8 59-30 113t-60 99Zm8-292q-6-43-22-82.5T734-676l56-56q38 45 61 99t29 113h-82ZM441-280v-247L337-423l-56-57 200-200 200 200-57 56-103-103v247h-80Z" />
                                  </svg>
                                  <span className="mono text-center animate-pulse text-xs font-medium uppercase tracking-tight text-black">
                                    {isUploading
                                      ? "Uploading..."
                                      : position === 0
                                        ? "Upload image"
                                        : "Upload image or video"}
                                  </span>
                                  {isUploading ? (
                                    ""
                                  ) : position === 0 ? (
                                    <span className="mono text-center text-xs font-medium uppercase tracking-tighter text-[#999]">
                                      JPG, PNG, WebP, and AVIF files up to 8 MB
                                      are accepted.
                                    </span>
                                  ) : (
                                    <span className="mono text-center text-xs font-medium uppercase tracking-tighter text-[#999]">
                                      JPG, PNG, WebP, AVIF, MP4, and WebM files
                                      up to 8 MB are accepted.
                                    </span>
                                  )}
                                </div>
                              )}
                              {item && !isUploading ? (
                                <span className="absolute mono uppercase inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                                  Replace media
                                </span>
                              ) : null}
                            </label>
                            {item ? (
                              <button
                                type="button"
                                onClick={() => {
                                  void handleMediaRemove(item);
                                }}
                                disabled={isUploading}
                                className="mt-2 z-10 giest tracking-tight text-xs font-semibold text-[#666]  transition hover:text-black disabled:cursor-not-allowed"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section className="mt-8  w-full text-sm font-semibold">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <p className=" text-xs uppercase tracking-tight text-[#999] font-medium">
                          Honours
                        </p>
                        <div className="mt-3 flex lg:items-center  gap-3 ">
                          <InputArea
                            leadingIcon={getProfileFieldIcon("award")}
                            wrapperClassName="flex min-w-0 flex-1 items-center gap-1 rounded bg-black/5 px-2"
                            variant="plain"
                            value={newAward}
                            onChange={(event) =>
                              setNewAward(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addAward();
                              }
                            }}
                            placeholder="Award or recognition"
                            className="min-w-0 capitalize text-sm placeholder:text-[#aaa]"
                          />
                          <button
                            type="button"
                            onClick={addAward}
                            className="w-fit shrink-0  rounded mono uppercase border border-black px-2 py-1 text-xs font-medium transition hover:bg-black hover:text-white"
                          >
                            save
                          </button>
                        </div>
                      </div>

                      <div className="min-w-0">
                        {parseAwards(activeForm.awards).length ? (
                          <ul className="mt-8  ">
                            {parseAwards(activeForm.awards).map(
                              (award, index) => (
                                <li
                                  key={`${award}-${index}`}
                                  className="flex items-center mb-1  bg-black/0 rounded justify-between gap-4 py-1 px-2  text-sm font-normal"
                                >
                                  <span className="min-w-0 capitalize font-medium break-word">
                                    {award}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeAward(index)}
                                    className="shrink-0 mono uppercase cursor-pointer rounded-full bg-black/ px-1 py-1 text-xs font-medium text-[#777] transition hover:bg-black hover:text-white"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      height="18px"
                                      viewBox="0 -960 960 960"
                                      width="18px"
                                      fill="currentColor"
                                    >
                                      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                    </svg>
                                  </button>
                                </li>
                              ),
                            )}
                          </ul>
                        ) : (
                          <div className="border-y border-dashed mt-8 border-black/15 py-2 mono uppercase text-sm font-medium text-[#999]">
                            No awards added yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                  <section className="mt-10 pt-5">
                    <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                      Let&apos;s Connect
                    </p>
                    <p className="mt-2 tracking-tight mono hidden text-sm text-[#666]">
                      Add only the portfolio and accounts you want to show
                      publicly.
                    </p>
                    <div className="mt-5 grid gap-x-6 gap-y-5 grid-cols-2 md:grid-cols-3">
                      {socialOptions.map(({ type, label }) => {
                        const hasSavedLink = socialLinks.some(
                          (link) => link.type === type,
                        );

                        return !hasSavedLink ||
                          editingSocialType === type ||
                          type === "booking" ? (
                          <label
                            key={type}
                            className="flex flex-col gap-2 text-sm mono font-medium uppercase"
                          >
                            <span className="flex items-center gap-2 text-[#999]">
                              <span className="flex items-center justify-center  text-black">
                                {getSocialIcon(type)}
                              </span>
                              <span className="sr-only">{label}</span>
                            </span>
                            <InputArea
                              leadingIcon={getSocialInputIcon(type)}
                              wrapperClassName="relative flex min-w-0 items-center gap-1 rounded bg-black/5 px-2"
                              variant="plain"
                              className="mt-0 min-w-0 geist tracking-tight text-sm font-medium transition placeholder:text-[#aaa] focus:border-black"
                              aria-label={label}
                              title={label}
                              value={socials[type]}
                              onChange={(event) =>
                                handleSocialChange(type, event)
                              }
                              placeholder={
                                type === "portfolio"
                                  ? "https://yourportfolio.com"
                                  : type === "booking"
                                    ? "https://calendly.com/your-name"
                                    : type === "email"
                                      ? "you@example.com"
                                      : type === "discord"
                                        ? "Username/ User ID"
                                        : "Username"
                              }
                              type={
                                type === "portfolio" || type === "booking"
                                  ? "url"
                                  : "text"
                              }
                            />
                          </label>
                        ) : null;
                      })}
                    </div>
                  </section>
                </div>
              </form>
            </div>
          ) : null}
        </section>
      </main>

      {isSponsorModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sponsor-profile-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-2xl">
            <p className="mono text-xs font-semibold uppercase tracking-tight text-[#1c40f2]">
              Sponsor profile
            </p>
            <h2
              id="sponsor-profile-title"
              className="mt-3 text-3xl geist  font-semibold tracking-tighter text-black"
            >
              Put your work in front.
            </h2>
            <p className="mt-3 text-sm geist leading-5 font-medium tracking-tight text-[#999]">
              Choose a one-time sponsorship amount to support the directory.
              Payments are securely handled by Polar.
            </p>
            <div className="mt-6  grid grid-cols-4 gap-2">
              {[500, 1500, 3000, 5000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setSponsorshipAmount(amount)}
                  className={`rounded-full border px-2 cursor-pointer py-1 geist tracking-tight text-sm font-semibold transition ${
                    sponsorshipAmount === amount
                      ? "border-[#1c40f2]/40 bg-[#1c40f2]/30 "
                      : "border-black/20 text-black hover:bg-[#1c40f2]/30 hover:border-[#1c40f2]/40"
                  }`}
                >
                  ${(amount / 100).toFixed(0)}
                </button>
              ))}
            </div>
            <label className="mt-5 hidden block mono uppercase tracking-tight text-xs font-medium text-black">
              Or choose your amount
              <div className="mt-2 flex items-center rounded-full border border-black/20 px-4 py-2 focus-within:border-[#1c40f2]">
                <span className="text-[#666]">$</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  inputMode="decimal"
                  value={(sponsorshipAmount / 100).toFixed(2)}
                  onChange={(event) => {
                    const amount = Number(event.target.value);
                    setSponsorshipAmount(
                      Number.isFinite(amount) ? Math.round(amount * 100) : 0,
                    );
                  }}
                  className="ml-2 w-full bg-transparent text-sm font-semibold outline-none"
                  aria-label="Custom sponsorship amount in US dollars"
                />
              </div>
              <span className="mt-2 block text-xs font-normal text-[#777]">
                Choose any amount from $<span className="geist">1</span> to $
                <span className="geist">10,000 </span>USD.
              </span>
            </label>
            <div className="mt-6 flex flex-wrap justify- gap-3">
              <button
                type="button"
                onClick={() => setIsSponsorModalOpen(false)}
                className="rounded-full mono uppercase tracking-tighter border border-black/20 px-2 py-1 text-xs font-medium text-black transition hover:border-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSponsorCheckout()}
                disabled={startingCheckout}
                className="rounded-full mono uppercase tracking-tighter bg-black px-2 py-1 text-xs font-medium text-white transition hover:bg-[#1c40f2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {startingCheckout ? "Opening checkout..." : "Checkout"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-2xl">
            <h2
              id="delete-account-title"
              className="mt-3 text-3xl geist font-bold tracking-tighter text-black"
            >
              Are you sure you want to delete your account?
            </h2>
            <p className="mt-3 text-sm geist  font-medium tracking-tight leading-tight text-[#999]">
              This permanently deletes your profile, uploaded media, links, and
              account. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-full mono border border-black/20 px-3 py-1 text-xs font-medium uppercase tracking-tight text-black transition hover:border-black"
              >
                Keep account
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="rounded-full bg-red-600 px-3 py-1 mono text-xs font-medium uppercase tracking-tight text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={deletingAccount}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isInquiryDrawerOpen ? (
        <>
          <button
            type="button"
            aria-label="Close project inquiries"
            onClick={() => setIsInquiryDrawerOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/45 backdrop-blur-sm"
          />
          <aside
            aria-labelledby="inquiries-drawer-title"
            className="profile-inquiry-drawer fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white px-6 pb-8 pt-8 text-black shadow-2xl sm:px-8"
          >
            <div className="flex items-start justify-between gap-4 ">
              <div>
                <p className="mono  font-me uppercase tracking-tight text-[#1c40f2]">
                  Inbox
                </p>
              </div>
              <div className="flex items-center gap-2">
                {archivedInquiryCount ? (
                  <button
                    type="button"
                    aria-label={
                      showArchivedInquiries
                        ? "Show active inquiries"
                        : `Show ${archivedInquiryCount} archived ${archivedInquiryCount === 1 ? "inquiry" : "inquiries"}`
                    }
                    title={
                      showArchivedInquiries
                        ? "Show active inquiries"
                        : "Show archived inquiries"
                    }
                    onClick={() =>
                      setShowArchivedInquiries((current) => !current)
                    }
                    className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition hover:bg-black hover:text-white ${showArchivedInquiries ? "bg-black text-white" : "border-black text-black"}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 -960 960 960"
                      width="18"
                      height="18"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M160-160v-640h240v80H240v480h480v-480H560v-80h240v640H160Zm160-200v-80h320v80H320Zm0-160v-80h320v80H320Zm0-160v-80h320v80H320Z" />
                    </svg>
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1c40f2] px-1 text-[9px] font-bold text-white">
                      {archivedInquiryCount > 9 ? "9+" : archivedInquiryCount}
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Close project inquiries"
                  onClick={() => setIsInquiryDrawerOpen(false)}
                  className="flex h-8 w-8 items-center cursor-pointer justify-center rounded-full text-xl text-[#666] transition hover:bg-black hover:text-white"
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
            </div>

            <div className="flex w-full justify-between">
              {unreadInquiryCount ? (
                <button
                  type="button"
                  onClick={markAllInquiriesAsRead}
                  className="mt-4 w-fit mono cursor-pointer text-xs font-semibold uppercase tracking-tight text-[#1c40f2] transition hover:text-black"
                >
                  Mark all as read
                </button>
              ) : null}
            </div>

            {visibleInquiries.length ? (
              <div className="mt-5 flex flex-col gap-3">
                {visibleInquiries.map((inquiry) => (
                  <article
                    key={inquiry.id}
                    className="bg-[#1c40f2]/20 rounded-md p-2 px-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-[#666]">
                      <span className="text-[#999] mono uppercase  text-sm font-medium tracking-tighter ">
                        {inquiry.sender_name}
                      </span>

                      <span className="text-[#999] geist  text-xs mb-2 font-medium tracking-tight ">
                        <time dateTime={inquiry.created_at}>
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </time>
                      </span>
                    </div>
                    {inquiry.sender_phone ? (
                      <a
                        href={`tel:${inquiry.sender_phone}`}
                        className="text-[#999] mb-2 mono uppercase text-sm font-medium tracking-tighter hover:text-black"
                      >
                        {inquiry.sender_phone}
                      </a>
                    ) : null}
                    <a
                      href={`mailto:${inquiry.sender_email}`}
                      className="mono  text-sm mb-2 tracking-tight font-medium mt-1 block text-xs text-[#1c40f2] hover:underline"
                    >
                      {inquiry.sender_email}
                    </a>
                    {inquiry.project_type || inquiry.company_name ? (
                      <div className="mt-2 flex geist tracking-tight flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[#666]">
                        {inquiry.project_type ? (
                          <span>Project type: {inquiry.project_type}</span>
                        ) : null}
                        {inquiry.company_name ? (
                          <span>Company: {inquiry.company_name}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="mt-3 whitespace-pre-wrap  text-xs font-medium leading-tight geist tracking-tight">
                      {inquiry.project_brief}
                    </p>
                    <div className=" -mt-2 flex w-full justify-between items-center gap-2">
                      <div className="flex w-full items-center gap-2 ">
                        {inquiry.budget ? (
                          <p className="mt-3 geist uppercase tracking-tight capitalize text-xs font-medium text-[#999]">
                            ${[inquiry.budget].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                        {inquiry.timeline ? (
                          <p className="mt-3 mono uppercase tracking-tight capitalize text-xs font-medium text-[#999]">
                            {[inquiry.timeline].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label={`${inquiry.archived_at ? "Unarchive" : "Archive"} inquiry from ${inquiry.sender_name}`}
                        title={
                          inquiry.archived_at
                            ? "Unarchive inquiry"
                            : "Archive inquiry"
                        }
                        onClick={() => void handleArchiveInquiry(inquiry)}
                        className="mt-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#666] transition hover:bg-black hover:text-white"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 -960 960 960"
                          width="16"
                          height="16"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M160-160v-640h240v80H240v480h480v-480H560v-80h240v640H160Zm160-200v-80h320v80H320Zm0-160v-80h320v80H320Zm0-160v-80h320v80H320Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete inquiry from ${inquiry.sender_name}`}
                        title="Delete inquiry"
                        onClick={() => setInquiryPendingDeletion(inquiry)}
                        disabled={deletingInquiryId === inquiry.id}
                        className="mt-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full  text-[#666] transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 -960 960 960"
                          width="16"
                          height="16"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
                        </svg>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-xs mono uppercase leading-relaxed text-[#666]">
                {showArchivedInquiries
                  ? "No archived inquiries yet."
                  : "No project inquiries yet."}
              </p>
            )}
          </aside>
        </>
      ) : null}

      {isWelcomeOverlayOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-center ">
            <h2 className="mono text-xl uppercase tracking-tight">
              Welcome to WeEverything!
            </h2>
            <p className="mt-3 font-mono text-sm uppercase tracking-tight text-black/60">
              Thank you for signing up. Your account is ready. Start building
              your profile and share what you make with the community.
            </p>
            <button
              type="button"
              onClick={() => setIsWelcomeOverlayOpen(false)}
              className="mt-6 rounded-full bg-black px-2 cursor-pointer py-1 mono text-xs font-medium uppercase tracking-tight text-white transition hover:bg-[#1c40f2]"
            >
              CLOSE
            </button>
          </div>
        </div>
      ) : null}

      {inquiryPendingDeletion ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-6 backdrop-blur-sm">
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-md">
            <div className="relative w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#999]">
                Confirm delete
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tighter text-black">
                Are you sure you want to delete this inquiry?
              </h2>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void handleDeleteInquiry(inquiryPendingDeletion.id)
                  }
                  disabled={Boolean(deletingInquiryId)}
                  className="cursor-pointer rounded-full bg-black px-3 py-1 text-sm font-semibold text-white transition hover:bg-[#1c40f2]"
                >
                  {deletingInquiryId ? "Deleting..." : "Yes, delete"}
                </button>

                <button
                  type="button"
                  onClick={() => setInquiryPendingDeletion(null)}
                  disabled={Boolean(deletingInquiryId)}
                  className="cursor-pointer rounded-full border border-black/20 px-3 py-1 text-sm font-semibold text-black transition hover:border-black"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProfilePage;
