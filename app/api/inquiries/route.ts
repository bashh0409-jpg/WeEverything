import { createClient } from "@supabase/supabase-js";
import {
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { NextResponse } from "next/server";

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return url && key ? createClient(url, key) : null;
};

export async function POST(request: Request) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Inquiry submissions are not configured yet." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    profileId?: unknown;
    senderName?: unknown;
    senderEmail?: unknown;
    senderCountry?: unknown;
    senderPhone?: unknown;
    project?: unknown;
    budget?: unknown;
    timeline?: unknown;
  };

  const profileId = typeof body.profileId === "string" ? body.profileId : "";
  const senderName =
    typeof body.senderName === "string" ? body.senderName.trim() : "";
  const senderEmail =
    typeof body.senderEmail === "string" ? body.senderEmail.trim() : "";
  const senderCountry =
    typeof body.senderCountry === "string" ? body.senderCountry : "";
  const senderPhone =
    typeof body.senderPhone === "string" ? body.senderPhone.trim() : "";
  const parsedPhone = senderPhone
    ? parsePhoneNumberFromString(
        senderPhone,
        senderPhone.startsWith("+")
          ? undefined
          : isSupportedCountry(senderCountry)
            ? senderCountry
            : undefined,
      )
    : null;
  const normalizedPhone = parsedPhone?.number ?? "";
  const project = typeof body.project === "string" ? body.project.trim() : "";
  const budget = typeof body.budget === "string" ? body.budget.trim() : "";
  const timeline =
    typeof body.timeline === "string" ? body.timeline.trim() : "";

  if (!profileId || !senderName || !senderEmail || !project) {
    return NextResponse.json(
      { error: "Name, email, and project details are required." },
      { status: 400 },
    );
  }

  if (!/^\S+@\S+\.\S+$/.test(senderEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (senderPhone && (!parsedPhone || !parsedPhone.isValid())) {
    return NextResponse.json(
      { error: "Enter a valid phone number for the selected country." },
      { status: 400 },
    );
  }

  if (
    senderName.length > 120 ||
    senderEmail.length > 254 ||
    normalizedPhone.length > 40 ||
    project.length > 5000
  ) {
    return NextResponse.json(
      { error: "One or more fields are too long." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("profile_inquiries").insert({
    profile_id: profileId,
    sender_name: senderName,
    sender_email: senderEmail,
    sender_phone: normalizedPhone || null,
    project_brief: project,
    budget: budget || null,
    timeline: timeline || null,
  });

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "The inquiries table is not set up yet. Apply the Supabase migration.",
        },
        { status: 503 },
      );
    }

    if (error.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Supabase is blocking public inquiry submissions. Check the inquiry insert policy.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
