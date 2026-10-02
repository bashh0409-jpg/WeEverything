"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import type { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase/client";

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      syncTouch: false,
    });

    let rafId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client) return;

    let identifiedUserId: string | null = null;

    const identifyUser = (user: User) => {
      if (identifiedUserId === user.id) return;

      if (identifiedUserId) {
        posthog.reset();
      }

      posthog.identify(user.id, {
        email: user.email,
      });
      identifiedUserId = user.id;
    };

    void client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        identifyUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        identifyUser(session.user);
      } else if (event === "SIGNED_OUT" && identifiedUserId) {
        posthog.reset();
        identifiedUserId = null;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
