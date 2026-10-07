export type CustomProfileSection = {
  title: string;
  content: string;
  expiresOn: string | null;
};

export type CustomProfileSectionRow = {
  label: string | null;
  content: string;
};

export const MAX_CUSTOM_PROFILE_SECTIONS = 5;
export const MAX_CUSTOM_PROFILE_SECTION_TITLE_LENGTH = 40;
export const MAX_CUSTOM_PROFILE_SECTION_CONTENT_LENGTH = 600;

export const parseCustomProfileSectionRows = (
  content: string,
): CustomProfileSectionRow[] => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasLabeledRows = lines.some((line) => {
    const separator = line.indexOf(":");
    return separator > 0 && line.slice(separator + 1).trim().length > 0;
  });

  if (!hasLabeledRows) return [];

  return lines.map((line) => {
    const separator = line.indexOf(":");
    if (separator <= 0 || !line.slice(separator + 1).trim()) {
      return { label: null, content: line };
    }

    return {
      label: line.slice(0, separator).trim(),
      content: line.slice(separator + 1).trim(),
    };
  });
};

const isDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
};

export const parseCustomProfileSections = (
  value: unknown,
): CustomProfileSection[] => {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_CUSTOM_PROFILE_SECTIONS)
    .filter(
      (section): section is Record<string, unknown> =>
        !!section && typeof section === "object",
    )
    .map((section) => ({
      title:
        typeof section.title === "string"
          ? section.title.slice(0, MAX_CUSTOM_PROFILE_SECTION_TITLE_LENGTH)
          : "",
      content:
        typeof section.content === "string"
          ? section.content.slice(
              0,
              MAX_CUSTOM_PROFILE_SECTION_CONTENT_LENGTH,
            )
          : "",
      expiresOn:
        typeof section.expiresOn === "string" && isDateOnly(section.expiresOn)
          ? section.expiresOn
          : null,
    }));
};

export const isCustomProfileSectionExpired = (
  section: CustomProfileSection,
  now = new Date(),
) =>
  section.expiresOn !== null &&
  now.toISOString().slice(0, 10) > section.expiresOn;

export const getActiveCustomProfileSections = (
  value: unknown,
  now = new Date(),
) =>
  parseCustomProfileSections(value).filter(
    (section) => !isCustomProfileSectionExpired(section, now),
  );
