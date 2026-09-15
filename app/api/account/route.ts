import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function DELETE() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase account deletion is not configured." },
      { status: 503 },
    );
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

  const { error: scheduleError } = await supabase
    .from("profiles")
    .update({
      is_published: false,
      deletion_scheduled_at: deletionScheduledAt.toISOString(),
    })
    .eq("id", user.id);

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deletionScheduledAt: deletionScheduledAt.toISOString(),
  });
}
