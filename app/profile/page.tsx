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
import BottomButton from "../components/BottomButton";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase/client";

type ProfileRecord = {
  id: string;
  name: string | null;
  role: string | null;
  bio: string | null;
  location: string | null;
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
  | "discord"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "x"
  | "threads";

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

const socialOptions: { type: SocialType; label: string }[] = [
  { type: "portfolio", label: "Portfolio" },
  { type: "github", label: "GitHub" },
  { type: "linkedin", label: "LinkedIn" },
  { type: "instagram", label: "Instagram" },
  { type: "dribbble", label: "Dribbble" },
  { type: "behance", label: "Behance" },
  { type: "discord", label: "Discord" },
  { type: "facebook", label: "Facebook" },
  { type: "youtube", label: "YouTube" },
  { type: "tiktok", label: "TikTok" },
  { type: "x", label: "X" },
  { type: "threads", label: "Threads" },
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
      next[link.type] = link.url;
    }
  });

  return next;
};

const getMediaUrl = (storagePath: string) =>
  supabase?.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data
    .publicUrl ?? "";

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
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [inquiries, setInquiries] = useState<ProfileInquiry[]>([]);
  const [readInquiryIds, setReadInquiryIds] = useState<string[]>([]);
  const [deletingInquiryId, setDeletingInquiryId] = useState<string | null>(
    null,
  );
  const [inquiryPendingDeletion, setInquiryPendingDeletion] =
    useState<ProfileInquiry | null>(null);
  const [showArchivedInquiries, setShowArchivedInquiries] = useState(false);
  const [isInquiryDrawerOpen, setIsInquiryDrawerOpen] = useState(false);
  const [socials, setSocials] = useState<SocialForm>(emptySocials);
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
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [shareLabel, setShareLabel] = useState("Share profile");
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
          .select("id, name, role, bio, location, avatar_url, is_published")
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

      const loadedMedia = (mediaResult.data ?? []) as ProfileMedia[];
      const loadedLinks = (linksResult.data ?? []) as SocialLink[];

      setMedia(loadedMedia);
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

        return {
          ...current,
          role: hasOther
            ? formatRoles(
                selectedRoles.filter((selectedRole) =>
                  standardRoles.has(selectedRole),
                ),
              )
            : formatRoles([...selectedRoles, "Other"]),
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
    setForm((current) => {
      if (!current) return current;

      const standardSelections = parseRoles(current.role).filter((role) =>
        standardRoles.has(role),
      );

      return {
        ...current,
        role: formatRoles([...standardSelections, value]),
      };
    });
  };

  const handleSocialChange = (
    type: SocialType,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setSocials((current) => ({ ...current, [type]: event.target.value }));
  };

  const handleSponsorProfile = () => {
    setIsSponsorModalOpen(true);
    setSponsorshipIdempotencyKey(crypto.randomUUID());
    setMessage("");
  };

  const handleShareProfile = async () => {
    if (!user) return;

    const shareUrl = `${window.location.origin}/?profile=${encodeURIComponent(user.id)}`;
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

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          name: form.name.trim(),
          role: form.role,
          bio: form.bio.trim() || null,
          location: form.location.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          is_published: form.is_published,
        },
        { onConflict: "id" },
      )
      .select("id, name, role, bio, location, avatar_url, is_published")
      .single();

    if (error) {
      setSaving(false);
      setMessage(error.message);
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
      const url = socials[type].trim();
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
    setIsEditing(false);
    setMessage("Profile changes saved.");
  };

  const handleMediaUpload = async (
    position: number,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

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
    setUploadingSlot(null);
    setMessage("Media uploaded.");
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
  const visibleSocials = socialLinks.filter((link) => link.url);
  const mediaByPosition = new Map(media.map((item) => [item.position, item]));
  const unreadInquiryCount = inquiries.filter(
    (inquiry) => !inquiry.archived_at && !readInquiryIds.includes(inquiry.id),
  ).length;
  const visibleInquiries = inquiries.filter((inquiry) =>
    showArchivedInquiries ? true : !inquiry.archived_at,
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
                onClick={handleSponsorProfile}
                className="rounded-full  cursor-pointer bg-[#1c40f2] px-3 py-1 text-xs  font-semibold text-white transition hover:bg-black"
              >
                Promote
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setForm(toForm(user, profile));
                  setSocials(toSocialForm(socialLinks));
                  setIsEditing((current) => !current);
                }}
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
                  <p className="mono text-sm font-semibold tracking-tight text-[#1c40f2]">
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
                <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                  About me
                </p>

                <p className="mt-4 text-sm  leading-4 tracking-tighter text-[#444] sm:text-sm">
                  {profile?.bio ||
                    "Add a short introduction so the community knows what you make and how you work."}
                </p>
              </div>
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
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          title={option?.label ?? link.type}
                          aria-label={option?.label ?? link.type}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-black/1 bg-black/[0.03] text-black transition hover:border-black hover:bg-black hover:text-white"
                        >
                          {getSocialIcon(link.type)}
                        </a>
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
                      const mediaUrl = getMediaUrl(item.storage_path);

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
            <form
              onSubmit={handleSave}
              className="mt-16 border-t border-black pt-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                    Edit details
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tighter">
                    Make it yours.
                  </h2>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#1c40f2] px-3 py-1 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#9caeff]"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <label className="text-sm font-semibold">
                  Name
                  <input
                    required
                    name="name"
                    value={activeForm.name}
                    onChange={handleChange}
                    className="mt-2 w-full border-b border-black/20 bg-transparent px-0 py-3 outline-none transition focus:border-black"
                  />
                </label>
                <fieldset className="text-sm font-semibold">
                  <legend>Disciplines</legend>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {roles.map((role) => {
                      const selectedRoles = parseRoles(activeForm.role);
                      const checked =
                        role === "Other"
                          ? Boolean(getCustomRole(activeForm.role)) ||
                            selectedRoles.includes("Other")
                          : selectedRoles.includes(role);

                      return (
                        <label
                          key={role}
                          className="flex cursor-pointer items-center gap-2 font-normal "
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleRoleToggle(role)}
                            className="h-4 w-4 accent-[#1c40f2]"
                          />
                          {role}
                        </label>
                      );
                    })}
                  </div>
                  {Boolean(getCustomRole(activeForm.role)) ||
                  parseRoles(activeForm.role).includes("Other") ? (
                    <input
                      value={getCustomRole(activeForm.role)}
                      onChange={(event) =>
                        handleCustomRoleChange(event.target.value)
                      }
                      placeholder="Type your discipline"
                      className="mt-3 w-full border-b border-black/20 bg-transparent px-0 py-3 font-normal outline-none transition placeholder:text-[#aaa] focus:border-black"
                    />
                  ) : null}
                </fieldset>
                <label className="text-sm font-semibold">
                  Location
                  <input
                    name="location"
                    value={activeForm.location}
                    onChange={handleChange}
                    placeholder="City, country"
                    className="mt-2 w-full border-b border-black/20 bg-transparent px-0 py-3 outline-none transition placeholder:text-[#aaa] focus:border-black"
                  />
                </label>
              </div>

              <label className="mt-8 block text-sm font-semibold">
                Bio
                <textarea
                  required
                  name="bio"
                  value={activeForm.bio}
                  onChange={handleChange}
                  rows={4}
                  minLength={20}
                  placeholder="Tell people what you do in at least 20 words."
                  className="mt-2 w-full resize-y border border-black/15 bg-transparent p-3 outline-none transition placeholder:text-[#aaa] focus:border-black"
                />
                <p className="mt-2 text-xs font-medium text-[#999]">
                  {countWords(activeForm.bio)} / 20 words minimum
                </p>
              </label>

              <section className="mt-10 border-t border-black/10 pt-5">
                <p className="mono text-xs font-medium uppercase tracking-tight text-[#999]">
                  Work media
                </p>
                <p className="mt-2 max-w-2xl  text-sm leading-relaxed text-[#666]">
                  Container 1 must be an image. Container 2 can be either an
                  image or a short video. JPG, PNG, WebP, AVIF, MP4, and WebM
                  files up to 15 MB are accepted.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[0, 1].map((position) => {
                    const item = mediaByPosition.get(position);
                    const isUploading = uploadingSlot === position;
                    const mediaUrl = item ? getMediaUrl(item.storage_path) : "";

                    return (
                      <div key={position}>
                        <label className="group relative flex max-w-xs aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden border border-dashed border-black/20 bg-black/[0.03] transition hover:border-black">
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
                            <span className="mono px-4 text-center text-sm font-medium uppercase tracking-tight text-[#777]">
                              {isUploading
                                ? "Uploading..."
                                : `Add media ${position + 1}`}
                            </span>
                          )}
                          {item && !isUploading ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
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
                            className="mt-2 z-10 text-xs font-semibold text-[#666] underline underline-offset-4 transition hover:text-black disabled:cursor-not-allowed"
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
                <p className="mt-2 text-sm text-[#666]">
                  Add only the portfolio and accounts you want to show publicly.
                </p>
                <div className="mt-5 grid gap-x-6 gap-y-5 md:grid-cols-2">
                  {socialOptions.map(({ type, label }) => (
                    <label key={type} className="text-sm font-semibold">
                      {label}
                      <input
                        type="url"
                        value={socials[type]}
                        onChange={(event) => handleSocialChange(type, event)}
                        placeholder={
                          type === "portfolio"
                            ? "https://yourportfolio.com"
                            : `https://${type === "x" ? "x.com" : `${type}.com`}/`
                        }
                        className="mt-2 w-full border-b border-black/20 bg-transparent px-0 py-3 text-sm font-normal outline-none transition placeholder:text-[#aaa] focus:border-black"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <label className="mt-8 flex cursor-pointer items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={activeForm.is_published}
                  onChange={handleChange}
                  disabled={
                    !activeForm.is_published &&
                    !media.some(
                      (item) =>
                        item.position === 0 && item.media_type === "image",
                    )
                  }
                  className="h-4 w-4 accent-[#1c40f2]"
                />
                Make my profile visible in the directory
              </label>
            </form>
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
            <p className="mt-3 text-sm leading-relaxed text-[#666]">
              Choose a one-time sponsorship amount to support the directory.
              Payments are securely handled by Polar.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[500, 1500, 3000].map((amount) => (
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
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSponsorModalOpen(false)}
                className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-black transition hover:border-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSponsorCheckout()}
                disabled={startingCheckout}
                className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c40f2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {startingCheckout
                  ? "Opening checkout..."
                  : "Continue to payment"}
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

            <div className='flex w-full justify-between'>
              {unreadInquiryCount ? (
                <button
                  type="button"
                  onClick={markAllInquiriesAsRead}
                  className="mt-4 w-fit cursor-pointer text-xs font-semibold uppercase tracking-tight text-[#1c40f2] transition hover:text-black"
                >
                  Mark all as read
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setShowArchivedInquiries((current) => !current)}
                className="mt-4 w-fit cursor-pointer text-xs font-semibold uppercase tracking-tight text-[#1c40f2] transition hover:text-black"
              >
                {showArchivedInquiries ? "Hide archived" : "Show archived"}
              </button>
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
              <p className="mt-6 text-sm leading-relaxed text-[#666]">
                No project inquiries yet.
              </p>
            )}
          </aside>
        </>
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
