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
import SignInModal from "./SignInModal";

const links = [
  { href: "/", label: "Home," },
  { href: "/about", label: "About," },
  //{ href: "/events", label: "Events," },
  { href: "/legal", label: "Legal," },
];

const mostAwardedProfiles = [
  { name: "Locomotive", href: "https://www.awwwards.com/locomotive/" },
  {
    name: "Immersive Garden",
    href: "https://www.awwwards.com/immersivegarden/",
  },
  { name: "Resn", href: "https://www.awwwards.com/resn/" },
  { name: "Monks", href: "https://www.awwwards.com/madebymonks/" },
  { name: "Active Theory", href: "https://www.awwwards.com/active_theory/" },
  { name: "Hello Monday", href: "https://www.awwwards.com/hellomonday/" },
  { name: "AQuest", href: "https://www.awwwards.com/aquest/" },
  { name: "Merci Michel", href: "https://www.awwwards.com/Merci-Michel/" },
  { name: "makemepulse", href: "https://www.awwwards.com/makemepulse/" },
  { name: "dogstudio", href: "https://www.awwwards.com/dogstudio/" },
];

const SPONSORSHIP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const Navbar = forwardRef<
  HTMLElement,
  { className?: string; currentTime?: string }
>(({ className = "", currentTime }, ref) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localTime, setLocalTime] = useState("");
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
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
      setUser(null);
      return;
    }

    let isMounted = true;

    const loadUser = async (currentUser: User | null) => {
      if (!currentUser) {
        if (isMounted) {
          setUser(null);
          setIsSponsored(false);
          loadedSponsorshipUserId.current = null;
        }
        return;
      }

      setUser(currentUser);

      if (loadedSponsorshipUserId.current === currentUser.id) return;

      loadedSponsorshipUserId.current = currentUser.id;

      const { data, error } = await client
        .from("sponsorship_payments")
        .select("paid_at")
        .eq("user_id", currentUser.id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      const paidAt = data?.paid_at ? Date.parse(data.paid_at) : NaN;
      setIsSponsored(
        !error &&
          Number.isFinite(paidAt) &&
          Date.now() - paidAt <= SPONSORSHIP_TTL_MS,
      );
    };

    void client.auth.getSession().then(({ data: { session } }) => {
      void loadUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
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
        className={`fixed  left-0 top-0 z-20 flex w-full items-start justify-between gap-4 p-4 font-medium tracking-tight bg-[linear-gradient(to_bottom,_rgba(28,64,242,0.5)_0%,_transparent_100%)] ${className}`}
      >
        <Link
          href="/"
          className="shrink-0 font-bold  mt-1 blue italic tracking-tighter text-white"
        >
          WeEverything
        </Link>

        <div
          ref={desktopLinksRef}
          className="hidden  items-start mt-1 justify-center gap-2 text-white sm:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-nav-link
              className="relative inline-block font-semibold blue tracking-tighter"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden flex-col gap-2 text-[#1c40f2] md:flex">
          <a
            href="https://www.awwwards.com/winner-list/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit hidden text-sm font-semibold hover:underline"
          >
            10 Most Awarded Profiles
          </a>
          <div className="grid grid-cols-2 mt-2 gap-x-5 leading-none">
            {[
              mostAwardedProfiles.slice(0, 5),
              mostAwardedProfiles.slice(5),
            ].map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-col items-start">
                {column.map((profile) => (
                  <a
                    key={profile.name}
                    href={profile.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold tracking-tighter hover:underline"
                  >
                    {profile.name}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden items-start gap-4 text-white sm:flex">
          <div className="flex items-center text-sm font-semibold">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsSignInOpen(true)}
                className="bg-black ml-1 hover:bg-black/50 mono tracking-tighter transition-colors duration-300 cursor-pointer rounded-full px-3 py-1"
              >
                Sign in
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(true)}
                  className="bg-black mr-1 mono tracking-tighter hover:bg-black/50 transition-colors duration-300 cursor-pointer rounded-full px-3 py-1"
                >
                  Log out
                </button>

                <Link
                  href="/profile"
                  aria-label={`View profile for ${user?.email ?? "your account"}`}
                  title={user?.email ?? "Your profile"}
                  className={`hover:bg-[#1c40f2] max-w-8 transition-colors duration-300 cursor-pointer rounded-full p-0.5 ${isSponsored ? "bg-[#1c40f2]" : ""}`}
                >
                  <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-bold uppercase text-black">
                    <span
                      aria-hidden
                      className="relative animate-spin [animation-duration:10s] block w-4 h-4"
                    >
                      <div
                        className="absolute w-1  h-1  rounded-full bg-black shrink-0"
                        style={{
                          top: "5%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div
                        className="absolute w-1  h-1  rounded-full bg-black shrink-0"
                        style={{
                          top: "18.2%",
                          left: "81.8%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div
                        className="absolute w-1  h-1  rounded-full bg-black shrink-0"
                        style={{
                          top: "50%",
                          left: "95%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div
                        className="absolute w-1  h-1  rounded-full bg-black shrink-0"
                        style={{
                          top: "81.8%",
                          left: "81.8%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div
                        className="absolute w-1  h-1  rounded-full bg-black shrink-0"
                        style={{
                          top: "95%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div
                        className="absolute w-1  h-1  rounded-full bg-black shrink-0"
                        style={{
                          top: "81.8%",
                          left: "18.2%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div
                        className="absolute w-1  h-1  rounded-full bg-black shrink-0"
                        style={{
                          top: "50%",
                          left: "5%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      <div
                        className="absolute w-1  h-1  rounded-full bg-black shrink-0"
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
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
          onClick={() => (sidebarOpen ? closeSidebar() : setSidebarOpen(true))}
          className="flex h-9 w-9 items-center justify-center text-white sm:hidden"
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
              <p className="font-bold italic tracking-tighter">WeEverything</p>
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
              className="group flex items-center gap-4 border-b border-white/20 py-4 first:border-t"
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
            className="flex min-h-11 items-center justify-center rounded-full border border-white/45 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Profile
          </Link>

          <button
            type="button"
            onClick={async () => {
              closeSidebar();

              if (isAuthenticated) {
                setIsLogoutConfirmOpen(true);
                return;
              }

              setIsSignInOpen(true);
            }}
            className="flex min-h-10  items-center rounded-full bg-white px-5 text-center text-sm font-semibold text-[#1c40f2] transition-transform hover:scale-[1.01] active:scale-[0.99]"
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
              Confirm logout
            </p>

            <h2 className="mt-3 geist text-3xl font-semibold tracking-tighter text-black">
              Sure you want to log out?
            </h2>

            <div className="mt-6 mono flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  const client = supabase;

                  if (!client) {
                    setIsLogoutConfirmOpen(false);
                    return;
                  }

                  await client.auth.signOut();
                  setUser(null);
                  setIsLogoutConfirmOpen(false);
                  router.push("/");
                }}
                className="cursor-pointer rounded-full bg-black px-3 py-1 text-sm font-semibold tracking-tight text-white transition hover:bg-black/60"
              >
                Yes, log out
              </button>

              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="cursor-pointer rounded-full border border-black/20 px-3 py-1 text-sm font-semibold tracking-tight text-black transition hover:border-black"
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
