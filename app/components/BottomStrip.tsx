"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import BottomButton from "./BottomButton";
import { supabase } from "@/lib/supabase/client";

type EventItem = {
  id: string;
  title: string;
  company: string;
  description: string | null;
  city: string | null;
  date: string;
  price: string | null;
  url: string | null;
  image_url: string | null;
};

const BottomStrip = () => {
  const [isOpen, setIsOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const placeholders = Array.from({ length: 10 }, (_, index) => index);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!supabase) return;

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("date", nowIso)
        .order("date", { ascending: true })
        .limit(10);

      if (!error) {
        const upcoming = (data ?? []).filter(
          (event) => new Date(event.date).getTime() >= Date.now(),
        );
        setEvents(upcoming);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    if (!stripRef.current) return;

    gsap.to(stripRef.current, {
      y: isOpen ? 0 : "100%",
      duration: 0.6,
      ease: "power3.inOut",
    });
  }, [isOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleStripScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const horizontalScrollAmount = event.deltaY || event.deltaX;

    if (Math.abs(horizontalScrollAmount) > 0) {
      event.preventDefault();
      event.stopPropagation();
      container.scrollLeft += horizontalScrollAmount;
    }
  };

  return (
    <div
      ref={stripRef}
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-2"
      style={{ transform: "translateY(100%)" }}
    >
      <span className="absolute right-4 -top-14">
        <BottomButton
          isOpen={isOpen}
          onToggle={() => setIsOpen((previous) => !previous)}
        />
      </span>

      <div
        className="h-45 w-full overflow-x-auto overflow-y-hidden scrollbar-hide gap-px flex bg-white"
        style={{ overscrollBehavior: "contain" }}
        onWheel={handleStripScroll}
        onTouchMove={(event) => event.preventDefault()}
      >
        {(events.length > 0 ? events : placeholders).map((item, index) => {
          const event = typeof item === "number" ? null : item;
          const key = event ? event.id : `placeholder-${index}`;

          return (
            <a
              key={key}
              href={event?.url ?? undefined}
              target={event?.url ? "_blank" : undefined}
              rel={event?.url ? "noopener noreferrer" : undefined}
              onClick={(eventObject) => {
                if (!event?.url) {
                  eventObject.preventDefault();
                }
              }}
              className="group relative flex h-full aspect-[16/9] cursor-pointer flex-col justify-between overflow-hidden p-2"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_top,_rgba(28,64,242,0.5)_40%,_transparent_100%)] opacity-100 transition-opacity duration-500 group-hover:opacity-0" />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,_rgba(28,64,242,0.5)_20%,_transparent_100%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative z-10 flex h-8 items-center">
                <div className="h-7 aspect-square rounded-full p-1.5 bg-white flex items-center justify-center text-black uppercase geist font-medium text-sm tracking-tighter">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="#999"
                    viewBox="0 0 133 134"
                  >
                    <path
                      fill="currentColor"
                      d="M133 67C96.282 67 66.5 36.994 66.5 0c0 36.994-29.782 67-66.5 67 36.718 0 66.5 30.006 66.5 67 0-36.994 29.782-67 66.5-67"
                    ></path>
                  </svg>
                </div>
                <div className="w-full flex flex-col">
                  <div className="flex w-full text-[#999] justify-between">
                    <span className="ml-2 tracking-tight font-medium uppercase text-xs geist ">
                      {event?.company ?? "WeEverything"}
                    </span>

                    <span className="ml-2 tracking-tight font-medium uppercase text-xs geist ">
                      {event
                        ? new Date(event.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "SEP 01, 2026"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 ml-9 flex flex-1 flex-col justify-between">
                <span className="tracking-tighter leading-tight line-clamp-5 font-medium text-sm geist text-white">
                  {event?.description ?? ""}
                </span>

                <div className="mt-3 mix-blend-difference flex w-full mono uppercase tracking-tighter text-xs items-end text-sm justify-between gap-2 uppercas">
                  <span className=" font-medium uppercase mono text-xs geist text-white">
                    {event?.city ?? "San Francisco, CA"}
                  </span>
                  <span className=" font-medium uppercase mono text-xs geist text-white">
                    {event?.price && event.price !== "Free"
                      ? `$${event.price}`
                      : "Free"}
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default BottomStrip;
