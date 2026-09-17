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
            <div
              key={key}
              className="flex h-full aspect-[16/9] flex-col justify-between bg-[#999] p-2"
            >
              <div className="flex h-8 items-center">
                <div className="h-7 w-8 rounded-full p-1 bg-white flex items-center justify-center text-black uppercase geist font-medium text-sm tracking-tighter">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 133 134"
                  >
                    <path
                      fill="currentColor"
                      d="M133 67C96.282 67 66.5 36.994 66.5 0c0 36.994-29.782 67-66.5 67 36.718 0 66.5 30.006 66.5 67 0-36.994 29.782-67 66.5-67"
                    ></path>
                  </svg>
                </div>
                <div className="flex w-full justify-between">
                  <span className="ml-2 tracking-tight font-medium uppercase text-xs geist text-white">
                    {event?.company ?? ""}
                  </span>
                  
                  <span className="ml-2 tracking-tight font-medium uppercase text-xs geist text-white">
                    {event
                      ? new Date(event.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "O"}
                  </span>
                </div>
              </div>

              <div className="ml-9 flex flex-1 flex-col justify-between">
                <span className="tracking-tighter  line-clamp-4 font-medium text-x geist text-white">
                  {event?.description ?? ""}
                </span>

                <div className="mt-3 flex w-full items-end text-sm justify-between gap-2 uppercas">
                  <span className="tracking-tight font-medium uppercas text-x geist text-white">
                    {event?.city ?? "San Francisco, CA"}
                  </span>
                  <a
                    href={event?.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tracking-tight font-medium hover:underline  geist text-white"
                  >
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BottomStrip;
