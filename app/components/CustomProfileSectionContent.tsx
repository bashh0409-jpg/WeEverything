import { parseCustomProfileSectionRows } from "@/lib/profile-sections";

const CustomProfileSectionContent = ({ content }: { content: string }) => {
  const rows = parseCustomProfileSectionRows(content);

  if (!rows.length) {
    return (
      <p className="whitespace-pre-line text-sm font-medium leading-4 tracking-tight text-[#444]">
        {content}
      </p>
    );
  }

  return (
    <dl className="min-w-0 space-y-3">
      {rows.map((row, index) =>
        row.label ? (
          <div
            key={`${row.label}-${index}`}
            className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)] sm:gap-3"
          >
            <dt className="text-sm  font-medium leading-4 tracking-tight text-[#777]">
              {row.label}
            </dt>
            <dd className="whitespace-pre-line text-left text-sm font-medium leading-4 tracking-tight text-[#000]">
              {row.content}
            </dd>
          </div>
        ) : (
          <div key={`text-${index}`}>
            <dd className="whitespace-pre-line text-sm font-medium leading-4 tracking-tight text-[#444]">
              {row.content}
            </dd>
          </div>
        ),
      )}
    </dl>
  );
};

export default CustomProfileSectionContent;
