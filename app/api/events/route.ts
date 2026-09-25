import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSafeExternalUrl } from "@/lib/safe-url";

const MAX_TITLE_LENGTH = 200;
const MAX_COMPANY_LENGTH = 200;
const MAX_CITY_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_PRICE_LENGTH = 80;
const MAX_URL_LENGTH = 2048;

type EventSuggestionBody = {
  title?: unknown;
  company?: unknown;
  date?: unknown;
  city?: unknown;
  price?: unknown;
  url?: unknown;
  description?: unknown;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Event submissions are not configured yet." },
      { status: 503 },
    );
  }

  let body: EventSuggestionBody;
  try {
    body = (await request.json()) as EventSuggestionBody;
  } catch {
    return NextResponse.json(
      { error: "Please send a valid event suggestion." },
      { status: 400 },
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const price = typeof body.price === "string" ? body.price.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!title || !company || !date) {
    return NextResponse.json(
      { error: "Title, organizer, and date are required." },
      { status: 400 },
    );
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { error: "Enter a valid event date." },
      { status: 400 },
    );
  }

  if (
    title.length > MAX_TITLE_LENGTH ||
    company.length > MAX_COMPANY_LENGTH ||
    city.length > MAX_CITY_LENGTH ||
    description.length > MAX_DESCRIPTION_LENGTH ||
    price.length > MAX_PRICE_LENGTH ||
    url.length > MAX_URL_LENGTH
  ) {
    return NextResponse.json(
      { error: "One or more fields are too long." },
      { status: 400 },
    );
  }

  if (url && !isSafeExternalUrl(url)) {
    return NextResponse.json(
      { error: "Enter a valid HTTPS event URL." },
      { status: 400 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.from("events").insert({
    title,
    company,
    city: city || null,
    description: description || null,
    date: parsedDate.toISOString(),
    price: price || "Free",
    url: url || null,
  });

  if (error) {
    console.error("Could not save suggested event", error);
    return NextResponse.json(
      { error: "Could not save your event suggestion. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Your event suggestion has been added.",
  });
}
