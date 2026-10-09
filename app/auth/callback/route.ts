import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const requestUrl = new URL(request.url);
  const next = (() => {
    if (
      !requestedNext?.startsWith("/") ||
      requestedNext.startsWith("//") ||
      /[\\\r\n]/.test(requestedNext)
    ) {
      return "/profile";
    }

    try {
      const parsed = new URL(requestedNext, requestUrl.origin);
      return parsed.origin === requestUrl.origin
        ? `${parsed.pathname}${parsed.search}${parsed.hash}`
        : "/profile";
    } catch {
      return "/profile";
    }
  })();

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const cookieStore = await cookies();
      const response = NextResponse.redirect(new URL(next, request.url));

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      });

      const {
        data: { user },
        error,
      } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && user) {
        let accountRestored = false;
        let accountRestoreError = false;
        const { data: existingProfile, error: profileLookupError } =
          await supabase
            .from("profiles")
            .select("id, deletion_scheduled_at, deletion_previous_is_published")
            .eq("id", user.id)
            .maybeSingle();

        if (profileLookupError) {
          console.error(
            "Could not check scheduled account deletion after sign-in",
            profileLookupError,
          );
          accountRestoreError = true;
        } else if (existingProfile?.deletion_scheduled_at) {
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (!serviceRoleKey) {
            console.error(
              "Cannot restore scheduled account deletion without SUPABASE_SERVICE_ROLE_KEY",
            );
            accountRestoreError = true;
          } else {
            const admin = createClient(supabaseUrl, serviceRoleKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            });
            const { data: restoredProfile, error: restoreError } = await admin
              .from("profiles")
              .update({
                deletion_scheduled_at: null,
                is_published:
                  existingProfile.deletion_previous_is_published ?? false,
                deletion_previous_is_published: null,
              })
              .eq("id", user.id)
              .eq("deletion_scheduled_at", existingProfile.deletion_scheduled_at)
              .select("id")
              .maybeSingle();

            if (restoreError || !restoredProfile) {
              console.error("Could not restore scheduled account", restoreError);
              accountRestoreError = true;
            } else {
              accountRestored = true;
            }
          }
        }

        const fullName =
          user.user_metadata.full_name ?? user.user_metadata.name;
        const name =
          typeof fullName === "string" && fullName.trim()
            ? fullName.trim()
            : (user.email?.split("@")[0] ?? "New member");
        const handle = (user.email?.split("@")[0] ?? "member")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const avatarUrl = user.user_metadata.avatar_url;

        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            handle,
            name,
            role: "Designer",
            ...(typeof avatarUrl === "string" ? { avatar_url: avatarUrl } : {}),
          },
          {
            onConflict: "id",
            ignoreDuplicates: true,
          },
        );

        if (profileError) {
          console.error(
            "Could not create profile for authenticated user",
            profileError,
          );
        }

        if (
          !profileLookupError &&
          !existingProfile &&
          !profileError &&
          user.email &&
          process.env.RESEND_API_KEY &&
          process.env.RESEND_FROM_EMAIL
        ) {
          try {
            const { error: emailError } = await new Resend(
              process.env.RESEND_API_KEY,
            ).emails.send({
              from: process.env.RESEND_FROM_EMAIL,
              to: user.email,
              subject: "Welcome to WeEverything",
              text: `Hi ${name},\n\nWelcome to WeEverything! Your account is ready. Complete your profile and share your work with the community.\n\nVisit ${new URL("/profile", process.env.NEXT_PUBLIC_SITE_URL ?? "https://weeverything.xyz").toString()} to get started.\n\nThe WeEverything team`,
            });

            if (emailError) {
              console.error("Could not send welcome email", emailError);
            }
          } catch (emailError) {
            console.error("Could not send welcome email", emailError);
          }
        }

        const destination = new URL(next, request.url);
        if (
          !profileLookupError &&
          !existingProfile &&
          destination.pathname === "/profile"
        ) {
          destination.searchParams.set("welcome", "1");
        }

        if (accountRestored || accountRestoreError) {
          destination.searchParams.set(
            accountRestored ? "restored" : "restore_error",
            "1",
          );
        }

        if (destination.pathname === "/profile") {
          const passkeyGate = new URL("/auth/passkey", request.url);
          passkeyGate.searchParams.set(
            "next",
            `${destination.pathname}${destination.search}${destination.hash}`,
          );
          response.headers.set("Location", passkeyGate.toString());
        } else {
          response.headers.set("Location", destination.toString());
        }

        return response;
      }
    }
  }

  return NextResponse.redirect(
    new URL("/signin?error=invalid_code", request.url),
  );
}
