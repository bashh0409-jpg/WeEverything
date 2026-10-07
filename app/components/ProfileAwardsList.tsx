import { parseProfileAwards } from "@/lib/profile-awards";

const ProfileAwardsList = ({ value }: { value: string }) => {
  const awards = parseProfileAwards(value);

  return (
    <ul className="space-y-3">
      {awards.map((award, index) => (
        <li
          key={`${award.name}-${index}`}
          className="flex min-w-0 flex-col gap-"
        >
          <span className="text-sm capitalize font-medium leading-tight tracking-tight text-[#444]">
            {award.name}
          </span>
          {award.date ? (
            <span className="text-xs font-semibold uppercase tracking-tight text-[#999]">
              {award.date}
            </span>
          ) : null}
        </li>
      ))}

      
    </ul>
  );
};

export default ProfileAwardsList;
