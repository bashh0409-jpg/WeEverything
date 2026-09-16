"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import MuxVideo from "@mux/mux-video-react";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getProjectById, projects } from "@/lib/projects";

const Page = () => {
  const params = useParams<{ id: string }>();
  const project = getProjectById(params?.id);

  const [showButton, setShowButton] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const firstRectRef = useRef<HTMLDivElement>(null);
  const endMarkerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const start = firstRectRef.current;
      const end = endMarkerRef.current;
      if (!start || !end) return;

      const centerY = window.innerHeight / 2;
      const startPastCenter = start.getBoundingClientRect().top <= centerY;
      const endPastCenter = end.getBoundingClientRect().top <= centerY;

      setShowButton(startPastCenter && !endPastCenter);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, project?.video]);

  if (!project) {
    return null;
  }

  const currentIndex = projects.findIndex(
    (item) => item.id.toLowerCase() === project.id.toLowerCase(),
  );
  const previousProject =
    projects[(currentIndex - 1 + projects.length) % projects.length];
  const nextProject = projects[(currentIndex + 1) % projects.length];

  const firstMedia = project.video ? (
    <div className="h-full w-full object-cover">
      {isMuted ? (
        <button
          type="button"
          aria-label={isMuted ? "Unmute sound" : "Mute sound"}
          onClick={() => setIsMuted((current) => !current)}
          className="absolute  right-4 top-4  cursor-pointer rounded-full bg-white p-1 transition-all duration-500"
        >
          {isMuted ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="18px"
              viewBox="0 -960 960 960"
              width="18px"
              fill="currentColor"
              className="text-[#999]"
            >
              <path d="M552-152v-75q86-23 139-93.26 53-70.25 53-159.5 0-89.24-53.5-158.74Q637-708 552-734v-75q116 25 190 117t74 211q0 119-73.5 211.5T552-152ZM144-385v-192h144l192-192v576L288-385H144Zm408 55v-302q45.12 20.4 70.56 61.2Q648-530 648-480.52q0 48.52-25.44 89.23Q597.12-350.59 552-330ZM408-595l-90 90H216v48h102l90 90v-228Zm-91 113Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="18px"
              viewBox="0 -960 960 960"
              width="18px"
              fill="currentColor"
              className=""
            >
              <path d="M552-152v-75q86-23 139-93.26 53-70.25 53-159.5 0-89.24-53.5-158.74Q637-708 552-734v-75q116 25 190 117t74 211q0 119-73.5 211.5T552-152ZM144-385v-192h144l192-192v576L288-385H144Zm408 55v-302q45.12 20.4 70.56 61.2Q648-530 648-480.52q0 48.52-25.44 89.23Q597.12-350.59 552-330ZM408-595l-90 90H216v48h102l90 90v-228Zm-91 113Z" />
            </svg>
          )}
        </button>
      ) : (
        <button
          type="button"
          aria-label={isMuted ? "Unmute sound" : "Mute sound"}
          onClick={() => setIsMuted((current) => !current)}
          className="absolute right-4 top-4  cursor-pointer rounded-full bg-white p-1 transition-all duration-500"
        >
          {isMuted ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="18px"
              viewBox="0 -960 960 960"
              width="18px"
              fill="currentColor"
              className="text-[#999]"
            >
              <path d="M552-152v-75q86-23 139-93.26 53-70.25 53-159.5 0-89.24-53.5-158.74Q637-708 552-734v-75q116 25 190 117t74 211q0 119-73.5 211.5T552-152ZM144-385v-192h144l192-192v576L288-385H144Zm408 55v-302q45.12 20.4 70.56 61.2Q648-530 648-480.52q0 48.52-25.44 89.23Q597.12-350.59 552-330ZM408-595l-90 90H216v48h102l90 90v-228Zm-91 113Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="18px"
              viewBox="0 -960 960 960"
              width="18px"
              fill="currentColor"
              className=""
            >
              <path d="M552-152v-75q86-23 139-93.26 53-70.25 53-159.5 0-89.24-53.5-158.74Q637-708 552-734v-75q116 25 190 117t74 211q0 119-73.5 211.5T552-152ZM144-385v-192h144l192-192v576L288-385H144Zm408 55v-302q45.12 20.4 70.56 61.2Q648-530 648-480.52q0 48.52-25.44 89.23Q597.12-350.59 552-330ZM408-595l-90 90H216v48h102l90 90v-228Zm-91 113Z" />
            </svg>
          )}
        </button>
      )}
      <MuxVideo
        ref={videoRef}
        playbackId={project.video}
        poster={project.image}
        autoPlay
        loop
        playsInline
        muted={isMuted}
        aria-label={project.alt}
        metadata={{ video_id: project.id, video_title: project.title }}
        preload="auto"
        streamType="on-demand"
        capRenditionToPlayerSize
        className="h-full w-full object-cover"
      />
    </div>
  ) : project.image ? (
    <Image
      src={project.image}
      alt={project.alt}
      fill
      sizes="(min-width: 768px) 75vw, 100vw"
      className="object-cover"
    />
  ) : (
    <div className="h-full w-full backdrop-blur-md bg-black/50" />
  );

  return (
    <div>
      <Navbar />

      <main className="mt-24 md:mt-40 flex flex-col p-4 md:p-4">
        <span
          onClick={() => setOverlayOpen(true)}
          className={`fixed left-1/2 cursor-pointer z-1 -translate-x-1/2 bottom-4 flex transition-all duration-500 hover:bg-black/40 backdrop-blur-md justify-center bg-black/30 rounded-full p-1.5 px-2 text-white tracking-tighter uppercase font-mono items-center font-medium text-xs -z-1 gap-1 ${
            showButton
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          Read story
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="18px"
            viewBox="0 -960 960 960"
            width="18px"
            fill="#fff"
            className="hidden"
          >
            <path d="M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z" />
          </svg>
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-6xl tracking-tighter font-semibold max-w-full md:max-w-[60%] leading-tight md:leading-12 mb-4 md:mb-6">
          {project.title}
        </h1>
        <h2 className="text-3xl sm:text-4xl md:text-6xl tracking-tighter font-semibold max-w-full md:max-w-[60%] leading-6 md:leading-11 text-[#999]">
          {project.description}
        </h2>

        <div className="w-full mt-10 md:mt-20 flex flex-col">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-4 justify-between w-full tracking-tight">
            <div className="flex gap-6 mb-6 sm:gap-0">
              <div className="flex min-w-0 sm:min-w-50 flex-col">
                <span className="text-[#999] text-sm font-semibold tracking-tight">
                  Client
                </span>
                <span className="text-sm -mt-1 font-semibold tracking-tight">
                  {project.client}.
                </span>
              </div>
              <div className="flex min-w-0 sm:min-w-50 flex-col">
                <span className="text-[#999] text-sm font-semibold tracking-tight">
                  Deliverables
                </span>
                <span className="text-sm -mt-1 font-semibold tracking-tight">
                  {project.deliverables}
                </span>
              </div>
            </div>
            <div className="flex gap-6 sm:gap-0">
              <div className="flex min-w-0 sm:min-w-50 flex-col">
                <span className="text-[#999] text-sm font-semibold tracking-tight">
                  Year
                </span>
                <span className="text-sm -mt-1 font-semibold tracking-tight">
                  {project.year}
                </span>
              </div>
              <div className="flex min-w-0 sm:min-w-50 flex-col">
                <span className="text-[#999] text-sm font-semibold tracking-tight">
                  Visit
                </span>

                <a
                  href={project.visit}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm -mt-1 hover:text-[#999] transition-colors duration-400 font-semibold tracking-tight"
                >
                  {project.visit.replace(/^(https?:\/\/)?(www\.)?/, "www.")}
                </a>
              </div>
            </div>
          </div>

          {(() => {
            const renderMedia = (item: ProjectMedia, sizes: string) => {
              if (item.type === "video") {
                // Assumes @mux/mux-player-react is already used for firstMedia/hero video —
                // swap this for whatever player component your project actually uses.
                return (
                  <MuxVideo
                    streamType="on-demand"
                    playbackId={item.src}
                    className="h-full w-full object-cover"
                    autoPlay="muted"
                    loop
                    muted
                  />
                );
              }
              return (
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes={sizes}
                  className="object-cover"
                />
              );
            };

            const sizes = "(min-width: 640px) 33vw, 100vw";
            const [, m1, m2, m3, m4, m5] = project.media; // index 0 is the hero, rendered as firstMedia

            return (
              <div className="mt-10 grid h-screen grid-cols-1 grid-rows-none gap-2 sm:mt-20 sm:grid-cols-6 sm:grid-rows-8">
                <div className="relative w-full overflow-hidden bg-black/6 sm:col-span-2 sm:row-span-4">
                  {firstMedia}
                </div>

                <div className="relative w-full overflow-hidden bg-black/6 sm:col-span-2 sm:col-start-3 sm:row-span-3">
                  {m1 ? (
                    renderMedia(m1, sizes)
                  ) : (
                    <div className="h-full w-full bg-black/6" />
                  )}
                </div>

                <div className="relative w-full overflow-hidden bg-black/6 sm:col-span-2 sm:col-start-3 sm:row-span-5 sm:row-start-4">
                  {m2 ? (
                    renderMedia(m2, sizes)
                  ) : (
                    <div className="h-full w-full bg-black/10" />
                  )}
                </div>

                <div className="relative w-full overflow-hidden bg-black/6 sm:col-span-2 sm:col-start-1 sm:row-span-4 sm:row-start-5">
                  {m3 ? (
                    renderMedia(m3, sizes)
                  ) : (
                    <div className="h-full w-full bg-black/6" />
                  )}
                </div>

                <div className="relative w-full overflow-hidden bg-black/6 sm:col-span-2 sm:col-start-5 sm:row-span-5 sm:row-start-1">
                  {m4 ? (
                    renderMedia(m4, sizes)
                  ) : (
                    <div className="h-full w-full bg-black/10" />
                  )}
                </div>

                <div className="relative w-full overflow-hidden bg-black/6 sm:col-span-2 sm:col-start-5 sm:row-span-3 sm:row-start-6">
                  {m5 ? (
                    renderMedia(m5, sizes)
                  ) : (
                    <div className="h-full w-full bg-black/6" />
                  )}
                </div>
              </div>
            );
          })()}

          <div ref={endMarkerRef} className="h-px w-full" />

          <div className="mt-30 flex w-full justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl text-[#999] tracking-tighter font-semibold max-w-full md:max-w-[60%] leading-1 md:leading-1 md:mb-6">
                Previous
              </h1>
              <Link
                className="w-fit flex no-wrap"
                href={`/work/project/${previousProject.id}`}
              >
                <h2 className="text-3xl w-fit no-wrap flex cursor-pointer hover:text-[#999] transition-colors duration-400 sm:text-4xl md:text-6xl tracking-tighter font-semibold leading-tight md:leading-12">
                  {previousProject.title}
                </h2>
              </Link>
            </div>
            <div className="w-fit">
              <h1 className="text-3xl w-full flex justify-end sm:text-4xl md:text-6xl text-[#999] tracking-tighter font-semibold leading-1 md:leading-1 md:mb-6">
                Next
              </h1>
              <Link
                className="w-fit flex no-wrap"
                href={`/work/project/${nextProject.id}`}
              >
                <h2 className="text-3xl w-fit no-wrap flex cursor-pointer hover:text-[#999] transition-colors duration-400 sm:text-4xl md:text-6xl tracking-tighter font-semibold leading-tight md:leading-12">
                  {nextProject.title}
                </h2>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <div
        onClick={() => setOverlayOpen(false)}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-500 ${
          overlayOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      <button
        onClick={() => setOverlayOpen(false)}
        aria-label="Close story"
        className={`fixed right-1/2 cursor-pointer z-50 rounded-full p-1 bg-white transition-all duration-500 ${
          overlayOpen
            ? "opacity-100 pointer-events-auto bottom-[calc(90vh+10px)]"
            : "opacity-0 pointer-events-none bottom-[calc(90vh+10px)]"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="18px"
          viewBox="0 -960 960 960"
          width="18px"
          fill="#000"
        >
          <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
        </svg>
      </button>

      <div
        className={`fixed bottom-0 left-0 right-0 h-[90vh] scrollbar-hide bg-white z-50 rounded-t shadow-2xl transition-transform duration-500 ease-in-out overflow-y-auto ${
          overlayOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="min-h-full flex items-center justify-center px-4 md:px-10 py-10 pb-20">
          <div className="max-w-xl mt-10 gap-4 flex flex-col ">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl tracking-tighter font-semibold max-w-full md:max-w-[60%] leading-tight md:leading-12 mb-2">
                {project.title}
              </h1>

              <span className=" flex flex-col  text-sm mb-4 font-medium tracking-tight ">
                {project.category}
              </span>
              <span className="text-[#999] flex flex-col  text-sm mb-2 font-medium tracking-tight ">
                The Challenge
              </span>
              <div className="flex flex-col">
                <span className="font-medium text-sm leading-4 mb-1 tracking-tight ">
                  {project.description}
                </span>
                <span className="font-medium text-sm leading-4 mb-2 tracking-tight ">
                  This project was built for {project.client} across{" "}
                  {project.category.toLowerCase()} with a focus on{" "}
                  {project.deliverables.toLowerCase()}.
                </span>
                <span className="font-medium text-sm leading-4 mb-1 tracking-tight ">
                  {project.challenge}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[#999] flex flex-col text-sm mb-2 font-medium tracking-tight ">
                Brand System
              </span>
              <div className="flex flex-col">
                <span className="font-medium text-sm leading-4 mb-1 tracking-tight ">
                  {project.identity}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[#999] flex flex-col text-sm mb-2 font-medium tracking-tight ">
                Typography
              </span>
              <div className="flex flex-col">
                <span className="font-medium text-sm leading-4 mb-1 tracking-tight ">
                  {project.typography}
                </span>
              </div>
            </div>
            <div className="flex min-w-0 mt-10 sm:min-w-50 flex-col">
              <span className="text-[#999] text-sm font-medium tracking-tight">
                Deliverables
              </span>
              <span className="text-sm -mt-1 font-medium  tracking-tight">
                {project.deliverables}
              </span>
            </div>{" "}
            <div className="flex min-w-0  sm:min-w-50 flex-col">
              <span className="text-[#999] text-sm font-medium tracking-tight">
                Client
              </span>
              <span className="text-sm -mt-1 font-medium tracking-tight">
                {project.client}
              </span>
            </div>{" "}
            <div className="flex min-w-0  sm:min-w-50 flex-col">
              <span className="text-[#999] text-sm font-medium tracking-tight">
                Year
              </span>
              <span className="text-sm -mt-1 font-medium tracking-tight">
                {project.year}
              </span>
            </div>{" "}
            <div className="flex min-w-0  sm:min-w-50 flex-col">
              <span className="text-[#999] text-sm font-medium tracking-tight">
                Visit
              </span>
              <a
                href={project.visit}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm -mt-1 font-semibold tracking-tight"
              >
                {project.visit.replace(/^(https?:\/\/)?(www\.)?/, "www.")}
              </a>
            </div>{" "}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
