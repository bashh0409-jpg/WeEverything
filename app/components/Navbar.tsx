"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { getActivePromotion } from "@/lib/sponsorship";
import SignInModal from "./SignInModal";


const links = [
  { href: "/", label: "Home," },
  { href: "/about", label: "About," },
  //{ href: "/events", label: "Events," },
  { href: "/legal", label: "Legal," },
];


let cachedNavbarUser: User | null = null;
let hasLoadedNavbarSession = false;

const Navbar = forwardRef<
  HTMLElement,
  {
    className?: string;
    currentTime?: string;
    onSearch?: (trigger: HTMLButtonElement) => void;
  }
>(({ className = "", currentTime, onSearch }, ref) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localTime, setLocalTime] = useState("");
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [user, setUser] = useState<User | null>(cachedNavbarUser);
  const [isAuthLoading, setIsAuthLoading] = useState(
    () => Boolean(supabase) && !hasLoadedNavbarSession,
  );
  const [isSponsored, setIsSponsored] = useState(false);

  const asideRef = useRef<HTMLDivElement>(null);
  const linksContainerRef = useRef<HTMLDivElement>(null);
  const desktopLinksRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const loadedSponsorshipUserId = useRef<string | null>(null);

  const closeSidebar = () => {
    const panel = asideRef.current;
    const items = linksContainerRef.current
      ? Array.from(linksContainerRef.current.querySelectorAll("a"))
      : [];

    if (!panel || !sidebarOpen) return;

    gsap
      .timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => setSidebarOpen(false),
      })
      .to(items, {
        y: 14,
        opacity: 0,
        filter: "blur(4px)",
        duration: 0.25,
        stagger: 0.03,
      })
      .to(
        panel,
        {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 0.65,
        },
        "-=0.08",
      );
  };

  useEffect(() => {
    const updateTime = () => {
      setLocalTime(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Africa/Johannesburg",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(new Date()),
      );
    };

    updateTime();

    const interval = window.setInterval(updateTime, 1_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      hasLoadedNavbarSession = true;
      setIsAuthLoading(false);
      setUser(null);
      return;
    }

    let isMounted = true;
    let receivedAuthEvent = false;

    const loadUser = async (currentUser: User | null) => {
      if (!currentUser) {
        cachedNavbarUser = null;
        hasLoadedNavbarSession = true;
        if (isMounted) {
          setUser(null);
          setIsAuthLoading(false);
          setIsSponsored(false);
          loadedSponsorshipUserId.current = null;
        }
        return;
      }

      cachedNavbarUser = currentUser;
      hasLoadedNavbarSession = true;

      if (isMounted) {
        setUser(currentUser);
        setIsAuthLoading(false);
      }

      if (loadedSponsorshipUserId.current === currentUser.id) return;

      loadedSponsorshipUserId.current = currentUser.id;

      const { data, error } = await client
        .from("sponsorship_payments")
        .select("status, paid_at, promotion_days")
        .eq("user_id", currentUser.id)
        .eq("status", "paid")
        .gte(
          "paid_at",
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (!isMounted) return;

      setIsSponsored(
        !error && getActivePromotion(data ?? []) !== null,
      );
    };

    void client.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("Could not load navbar auth session", error);
        }

        if (receivedAuthEvent) return;

        void loadUser(session?.user ?? null);
      })
      .catch((error: unknown) => {
        console.error("Could not load navbar auth session", error);
        hasLoadedNavbarSession = true;
        if (isMounted) {
          setIsAuthLoading(false);
        }
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      void loadUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = Boolean(user);
  const avatarUrl =
    typeof user?.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user?.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;
  const avatarInitial = user?.email?.trim().charAt(0).toUpperCase() || "U";

  const handleSignOut = async () => {
    if (!supabase || isLoggingOut) return;

    setLogoutError("");
    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setLogoutError(error.message);
        return;
      }

      cachedNavbarUser = null;
      hasLoadedNavbarSession = true;
      setUser(null);
      setIsAuthLoading(false);
      setIsSponsored(false);
      loadedSponsorshipUserId.current = null;
      setIsLogoutConfirmOpen(false);
      router.push("/");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Could not sign out.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  useLayoutEffect(() => {
    const panel = asideRef.current;

    if (!panel) return;

    if (isFirstRender.current) {
      gsap.set(panel, {
        clipPath: "inset(0% 0% 100% 0%)",
      });

      isFirstRender.current = false;
      return;
    }

    const items = linksContainerRef.current
      ? Array.from(linksContainerRef.current.querySelectorAll("a"))
      : [];
    const ctx = gsap.context(() => {
      if (sidebarOpen) {
        const tl = gsap.timeline({
          defaults: { ease: "power4.out" },
        });

        tl.to(panel, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.8,
        }).fromTo(
          items,
          {
            y: 20,
            opacity: 0,
            filter: "blur(6px)",
          },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.55,
            stagger: 0.06,
          },
          "-=0.4",
        );
      }
    });

    return () => ctx.revert();
  }, [sidebarOpen]);

  useLayoutEffect(() => {
    const container = desktopLinksRef.current;

    if (!container) return;

    const ctx = gsap.context(() => {
      const navLinks = Array.from(
        container.querySelectorAll<HTMLAnchorElement>("[data-nav-link]"),
      );

      navLinks.forEach((link) => {
        const underline = link.querySelector<HTMLSpanElement>(
          "[data-nav-underline]",
        );

        if (!underline) return;

        gsap.set(underline, {
          scaleX: 0,
          transformOrigin: "left center",
        });

        const handleMouseEnter = () => {
          gsap.killTweensOf(underline);

          gsap.to(underline, {
            scaleX: 1,
            transformOrigin: "left center",
            duration: 0.35,
            ease: "power3.out",
          });
        };

        const handleMouseLeave = () => {
          gsap.killTweensOf(underline);

          gsap.to(underline, {
            scaleX: 0,
            transformOrigin: "right center",
            duration: 0.3,
            ease: "power3.inOut",
          });
        };

        link.addEventListener("mouseenter", handleMouseEnter);
        link.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          link.removeEventListener("mouseenter", handleMouseEnter);
          link.removeEventListener("mouseleave", handleMouseLeave);
        };
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <nav
        ref={ref}
        className={`fixed left-0 top-0 z-20 flex w-full items-start justify-between gap-4 p-4 font-medium tracking-tight text-white mix-blend-difference bg-none b-[linear-gradient(to_bottom,_rgba(28,64,242,0.5)_0%,_rgba(28,64,242,0.4)_50%,_transparent_100%)] ${className}`}
      >
        <Link
          href="/"
          className="text-white lowercas geist font-medium tracking-tight"
        >
          <p className="geist uppercase leading-8 text-xl font-bold tracking-tighter capitalize flex max-w-xl flex-col items-center justify-center text-center uppercas ">
            weeverything
          </p>
        </Link>

        <div className="hidden flex-col gap-2  md:flex">
          <div className="flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-nav-link
                className="geist uppercase leading-8 text-xl font-bold tracking-tighter capitalize flex max-w-xl flex-col items-center justify-center text-center uppercas "
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden  shrink-0 items-start justify-end gap-4 text-white sm:flex">
          {onSearch ? (
            <button
              type="button"
              aria-label="Search profiles"
              title="Search profiles"
              onClick={(event) => onSearch(event.currentTarget)}
              className="geist uppercase leading-8 text-xl font-bold tracking-tighter capitalize flex max-w-xl flex-col items-center justify-center text-center uppercas "
            >
              Search
            </button>
          ) : null}
          <div className="flex w-full items-center justify-end text-sm font-semibold">
            {isAuthLoading ? null : !isAuthenticated ? (
              <Link
                href="/signin"
                className="geist uppercase leading-8 text-xl font-bold tracking-tighter capitalize flex max-w-xl flex-col items-center justify-center text-center uppercas "
              >
                sign in
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setLogoutError("");
                    setIsLogoutConfirmOpen(true);
                  }}
                  className="geist mr-12 uppercase leading-8 text-xl font-bold tracking-tighter capitalize flex max-w-xl flex-col items-center justify-center text-center uppercas "
                >
                  sign out
                </button>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
          onClick={() => (sidebarOpen ? closeSidebar() : setSidebarOpen(true))}
          className="flex h-9 w-9 items-center justify-center text-[#999] sm:hidden"
        >
          <span className="sr-only">
            {sidebarOpen ? "Close navigation" : "Open navigation"}
          </span>

          <span className="flex flex-col gap-1">
            <span className="h-px w-5 bg-current" />
            <span className="h-px w-5 bg-current" />
          </span>
        </button>
      </nav>

      {isAuthenticated ? (
        <Link
          href="/profile"
          aria-label={`View profile for ${user?.email ?? "your account"}`}
          title={user?.email ?? "Your profile"}
          className={`fixed right-4 top-4 z-20 hidden h-8 w-8 cursor-pointer rounded-full border-2 border-black/5 transition-colors duration-300 hover:bg-[#1c40f2] sm:block ${isSponsored ? "bg-[#1c40f2]" : ""}`}
        >
          <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white text-xs font-bold uppercase text-black">
            <span
              aria-hidden
              className="relative block h-4 w-4 animate-spin [animation-duration:10s]"
            >
              <div
                className="absolute h-1 w-1 shrink-0 rounded-full bg-black"
                style={{
                  top: "5%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute h-1 w-1 shrink-0 rounded-full bg-black"
                style={{
                  top: "18.2%",
                  left: "81.8%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute h-1 w-1 shrink-0 rounded-full bg-black"
                style={{
                  top: "50%",
                  left: "95%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute h-1 w-1 shrink-0 rounded-full bg-black"
                style={{
                  top: "81.8%",
                  left: "81.8%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute h-1 w-1 shrink-0 rounded-full bg-black"
                style={{
                  top: "95%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute h-1 w-1 shrink-0 rounded-full bg-black"
                style={{
                  top: "81.8%",
                  left: "18.2%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute h-1 w-1 shrink-0 rounded-full bg-black"
                style={{
                  top: "50%",
                  left: "5%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute h-1 w-1 shrink-0 rounded-full bg-black"
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
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </span>
        </Link>
      ) : null}

      <aside
        ref={asideRef}
        aria-hidden={!sidebarOpen}
        className={`fixed inset-0 z-100 flex h-dvh w-full flex-col gap-6 overflow-y-auto overscroll-contain bg-[#1c40f2] px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white sm:hidden ${
          sidebarOpen ? "" : "pointer-events-none"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="mix-blend-difference font-bold italic tracking-tighter">
                WeEverything
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeSidebar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full  transition-colors hover:bg-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="white"
            >
              <path d="M256-213.85 213.85-256l224-224-224-224L256-746.15l224 224 224-224L746.15-704l-224 224 224 224L704-213.85l-224-224-224 224Z" />
            </svg>
          </button>
        </div>

        <div ref={linksContainerRef} className="my-auto flex shrink-0 flex-col">
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeSidebar}
              className="group mix-blend-difference flex items-center gap-4 border-b border-white/20 py-4 first:border-t"
            >
              <span className="geist font-semibold w-6 text-xs text-white/55">
                0{index + 1}
              </span>
              <span className="flex-1 geist text-4xl font-semibold uppercase leading-none tracking-[-0.06em]">
                {link.label.replace(/,$/, "")}
              </span>
              <svg
                aria-hidden="true"
                className="h-6 w-6 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M4.5 12h14m-6-6 6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ))}
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-3 pt-4">
          <Link
            href="/profile"
            onClick={closeSidebar}
            className="mix-blend-difference flex min-h-11 items-center justify-center rounded-full border border-white/45 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Profile
          </Link>

          <button
            type="button"
            onClick={async () => {
              if (isAuthLoading) return;

              closeSidebar();

              if (isAuthenticated) {
                setIsLogoutConfirmOpen(true);
                return;
              }

              setIsSignInOpen(true);
            }}
            disabled={isAuthLoading}
            aria-hidden={isAuthLoading}
            tabIndex={isAuthLoading ? -1 : undefined}
            className={`mix-blend-difference flex min-h-10 items-center rounded-full bg-white px-5 text-center text-sm font-semibold text-[#1c40f2] transition-transform hover:scale-[1.01] active:scale-[0.99] ${
              isAuthLoading ? "invisible" : ""
            }`}
          >
            <span className=" text-center w-full geist tracking-tight text-sm">
              {isAuthenticated ? "Log out" : "Sign in"}
            </span>
          </button>
          <p className="mono text-center font-medium text-xs hidden uppercase tracking-[0.18em] text-white/55">
            Make something. Find your people.
          </p>
        </div>
      </aside>

      {isSignInOpen ? (
        <SignInModal onClose={() => setIsSignInOpen(false)} />
      ) : null}

      {isLogoutConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-2xl">
            <p className="text-xs font-medium uppercase tr mono text-[#999]">
              Confirm sign out
            </p>

            <h2 className="mt-3 geist text-3xl font-semibold tracking-tighter text-black">
              Sure you want to sign out?
            </h2>

            {logoutError ? (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {logoutError}
              </p>
            ) : null}

            <div className="mt-6 mono flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isLoggingOut}
                className="max-w-full capitalize geist max-h-7  rounded-3xl bg-black px-2 py-1 text-sm font-medium leading-4 tracking-tight text-white [overflow-wrap:anywhere]"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLogoutError("");
                  setIsLogoutConfirmOpen(false);
                }}
                className="max-w-full capitalize geist max-h-7  rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
