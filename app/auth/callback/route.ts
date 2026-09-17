import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/profile";

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
        const { data: existingProfile, error: profileLookupError } =
          await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

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

        if (!profileLookupError && !existingProfile && next === "/profile") {
          response.headers.set(
            "Location",
            new URL("/profile?welcome=1", request.url).toString(),
          );
        }

        return response;
      }
    }
  }

  return NextResponse.redirect(
    new URL("/signin?error=invalid_code", request.url),
  );
}
