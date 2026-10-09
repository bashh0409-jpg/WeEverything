import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Account restoration is not configured." },
      { status: 503 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("deletion_scheduled_at, deletion_previous_is_published")
    .eq("id", user.id)
    .maybeSingle();
  if (lookupError) {
    console.error("Could not check pending account restoration", lookupError);
    return NextResponse.json(
      { error: "Could not check account restoration." },
      { status: 500 },
    );
  }

  if (!profile?.deletion_scheduled_at) {
    return NextResponse.json({ restored: false });
  }
  if (!serviceRoleKey) {
    console.error(
      "Cannot restore scheduled account deletion without SUPABASE_SERVICE_ROLE_KEY",
    );
    return NextResponse.json(
      { error: "Account restoration is not configured." },
      { status: 503 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin
    .from("profiles")
    .update({
      deletion_scheduled_at: null,
      is_published: profile.deletion_previous_is_published ?? false,
      deletion_previous_is_published: null,
    })
    .eq("id", user.id)
    .eq("deletion_scheduled_at", profile.deletion_scheduled_at)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Could not restore scheduled account", error);
    return NextResponse.json(
      { error: "Could not restore your account." },
      { status: 500 },
    );
  }

  return NextResponse.json({ restored: true });
}
