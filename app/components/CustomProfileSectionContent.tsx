import { parseCustomProfileSectionRows } from "@/lib/profile-sections";

const getListItems = (value: string): string[] | null => {
  const hasCommas = value.includes(",");
  const items = hasCommas
    ? value
        .split(",")
        .map((item) => item.trim().replace(/^(?:and|or)\s+/i, ""))
        .filter(Boolean)
    : value
        .split(/\s+(?:and|or)\s+/i)
        .map((item) => item.trim())
        .filter(Boolean);

  if (
    items.length < 2 ||
    items.some(
      (item) =>
        item.split(/\s+/).length > (hasCommas ? 4 : 3) || /[!?;]/.test(item),
    )
  ) {
    return null;
  }

  return items;
};

const CustomProfileSectionContent = ({ content }: { content: string }) => {
  const rows = parseCustomProfileSectionRows(content);

  if (!rows.length) {
    return (
      <p className="whitespace-pre-line text-justify text-sm font-medium leading-4 tracking-tight text-[#000]">
        {content}
      </p>
    );
  }

  return (
    <dl className="min-w-0 space-y-3">
      {rows.map((row, index) => {
        if (!row.label) {
          return (
            <div key={`text-${index}`}>
              <dd className="whitespace-pre-line text-justify text-sm font-medium leading-4 tracking-tight text-[#444]">
                {row.content}
              </dd>
            </div>
          );
        }

        const items = getListItems(row.content);

        return (
          <div
            key={`${row.label}-${index}`}
            className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(120px,0.4fr)_minmax(0,1fr)] sm:gap-3"
          >
            <dt className="text-sm font-medium leading-4 tracking-tight text-[#777]">
              {row.label}
            </dt>
            <dd
              className={
                items
                  ? "flex min-w-0  flex-wrap gap-1.5"
                  : "min-w-0  whitespace-pre-line text-left text-sm font-medium leading-4 tracking-tight text-[#000]"
              }
            >
              {items
                ? items.map((item, itemIndex) => (
                    <span
                      key={`${item}-${itemIndex}`}
                      className="max-w-full max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
                    >
                      {item}
                    </span>
                  ))
                : row.content}
            </dd>
          </div>
        );
      })}
    </dl>
  );
};

export default CustomProfileSectionContent;
