import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase account deletion is not configured." },
      { status: 503 },
    );
  }

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }

  const deletionScheduledAt = new Date();
  deletionScheduledAt.setDate(deletionScheduledAt.getDate() + 30);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: scheduleError } = await admin
    .from("profiles")
    .update({
      is_published: false,
      deletion_scheduled_at: deletionScheduledAt.toISOString(),
    })
    .eq("id", user.id);

  if (scheduleError) {
    console.error("Could not schedule account deletion", scheduleError);
    return NextResponse.json(
      { error: "Could not schedule account deletion." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    deletionScheduledAt: deletionScheduledAt.toISOString(),
  });
}
