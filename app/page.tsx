"use client";

import { useState } from "react";
import Navbar from "./components/Navbar";
import PersonCard from "./components/PersonCard";
import BottomButton from "./components/BottomButton";

const roles = [
  "All",
  "Designers",
  "Developers",
  "Illustrators",
  "Photographers",
] as const;

type RoleFilter = (typeof roles)[number];

const projects = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: `Project ${index + 1}`,
}));

const useProfiles = [
  {
    id: 1,
    handle: "casacuruba.interiors",
    bio: "The founder of Daily Dialogue, a Munich-based creative consultancy working across design, development, and cultural production. Alongside his studio practice, he also co-founded the record label Squama.",
    image: "",
    role: "Designers",
  },
  {
    id: 2,
    handle: "mila.studio",
    bio: "Independent visual designer crafting brand systems, art direction, and tactile digital experiences for culture-led businesses.",
    image: "",
    role: "Designers",
  },
  {
    id: 3,
    handle: "orion.codes",
    bio: "Product developer focused on elegant interfaces, thoughtful systems, and high-performance front-end experiences for ambitious teams.",
    image: "",
    role: "Developers",
  },
  {
    id: 4,
    handle: "sol.illustrates",
    bio: "Illustrator and visual storyteller creating atmospheric compositions, editorial artwork, and character-led imagery for brands and publications.",
    image: "",
    role: "Illustrators",
  },
  {
    id: 5,
    handle: "luna.frames",
    bio: "Photographer documenting spaces, movement, and emotion with a cinematic eye for editorial and campaign work.",
    image: "",
    role: "Photographers",
  },
  {
    id: 6,
    handle: "niko.builds",
    bio: "Frontend engineer building sharp, scalable web products with a focus on clarity, speed, and polished interaction design.",
    image: "",
    role: "Developers",
  },
];

const Page = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");

  const filteredProfiles =
    roleFilter === "All"
      ? useProfiles
      : useProfiles.filter((profile) => profile.role === roleFilter);

  return (
    <div>
      <Navbar />
      <BottomButton />

      <button className="bg-black/30 fixed cursor-pointer bottom-4 right-4 h-15 w-15 flex items-center justify-center rounded-full duration-300 transition hover:bg-black">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="54px"
          viewBox="0 -960 960 960"
          width="54px"
          fill="#fff"
        >
          <path d="M160-300v-80h640v50H160Zm0-200v-80h640v50H160Z" />
        </svg>
      </button>

      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-2">
        <section className="mt-50 text-lg leading-tight flex max-w-xl flex-col items-center justify-center text-center uppercase">
          Find the best developers, photographers, illustrators, stylists and
          designers for your project.
        </section>

        <section className="w-full">
          <div className="mt-8 w-full max-w-lg">
            <button
              onClick={() => {
                setRoleFilter("All");
              }}
              className={
                roleFilter === "All"
                  ? "flex cursor-pointer geist items-center gap-1 text-2xl font-bold tracking-tighter text-black transition-colors duration-500"
                  : "flex cursor-pointer geist items-center gap-1 text-2xl font-bold tracking-tighter text-[#999] transition-colors duration-500 hover:text-black"
              }
            >
              <span aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="18px"
                  viewBox="0 -960 960 960"
                  width="18px"
                  fill="currentColor"
                >
                  <path d="m560-120-57-57 144-143H200v-480h80v400h367L503-544l56-57 241 241-240 240Z" />
                </svg>
              </span>
              All Profiles ({projects.length})
            </button>

            <div className="mt-8 flex flex-wrap  flex-col  justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs  font-semibold uppercase tracking-tighter text-[#999]">
                  View
                </span>
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => {
                    setViewMode("grid");
                  }}
                  className={`cursor-pointer rounded px-1 transition-all duration-400 ${viewMode === "grid" ? "text-black" : "text-[#999] hover:text-black"}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="14px"
                    viewBox="0 -960 960 960"
                    width="14px"
                    fill="currentColor"
                  >
                    <path d="M120-120v-720h720v720H120Zm640-80v-240H520v240h240Zm0-560H520v240h240v-240Zm-560 0v240h240v-240H200Zm0 560h240v-240H200v240Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  onClick={() => {
                    setViewMode("list");
                  }}
                  className={`cursor-pointer rounded px-1 transition-all duration-400 ${viewMode === "list" ? "text-black" : "text-[#999] hover:text-black"}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="14px"
                    viewBox="0 -960 960 960"
                    width="14px"
                    fill="currentColor"
                  >
                    <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-4 overflow-y-auto text-xs font-semibold uppercase tracking-tight text-[#999]">
                {roles.slice(1).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setRoleFilter(role);
                    }}
                    className={
                      roleFilter === role
                        ? "cursor-pointer text-black transition-all duration-500"
                        : "cursor-pointer transition-all duration-400 hover:text-black"
                    }
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>{" "}
        </section>

        <section className="mt-10 grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {filteredProfiles.map((profile) => (
            <PersonCard
              key={profile.id}
              handle={profile.handle}
              bio={profile.bio}
              image={profile.image}
              role={profile.role}
            />
          ))}
        </section>
      </main>
    </div>
  );
};

export default Page;
