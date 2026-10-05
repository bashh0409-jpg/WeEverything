export type CustomProfileSection = {
  title: string;
  content: string;
  expiresOn: string | null;
};

export const MAX_CUSTOM_PROFILE_SECTIONS = 5;
export const MAX_CUSTOM_PROFILE_SECTION_TITLE_LENGTH = 40;
export const MAX_CUSTOM_PROFILE_SECTION_CONTENT_LENGTH = 600;

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
