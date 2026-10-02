import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  captureAiGeneration,
  createAiTraceId,
} from "@/lib/posthog-ai";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_BIO_LENGTH = 2_000;
const MIN_BIO_WORDS = 20;
const AI_MODEL = process.env.AI_MODEL ?? "Qwen/Qwen3-8B";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const aiApiKey = process.env.AI_API_KEY;
  const aiBaseUrl = process.env.AI_BASE_URL;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Profile enhancement is not configured yet." },
      { status: 503 },
    );
  }

  if (!aiApiKey || !aiBaseUrl) {
    return NextResponse.json(
      { error: "Profile enhancement is not configured yet." },
      { status: 503 },
    );
  }

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }

  const rateLimitResponse = await enforceRateLimit(
    request,
    "bio-enhancement",
    10,
    60 * 60,
    user.id,
  );
  if (rateLimitResponse) return rateLimitResponse;

  let body: { bio?: unknown };
  try {
    body = (await request.json()) as { bio?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const wordCount = bio.split(/\s+/).filter(Boolean).length;

  if (wordCount < MIN_BIO_WORDS || bio.length > MAX_BIO_LENGTH) {
    return NextResponse.json(
      {
        error: `Enter a bio of at least ${MIN_BIO_WORDS} words and no more than ${MAX_BIO_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const messages = [
    {
      role: "system",
      content:
        "Rewrite professional profile bios. Preserve every factual claim and the person's voice. Never invent experience, clients, awards, skills, or credentials. Return only the improved bio, under 100 words, with no quotation marks or preamble.",
    },
    { role: "user", content: bio },
  ];
  const traceId = createAiTraceId();
  const aiRequestStartedAt = Date.now();

  let aiResponse: Response;
  try {
    aiResponse = await fetch(
      `${aiBaseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          temperature: 0.6,
          max_tokens: 180,
          messages,
        }),
      },
    );
  } catch (error) {
    console.error("Could not reach bio enhancement provider", error);
    return NextResponse.json(
      { error: "The bio enhancement service is unavailable." },
      { status: 502 },
    );
  }

  if (!aiResponse.ok) {
    console.error("Bio enhancement provider returned an error", {
      status: aiResponse.status,
    });
    return NextResponse.json(
      { error: "The bio enhancement service could not process this request." },
      { status: 502 },
    );
  }

  const result = (await aiResponse.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const enhancedBio = result.choices?.[0]?.message?.content;

  if (typeof enhancedBio !== "string" || !enhancedBio.trim()) {
    return NextResponse.json(
      { error: "The model did not return an enhanced bio." },
      { status: 502 },
    );
  }

  const enhancedBioContent = enhancedBio.trim();
  await captureAiGeneration({
    distinctId: user.id,
    input: messages,
    latencyMs: Date.now() - aiRequestStartedAt,
    model: AI_MODEL,
    output: enhancedBioContent,
    traceId,
  });

  return NextResponse.json({ bio: enhancedBioContent });
}
