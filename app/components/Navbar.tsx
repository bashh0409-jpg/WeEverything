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
  { href: "/legal", label: "Legal," },
];

const topDevs = [
  { id: 1, name: "alex.dev", href: "https://alex.dev" },
  { id: 2, name: "mika.codes", href: "https://mika.codes" },
  { id: 3, name: "jordan.builds", href: "https://jordan.builds" },
  { id: 4, name: "noahstack", href: "https://noahstack.dev" },
  { id: 5, name: "lena.dev", href: "https://lena.dev" },
];

const topDesigners = [
  { id: 1, name: "maya.design", href: "https://maya.design" },
  { id: 2, name: "leo.studio", href: "https://leo.studio" },
  { id: 3, name: "sophia.design", href: "https://sophia.design" },
  { id: 4, name: "kai.studio", href: "https://kai.studio" },
  { id: 5, name: "nina.works", href: "https://nina.works" },
];

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

  const asideRef = useRef<HTMLDivElement>(null);
  const linksContainerRef = useRef<HTMLDivElement>(null);
  const desktopLinksRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

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

    const loadSession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (isMounted) {
        setUser(session?.user ?? null);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
      }
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
        className={`fixed left-0 top-0 z-20 flex w-full items-start justify-between gap-4 p-4 font-medium tracking-tight bg-[linear-gradient(to_bottom,_rgba(28,64,242,0.5)_0%,_transparent_100%)] ${className}`}
      >
        <Link
          href="/"
          className="shrink-0 font-bold  mt-1 blue italic tracking-tighter text-white"
        >
          WeEverything.xyz
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

        <div className="gap-4 hidden md:flex items-start leading-none">
          <div className="flex flex-col mr-4  items-star leading-none">
            <span className=" mb-4 text-sm  font-semibold mt-1 opacity-100">
              Top Developers
            </span>
            {topDevs.map((designer) => (
              <a
                key={designer.id}
                href={designer.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold blue tracking-tighter hover:underline"
              >
                {designer.name}
              </a>
            ))}
          </div>
          <div className="flex flex-col items-star leading-none">
            <span className=" mb-4 text- text-sm mr-4 font-semibold mt-1 opacity-100">
              Top Designers
            </span>
            {topDesigners.map((designer) => (
              <a
                key={designer.id}
                href={designer.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold blue tracking-tighter hover:underline"
              >
                {designer.name}
              </a>
            ))}
          </div>
        </div>

        <div className="hidden items-start gap-4 text-white sm:flex">
          <div className="flex items-center text-sm font-semibold">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsSignInOpen(true)}
                className="bg-black ml-1 hover:text-[#1c40f2] transition-colors duration-300 cursor-pointer rounded-full px-3 py-1"
              >
                Sign in
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(true)}
                  className="bg-black mr-1 hover:text-[#1c40f2] transition-colors duration-300 cursor-pointer rounded-full px-3 py-1"
                >
                  Log out
                </button>

                <Link
                  href="/profile"
                  aria-label={`View profile for ${user?.email ?? "your account"}`}
                  title={user?.email ?? "Your profile"}
                  className="hover:bg-[#1c40f2] transition-colors duration-300 cursor-pointer rounded-full p-0.5 "
                >
                  <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#dfbf00] text-xs font-bold uppercase text-black">
                    <span aria-hidden>{avatarInitial}</span>
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
        className={`fixed inset-x-0 top-0 z-100 flex h-full w-full flex-col bg-white p-6 text-black sm:hidden ${
          sidebarOpen ? "" : "pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold italic tracking-tighter">
            WeEverything.xyz
          </span>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeSidebar}
            className="text-2xl leading-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="currentColor"
            >
              <path d="M256-213.85 213.85-256l224-224-224-224L256-746.15l224 224 224-224L746.15-704l-224 224 224 224L704-213.85l-224-224-224 224Z" />
            </svg>
          </button>
        </div>

        <div
          ref={linksContainerRef}
          className="my-auto flex flex-col text-2xl font-medium uppercase tracking-tighter"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeSidebar}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/submit"
            onClick={closeSidebar}
            className="rounded-full border border-black/20 px-4 py-2 text-center text-sm font-semibold text-black"
          >
            Submit
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
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            {isAuthenticated ? "Log out" : "Sign in"}
          </button>
        </div>
      </aside>

      {isSignInOpen ? (
        <SignInModal onClose={() => setIsSignInOpen(false)} />
      ) : null}

      {isLogoutConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#999]">
              Confirm logout
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tighter text-black">
              Are you sure you want to log out?
            </h2>

            <div className="mt-6 flex flex-wrap gap-3">
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
                className="cursor-pointer rounded-full bg-black px-3 py-1 text-sm font-semibold text-white transition hover:bg-[#1c40f2]"
              >
                Yes, log out
              </button>

              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="cursor-pointer rounded-full border border-black/20 px-3 py-1 text-sm font-semibold text-black transition hover:border-black"
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
