import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EVENT_RETENTION_DAYS = 90;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !cronSecret ||
    request.headers.get("authorization") !== "Bearer " + cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Event expiry is not configured." },
      { status: 503 },
    );
  }

  const cutoff = new Date(
    Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.from("events").delete().lt("date", cutoff);

  if (error) {
    console.error("Could not expire old event suggestions", error);
    return NextResponse.json(
      { error: "Could not expire old event suggestions." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
