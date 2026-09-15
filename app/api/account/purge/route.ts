import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const purgeAccounts = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Account purge is not configured." },
      { status: 503 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .not("deletion_scheduled_at", "is", null)
    .lte("deletion_scheduled_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let deleted = 0;

  for (const profile of profiles ?? []) {
    const { data: media } = await admin
      .from("profile_media")
      .select("storage_path")
      .eq("profile_id", profile.id);

    if (media?.length) {
      await admin.storage
        .from("profile-media")
        .remove(media.map((item) => item.storage_path));
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(
      profile.id,
    );

    if (!deleteError) deleted += 1;
  }

  return NextResponse.json({ success: true, deleted });
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return purgeAccounts();
}
