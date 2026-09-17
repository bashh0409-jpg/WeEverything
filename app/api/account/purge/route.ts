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
  let failed = 0;

  for (const profile of profiles ?? []) {
    const { data: media, error: mediaError } = await admin
      .from("profile_media")
      .select("storage_path")
      .eq("profile_id", profile.id);

    if (mediaError) {
      console.error("Could not load account media for purge", mediaError);
      failed += 1;
      continue;
    }

    if (media?.length) {
      const { error: storageError } = await admin.storage
        .from("profile-media")
        .remove(media.map((item) => item.storage_path));

      if (storageError) {
        console.error("Could not delete account media during purge", storageError);
        failed += 1;
        continue;
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(
      profile.id,
    );

    if (deleteError) {
      console.error("Could not delete scheduled account", deleteError);
      failed += 1;
      continue;
    }

    deleted += 1;
  }

  return NextResponse.json(
    { success: failed === 0, deleted, failed },
    { status: failed === 0 ? 200 : 500 },
  );
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
