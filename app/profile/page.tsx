"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaThreads,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { User } from "@supabase/supabase-js";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase/client";
import { getProfileHandle } from "@/lib/profile-handle";
import { isSafeExternalUrl } from "@/lib/safe-url";
import {
  getSocialInputValue,
  getSocialUrl,
  isValidEmailAddress,
  isValidSocialHandle,
} from "@/lib/social-links";

type ProfileRecord = {
  id: string;
  handle: string | null;
  name: string | null;
  role: string | null;
  bio: string | null;
  location: string | null;
  awards: string | null;
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
};

type ProfileInquiry = {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
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
  | "email";

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
  avatar_url: string;
  is_published: boolean;
};

type SocialForm = Record<SocialType, string>;

const MEDIA_BUCKET = "profile-media";
const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
const acceptedMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
];

const roles = [
  "Designer",
  "Developer",
  "Illustrator",
  "Photographer",
  "Animator",
  "Art Director",
  "Copywriter",
  "Filmmaker",
  "Musician",
  "Stylist",
  "Writer",
  "Other",
] as const;

const ROLE_SEPARATOR = " | ";
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

const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;

const parseAwards = (value: string) =>
  value
    .split("\n")
    .map((award) => award.trim())
    .filter(Boolean);

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
];

const getSocialIcon = (type: SocialType) => {
  switch (type) {
    case "portfolio":
      return <FaGlobe className="text-base" />;
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
        <svg width="20" height="16"  fill="currentColor" viewBox="0 0 30 16">
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
    default:
      return null;
  }
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
        preload="metadata"
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
  const [customRoleInput, setCustomRoleInput] = useState("");
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
  const [publishing, setPublishing] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [shareLabel, setShareLabel] = useState("Share profile");
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
  const profileFormRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState(() =>
    supabase
      ? ""
      : "Supabase is not configured yet. Add your public environment variables first.",
  );

  useEffect(() => {
    const client = supabase;

    if (!client) return;

    let isMounted = true;

    const loadProfile = async (currentUser: User | null) => {
      if (!currentUser) {
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
            "id, handle, name, role, bio, location, awards, avatar_url, is_published",
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
          .select("status")
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
            "id, sender_name, sender_email, sender_phone, project_brief, budget, timeline, created_at, archived_at",
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

      if (!isMounted) return;

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
        (paymentResult.data as SponsorshipPayment | null)?.status === "paid",
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

  const handleRoleToggle = (role: string) => {
    setForm((current) => {
      if (!current) return current;

      const selectedRoles = parseRoles(current.role);
      if (role === "Other") {
        const hasOther =
          selectedRoles.includes("Other") ||
          Boolean(getCustomRole(current.role));

        if (hasOther) {
          setCustomRoleInput("");
          return {
            ...current,
            role: formatRoles(
              selectedRoles.filter((selectedRole) =>
                standardRoles.has(selectedRole),
              ),
            ),
          };
        }

        return {
          ...current,
          role: formatRoles([...selectedRoles, "Other"]),
        };
      }

      const isSelected = selectedRoles.includes(role);
      const nextRoles = isSelected
        ? selectedRoles.filter((selectedRole) => selectedRole !== role)
        : [...selectedRoles, role];

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

  const handleSponsorProfile = () => {
    setIsSponsorModalOpen(true);
    setSponsorshipIdempotencyKey(crypto.randomUUID());
    setMessage("");
  };

  const handleShareProfile = async () => {
    if (!user) return;

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

    window.location.assign(result.url);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !user || !form) return;

    const bioWordCount = countWords(form.bio);

    if (bioWordCount < 20) {
      setMessage(
        `Your bio is required and must contain at least 20 words. It currently has ${bioWordCount}.`,
      );
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

    const profilePayload = {
      handle: profile?.handle ?? getProfileHandle(getHandle(user)),
      name: form.name.trim(),
      role: form.role,
      bio: form.bio.trim() || null,
      location: form.location.trim() || null,
      awards: form.awards.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      is_published: form.is_published,
    };
    const profileResult = profile
      ? await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", user.id)
          .select(
            "id, handle, name, role, bio, location, awards, avatar_url, is_published",
          )
          .single()
      : await supabase
          .from("profiles")
          .insert({ id: user.id, ...profilePayload })
          .select(
            "id, handle, name, role, bio, location, awards, avatar_url, is_published",
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

      if (type === "portfolio") return !isSafeExternalUrl(value);
      if (type === "email") return !isValidEmailAddress(value);
      return !isValidSocialHandle(value);
    });

    if (invalidSocialInput) {
      setSaving(false);
      setMessage(
        "Use valid usernames for social accounts, a valid email address, and a valid HTTP or HTTPS URL for your portfolio.",
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
    setMessage("Profile changes saved.");
  };

  const handlePublishToggle = async () => {
    if (!supabase || !user || !form || publishing || saving) return;

    const nextPublishedState = !form.is_published;
    const bioWordCount = countWords(form.bio);
    const hasPrimaryImage = media.some(
      (item) => item.position === 0 && item.media_type === "image",
    );

    if (nextPublishedState && bioWordCount < 20) {
      setMessage(
        `Your bio must contain at least 20 words before publishing. It currently has ${bioWordCount}.`,
      );
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
        "id, handle, name, role, bio, location, awards, avatar_url, is_published",
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
      setMessage("Media files must be 15 MB or smaller.");
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

        <main className="flex min-h-screen items-center justify-center px-6 py-20">
          <section className="w-full max-w-xl border-t border-black pt-5">
            <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
              Your profile
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tighter text-black sm:text-5xl">
              Sign in to make your profile.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#666]">
              Your member profile is where you can add your bio, discipline,
              location, work, and social links.
            </p>
            <Link
              href="/signin"
              className="mt-7 inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c40f2]"
            >
              Sign in with Google
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const activeForm = form ?? toForm(user, profile);
  const profileName = profile?.name || getFallbackName(user);
  const handle = getHandle(user);
  const avatarUrl = activeForm.avatar_url;
  const initial = profileName.charAt(0).toUpperCase() || "U";
  const visibleSocials = socialLinks.filter(
    (link) => link.url && isSafeExternalUrl(link.url),
  );
  const mediaByPosition = new Map(media.map((item) => [item.position, item]));
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
    setCustomRoleInput(getCustomRole(profile?.role ?? ""));
    setSocials(toSocialForm(socialLinks));
    setEditingSocialType(null);
    setNewAward("");
    setIsEditing(true);
    window.setTimeout(() => bioInputRef.current?.focus(), 0);
  };

  const handleUpdateClick = () => {
    const shouldOpen = !isEditing;

    setMessage("");
    setForm(toForm(user, profile));
    setCustomRoleInput(getCustomRole(profile?.role ?? ""));
    setSocials(toSocialForm(socialLinks));
    setEditingSocialType(null);
    setNewAward("");
    setIsEditing(shouldOpen);
  };

  return (
    <div>
      <Navbar />

      <main className="min-h-screen px-6 pb-28 pt-32 text-black sm:px-10">
        <section className="mx-auto w-full max-w-6xl border- mt-10 border-black pt-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tighter sm:text-6xl">
                {profileName}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => void handlePublishToggle()}
                disabled={publishing || saving}
                className={`rounded-full cursor-pointer px-3 py-1 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 ${profile?.is_published ? "bg-black" : "bg-[#1c40f2]"}`}
              >
                {publishing
                  ? "Saving..."
                  : profile?.is_published
                    ? "Unpublish"
                    : "Publish"}
              </button>
              <button
                type="button"
                onClick={handleSponsorProfile}
                className="rounded-full  cursor-pointer bg-[#1c40f2] px-3 py-1 text-xs  font-semibold text-white transition hover:bg-black"
              >
                Promote
              </button>
              <button
                type="button"
                onClick={handleUpdateClick}
                className="rounded-full cursor-pointer border border-black px-3 py-1 text-xs  font-semibold transition hover:bg-black hover:text-white"
              >
                {isEditing ? "Close editor" : "Update"}
              </button>
              <button
                type="button"
                onClick={() => void handleShareProfile()}
                className="rounded-full cursor-pointer border border-black px-3 py-1 text-xs font-semibold transition hover:bg-black hover:text-white"
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
            <p className="mt-6 border rounded-md border-[#1c40f2]/20 bg-[#1c40f2]/5 px-3 py-1 text-sm text-[#1734a9]">
              {message}
            </p>
          ) : null}

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
            <div>
              <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfbf00] text-4xl font-semibold uppercase text-black">
                  <span aria-hidden>{initial}</span>
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
                  <p className="mono text-sm font-medium uppercase tracking-tight text-[#1c40f2]">
                    @{handle}
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight">
                    {profile?.role || "Designer"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                      {profile?.is_published ? "Live profile" : "Draft profile"}
                    </span>
                    {profile?.location ? (
                      <span className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold text-[#666]">
                        {profile.location}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-14 max-w-2xl border-t border-black/10 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    About me
                  </p>
                  <button
                    type="button"
                    onClick={openBioEditor}
                    aria-label="Edit bio"
                    title="Edit bio"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-black/15 text-black transition hover:bg-black hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
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
                </div>

                <p className="mt-4 text-sm  leading-4 tracking-tighter text-[#444] sm:text-sm">
                  {activeForm.bio ||
                    "Add a short introduction so the community knows what you make and how you work."}
                </p>
              </div>
              {profile?.awards ? (
                <section className="mt-14 max-w-2xl border-t border-black/10 pt-5">
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    Awards
                  </p>
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed tracking-tight text-[#444]">
                    {profile.awards}
                  </p>
                </section>
              ) : null}
              {visibleSocials.length ? (
                <section className="mt-14 border-t border-black/10 pt-5">
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    Find me online
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
              <p className="mt-4 text-lg font-semibold tracking-tight">
                {profile?.is_published
                  ? "Visible to everyone"
                  : "Only visible to you"}
              </p>
              {sponsored ? (
                <span className="mt-3 inline-flex rounded-full bg-[#1c40f2] px-3 py-1 text-xs font-semibold uppercase tracking-tight text-white">
                  Sponsored profile
                </span>
              ) : null}
              <p className="mt-4 text-sm font-semibold text-[#666]">
                {profileViews.toLocaleString()} profile views
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#666]">
                {profile?.is_published
                  ? "Your profile is ready to appear in the directory."
                  : "Finish your details, then switch on public visibility when you are ready."}
              </p>

              <div className="mt-8 border-t border-black/10 pt-5">
                <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                  Signed in as
                </p>
                <p className="mt-2 break-all text-xs mon uppercase  tracking-tight font-medium text-[#1c40f2]">
                  Name:{" "}
                  {user.user_metadata.full_name || user.user_metadata.name}
                </p>
                <p className="mt-2 break-all moo uppercase tracking-tight   text-xs font-medium text-[#1c40f2]">
                  Email: {user.email}
                </p>
              </div>

              <div className="mt-8 border-t border-red-200 pt-5">
                <p className="mono text-xs font-medium uppercase tracking-tight text-red-500">
                  Danger zone
                </p>
                <button
                  type="button"
                  onClick={openDeleteAccountModal}
                  disabled={deletingAccount}
                  className="mt-3 rounded-full cursor-pointer border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                className="  pointer-events-auto fixed bottom-0 left-0 right-0 z-50 flex h-[90vh] max-h-[90dvh] min-h-0 touch-pan-y flex-col overflow-y-auto overscroll-contain rounded-t bg-white px-6 py-10 shadow-2xl sm:px-10"
              >
                <div className="max-w-3xl mx-auto w-full geist tracking-tight font-medium">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="mono text-sm font-medium tracking-tighter uppercase tracking-tight text-[#999]">
                        your Profile
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
                      disabled={saving}
                      className="rounded-full bg-[#1c40f2] mono uppercase cursor-pointer px-3 py-1 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#9caeff]"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>

                  <div className="mt-8 grid gap-6 md:grid-cols-2">
                    <label className="text-sm mono uppercase tracking-tight text-[#999] font-medium">
                      Name <span>*</span>
                      <input
                        required
                        name="name"
                        value={activeForm.name}
                        onChange={handleChange}
                        className="mt-2 w-full border-b text-black geist border-black/20 bg-transparent px-0 py-1 outline-none transition focus:border-black"
                      />
                    </label>
                    <label className="text-sm mono uppercase tracking-tight text-[#999] font-medium ">
                      Location <span>*</span>
                      <input
                        required
                        name="location"
                        value={activeForm.location}
                        onChange={handleChange}
                        placeholder="City, country"
                        className="mt-2 w-full border-b geist text-black border-black/20 bg-transparent px-0 py-1 outline-none transition placeholder:text-[#aaa] focus:border-black"
                      />
                    </label>
                    <fieldset className="text-sm font-semibold">
                      <legend className="mono uppercase tracking-tight text-[#999] font-medium">
                        Disciplines <span>*</span>
                      </legend>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {roles.map((role) => {
                          const selectedRoles = parseRoles(activeForm.role);
                          const checked =
                            role === "Other"
                              ? Boolean(getCustomRole(activeForm.role)) ||
                                selectedRoles.includes("Other")
                              : selectedRoles.includes(role);

                          return (
                            <button
                              key={role}
                              type="button"
                              aria-pressed={checked}
                              onClick={() => handleRoleToggle(role)}
                              className={`rounded-full border tracking-tight px-2 py-1 text-xs mono uppercase font-medium transition ${
                                checked
                                  ? " bg-[#1c40f2] border-none transition-colors duration-500 text-white"
                                  : "border-none bg-black/5 transition-colors duration-500 hover:bg-black/10 text-[#999]"
                              }`}
                            >
                              {role}
                            </button>
                          );
                        })}
                      </div>
                      {Boolean(getCustomRole(activeForm.role)) ||
                      parseRoles(activeForm.role).includes("Other") ? (
                        <div className="mt-4">
                          <label className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                            Custom discipline
                          </label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              value={customRoleInput}
                              onChange={(event) =>
                                handleCustomRoleChange(event.target.value)
                              }
                              placeholder="Type your discipline"
                              className="w-full border-b border-black/20 bg-transparent px-0 py-1 font-medium text-black outline-none transition placeholder:text-[#aaa] focus:border-black"
                            />
                          </div>
                        </div>
                      ) : null}
                    </fieldset>
                  </div>

                  <label className="mt-8 block mono text-sm font-Medium uppercase tracking-tight text-[#999]">
                    About Me <span>*</span>
                    <textarea
                      ref={bioInputRef}
                      required
                      name="bio"
                      value={activeForm.bio}
                      onChange={handleChange}
                      rows={4}
                      minLength={20}
                      placeholder="Tell people what you do in at least 20 words."
                      className="mt-2 w-full text-black geist resize-y border border-black/15 bg-transparent rounded p-3 outline-none transition placeholder:text-[#aaa] focus:border-[#1c40f2]/50  focus:border-2"
                    />
                    <p className="mt-2 text-xs font-medium capitalize mono uppercase text-[#999]">
                      {countWords(activeForm.bio)} / 20 words minimum
                    </p>
                  </label>

                  <section className="mt-8  w-full text-sm font-semibold">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <p className="mono uppercase tracking-tight text-[#999] font-medium">
                          Awards & Recognitions
                        </p>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                          <input
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
                            className="min-w-0 flex-1 capitalize font-medium border-b border-black/20 bg-transparent px-0 py-2 outline-none transition placeholder:text-[#aaa] focus:border-black"
                          />
                          <button
                            type="button"
                            onClick={addAward}
                            className="w-fit shrink-0 rounded-full mono uppercase border border-black px-3 py-1 text-xs font-medium transition hover:bg-black hover:text-white"
                          >
                            Add
                          </button>
                        </div>
                        <p className="mt-3 mono uppercase text-xs font-medium text-[#999]">
                          Optional. Add as many awards as you like.
                        </p>
                      </div>

                      <div className="min-w-0">
                        {parseAwards(activeForm.awards).length ? (
                          <ul className="divide-y divide-black/10 border-y border-black/10">
                            {parseAwards(activeForm.awards).map(
                              (award, index) => (
                                <li
                                  key={`${award}-${index}`}
                                  className="flex items-center justify-between gap-4 py-3 text-sm font-normal"
                                >
                                  <span className="min-w-0 font-medium break-words">
                                    {award}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeAward(index)}
                                    className="shrink-0 mono uppercase cursor-pointer rounded-full bg-black/5 px-2 py-1 text-xs font-medium text-[#777] transition hover:bg-black hover:text-white"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ),
                            )}
                          </ul>
                        ) : (
                          <div className="border-y border-dashed border-black/15 py-5 mono uppercase text-sm font-medium text-[#999]">
                            No awards added yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="mt-10 border-t border-black/10 pt-5">
                    <p className="mono text-sm font-medium uppercase tracking-tight text-[#999]">
                      media<span>*</span>
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
                                  <span className="mono text-center text-xs font-medium uppercase tracking-tight text-black">
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
                                      JPG, PNG, WebP, and AVIF files up to 15 MB
                                      are accepted.
                                    </span>
                                  ) : (
                                    <span className="mono text-center text-xs font-medium uppercase tracking-tighter text-[#999]">
                                      JPG, PNG, WebP, AVIF, MP4, and WebM files
                                      up to 15 MB are accepted.
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
                                className="mt-2 z-10 mono uppercase tracking-tight text-xs font-medium text-[#666] underline underline-offset-4 transition hover:text-black disabled:cursor-not-allowed"
                              >
                                Remove media
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="mt-10 border-t border-black/10 pt-5">
                    <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                      Portfolio & social links
                    </p>
                    <p className="mt-2 tracking-tight mono hidden text-sm text-[#666]">
                      Add only the portfolio and accounts you want to show
                      publicly.
                    </p>
                    <div className="mt-5 grid gap-x-6 gap-y-5 md:grid-cols-3">
                      {socialOptions.map(({ type, label }) => {
                        const hasSavedLink = socialLinks.some(
                          (link) => link.type === type,
                        );

                        return !hasSavedLink || editingSocialType === type ? (
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
                            <input
                              aria-label={label}
                              title={label}
                              value={socials[type]}
                              onChange={(event) =>
                                handleSocialChange(type, event)
                              }
                              placeholder={
                                type === "portfolio"
                                  ? "https://yourportfolio.com"
                                  : type === "email"
                                    ? "you@example.com"
                                    : type === "discord"
                                      ? "Username/User ID"
                                      : "Username"
                              }
                              type={type === "portfolio" ? "url" : "text"}
                              className="mt-0 w-full geist tracking-tight border-b border-black/20 bg-transparent px-0 py-1 text-sm font-medium outline-none transition placeholder:text-[#aaa] focus:border-black"
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
            <p className="mono text-xs font-semibold uppercase tracking-[0.1em] text-[#1c40f2]">
              Sponsor profile
            </p>
            <h2
              id="sponsor-profile-title"
              className="mt-3 text-3xl font-bold tracking-tighter text-black"
            >
              Put your work in front.
            </h2>
            <p className="mt-3 text-sm leading-tighter text-[#666]">
              Choose a one-time sponsorship amount to support the directory.
              Payments are securely handled by Polar.
            </p>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {[500, 1500, 3000, 5000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setSponsorshipAmount(amount)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    sponsorshipAmount === amount
                      ? "border-[#1c40f2] bg-[#1c40f2] text-white"
                      : "border-black/20 text-black hover:border-black"
                  }`}
                >
                  ${(amount / 100).toFixed(0)}
                </button>
              ))}
            </div>
            <label className="mt-5 block mono uppercase tracking-tight text-xs font-medium text-black">
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
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSponsorModalOpen(false)}
                className="rounded-full mono uppercase tracking-tighter border border-black/20 px-2 py-1 text-sm font-medium text-black transition hover:border-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSponsorCheckout()}
                disabled={startingCheckout}
                className="rounded-full mono uppercase tracking-tighter bg-black px-2 py-1 text-sm font-medium text-white transition hover:bg-[#1c40f2] disabled:cursor-not-allowed disabled:opacity-50"
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
            <p className=" text-xs font-semibold uppercase tracking-[0.1em] text-red-500">
              Delete account
            </p>
            <h2
              id="delete-account-title"
              className="mt-3 text-3xl font-bold tracking-tighter text-black"
            >
              Are you sure?
            </h2>
            <p className="mt-3 text-sm mono leading-tight text-[#666]">
              This permanently deletes your profile, uploaded media, links, and
              account. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-black transition hover:border-black"
              >
                Keep account
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="mt-4 w-fit cursor-pointer text-xs font-semibold uppercase tracking-tight text-[#1c40f2] transition hover:text-black"
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
