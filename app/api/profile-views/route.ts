import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";

const VIEWER_COOKIE_NAME = "weeverything_viewer";
const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const PROFILE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIEWER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Profile views are not configured yet." },
      { status: 503 },
    );
  }

  const rateLimitResponse = await enforceRateLimit(
    request,
    "profile-views",
    120,
    60,
  );
  if (rateLimitResponse) return rateLimitResponse;

  let body: { profileId?: unknown };
  try {
    body = (await request.json()) as { profileId?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Please send a valid profile view request." },
      { status: 400 },
    );
  }

  const profileId = typeof body.profileId === "string" ? body.profileId : "";
  if (!PROFILE_ID_PATTERN.test(profileId)) {
    return NextResponse.json(
      { error: "Invalid profile target." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const storedViewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
  const viewerId =
    storedViewerId && VIEWER_ID_PATTERN.test(storedViewerId)
      ? storedViewerId
      : randomUUID();
  const shouldSetViewerCookie = viewerId !== storedViewerId;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("Could not read profile viewer session", sessionError);
  }

  let viewerUserId: string | null = null;
  if (session) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      console.error("Could not verify profile viewer identity", authError);
    } else {
      viewerUserId = user?.id ?? null;
    }
  }

  const makeResponse = (
    recorded: boolean,
    status = 200,
    error?: string,
  ) => {
    const result = NextResponse.json(
      error ? { error } : { recorded },
      {
        status,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );

    if (shouldSetViewerCookie) {
      result.cookies.set(VIEWER_COOKIE_NAME, viewerId, {
        httpOnly: true,
        maxAge: VIEWER_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return result;
  };

  if (viewerUserId === profileId) return makeResponse(false);

  const visitorHash = createHash("sha256")
    .update(`${serviceRoleKey}:${viewerId}`)
    .digest("hex");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: recorded, error } = await admin.rpc("record_profile_view", {
    target_profile_id: profileId,
    visitor_hash: visitorHash,
  });

  if (error) {
    console.error("Could not record profile view", error);
    return makeResponse(
      false,
      502,
      process.env.NODE_ENV === "production"
        ? "Could not record this profile view."
        : `Could not record this profile view: ${error.message} (${error.code ?? "unknown"})`,
    );
  }

  return makeResponse(recorded === true);
}
