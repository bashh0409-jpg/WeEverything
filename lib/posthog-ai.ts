import { randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";

type AiGeneration = {
  distinctId?: string;
  input: unknown;
  latencyMs: number;
  model: string;
  output: string;
  traceId: string;
};

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const processSessionId = `ai-process-${process.pid}`;

const getPostHogClient = () => {
  if (!projectToken || !host) {
    if (process.env.NODE_ENV === "development") {
      const missingVariable = !projectToken
        ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
        : "NEXT_PUBLIC_POSTHOG_HOST";

      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      );
    }

    return null;
  }

  return new PostHog(projectToken, {
    host,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
    privacyMode: false,
  });
};

export const createAiTraceId = () => randomUUID();

export const captureAiGeneration = async ({
  distinctId,
  input,
  latencyMs,
  model,
  output,
  traceId,
}: AiGeneration) => {
  const posthog = getPostHogClient();
  if (!posthog) return;

  try {
    posthog.capture({
      distinctId: distinctId ?? processSessionId,
      event: "$ai_generation",
      properties: {
        $ai_input: input,
        $ai_latency: latencyMs / 1_000,
        $ai_model: model,
        $ai_output_choices: [{ role: "assistant", content: output }],
        $ai_provider: "openrouter",
        $ai_session_id: processSessionId,
        $ai_trace_id: traceId,
        ...(distinctId ? {} : { $process_person_profile: false }),
      },
    });
    await posthog.flush();
  } catch (error) {
    console.error("PostHog AI observability capture failed", error);
  } finally {
    try {
      await posthog.shutdown();
    } catch (error) {
      console.error("PostHog AI observability shutdown failed", error);
    }
  }
};
