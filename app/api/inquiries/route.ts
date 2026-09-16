import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const MAX_INQUIRIES_PER_HOUR = 5;

const getRedis = () => {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  return Redis.fromEnv();
};

const getClientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

const verifyTurnstile = async (token: string, request: Request) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  const formData = new URLSearchParams({
    secret,
    response: token,
    remoteip: getClientIp(request),
  });
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: formData },
  );
  const result = (await response.json()) as { success?: boolean };

  return response.ok && result.success === true;
};

const notifyProfileOwner = async ({
  profileId,
  senderName,
  senderEmail,
  senderPhone,
  project,
  budget,
  timeline,
}: {
  profileId: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  project: string;
  budget: string;
  timeline: string;
}) => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!serviceRoleKey || !resendApiKey || !fromEmail) return;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const {
    data: { user: profileOwner },
    error: ownerError,
  } = await admin.auth.admin.getUserById(profileId);

  if (ownerError || !profileOwner?.email) {
    console.error("Could not find profile owner for inquiry notification", ownerError);
    return;
  }

  const details = [
    `Name: ${senderName}`,
    `Email: ${senderEmail}`,
    senderPhone ? `Phone: ${senderPhone}` : "",
    budget ? `Budget: ${budget}` : "",
    timeline ? `Timeline: ${timeline}` : "",
    "",
    "Project details:",
    project,
  ]
    .filter(Boolean)
    .join("\n");

  const { error: sendError } = await new Resend(resendApiKey).emails.send({
    from: fromEmail,
    to: profileOwner.email,
    replyTo: senderEmail,
    subject: `New inquiry from ${senderName}`,
    text: `You received a new inquiry on WeEverything.\n\n${details}`,
  });

  if (sendError) {
    console.error("Could not send inquiry notification", sendError);
  }
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Inquiry submissions are not configured yet." },
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

  const body = (await request.json()) as {
    profileId?: unknown;
    senderName?: unknown;
    senderEmail?: unknown;
    senderCountry?: unknown;
    senderPhone?: unknown;
    captchaToken?: unknown;
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
  const captchaToken =
    typeof body.captchaToken === "string" ? body.captchaToken : "";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === profileId) {
    return NextResponse.json(
      { error: "You cannot send an inquiry to your own profile." },
      { status: 403 },
    );
  }

  const redis = getRedis();
  if (redis) {
    const rateLimitKey = `inquiries:rate:${getClientIp(request)}`;
    try {
      const requestCount = await redis.incr(rateLimitKey);
      if (requestCount === 1) await redis.expire(rateLimitKey, 60 * 60);
      if (requestCount > MAX_INQUIRIES_PER_HOUR) {
        return NextResponse.json(
          { error: "Too many inquiries. Please try again later." },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }
    } catch {
      // Keep inquiries available if the optional rate-limit service is down.
    }
  }

  if (!(await verifyTurnstile(captchaToken, request))) {
    return NextResponse.json(
      { error: "Please complete the CAPTCHA and try again." },
      { status: 400 },
    );
  }

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

  await notifyProfileOwner({
    profileId,
    senderName,
    senderEmail,
    senderPhone: normalizedPhone,
    project,
    budget,
    timeline,
  });

  return NextResponse.json({ success: true });
}
