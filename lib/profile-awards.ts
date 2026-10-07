export type ProfileAward = {
  name: string;
  date: string;
};

export const parseProfileAwards = (value: string | null | undefined) => {
  if (!value?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item): ProfileAward[] => {
        if (!item || typeof item !== "object") return [];
        const award = item as Record<string, unknown>;
        if (typeof award.name !== "string" || !award.name.trim()) return [];

        return [
          {
            name: award.name.trim(),
            date: typeof award.date === "string" ? award.date : "",
          },
        ];
      });
    }
  } catch {
    // Existing awards are stored as newline-separated plain text.
  }

  return value
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, date: "" }));
};

export const serializeProfileAwards = (awards: ProfileAward[]) =>
  JSON.stringify(
    awards
      .filter((award) => award.name.trim())
      .map((award) => ({
        name: award.name.trim(),
        date: award.date.trim(),
      })),
  );
