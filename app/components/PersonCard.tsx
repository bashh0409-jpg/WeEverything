"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";

type PersonCardProps = {
  name: string;
  bio: string;
  sponsored: boolean;
  image?: string;
  hoverMedia?: {
    type: "image" | "video";
    url: string;
  } | null;
  role: string;
  onOpen: () => void;
};

const PersonCard = ({
  name,
  bio,
  sponsored,
  image,
  hoverMedia,
  onOpen,
}: PersonCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    const video = videoRef.current;

    if (!video || hoverMedia?.type !== "video") return;

    if (isHovered) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [hoverMedia, isHovered]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="block cursor-pointer"
    >
      <div className="">
        <div
          className="relative flex aspect-[4/5] items-center justify-center bg-black/5"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="h-15 absolute  bottom-0 bg-[linear-gradient(to_top,_rgba(28,64,242,0.3)_0%,_rgba(28,64,242,0.15)_50%,_transparent_100%)] w-full "></div>
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full cursor-pointer object-cover"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#00000048"
              className="animate-spin"
            >
              <path d="M325-111.5q-73-31.5-127.5-86t-86-127.5Q80-398 80-480.5t31.5-155q31.5-72.5 86-127t127.5-86Q398-880 480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480.5-80Q398-80 325-111.5Z" />
            </svg>
          )}
          {hoverMedia &&
            isHovered &&
            (hoverMedia.type === "video" ? (
              <video
                ref={videoRef}
                src={hoverMedia.url}
                muted
                loop
                playsInline
                aria-label={`${name} preview`}
                className="absolute inset-0 cursor-pointer h-full w-full object-cover"
              />
            ) : (
              <img
                src={hoverMedia.url}
                alt={`${name} second view`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ))}

          {sponsored ? (
            <div className="absolute left-2 top-2 text-[10px] font-bold uppercase tracking-tight text-white mix-blend-difference mono">
              Sponsored
            </div>
          ) : null}
        </div>
        <div>
          <h1 className="cursor-pointer text-sm font-semibold capitalize tracking-tight hover:text-[#1c40f2] hover:underline">
            {name}
          </h1>
          <p className="mono line-clamp-3 mt-1 overflow-hidden text-[11px] font-medium uppercase leading-3 tracking-tight text-[#999]">
            {bio}
          </p>
          <button
            type="button"
            className=" text-[10px] hidden cursor-pointer geist font-semibold uppercase tracking-tight text-[#1c40f2] hover:underline"
          >
            See more
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonCard;
