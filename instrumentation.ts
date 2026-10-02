import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

const loggerProvider =
  projectToken && host
    ? new LoggerProvider({
        resource: resourceFromAttributes({ "service.name": "prof" }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${host.replace(/\/$/, "")}/i/v1/logs`,
              headers: {
                Authorization: `Bearer ${projectToken}`,
                "Content-Type": "application/json",
              },
            }),
          }),
        ],
      })
    : null;

const postHogLogger = loggerProvider?.getLogger("posthog-integration");

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!loggerProvider) {
    if (process.env.NODE_ENV === "development") {
      const missingVariable = !projectToken
        ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
        : "NEXT_PUBLIC_POSTHOG_HOST";

      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      );
    }

    return;
  }

  logs.setGlobalLoggerProvider(loggerProvider);
}

export function emitPostHogLog(
  body: string,
  attributes: Record<string, string | number | boolean>,
  severityNumber = SeverityNumber.INFO,
) {
  postHogLogger?.emit({ body, attributes, severityNumber });
}

export async function flushPostHogLogs() {
  await loggerProvider?.forceFlush();
}
