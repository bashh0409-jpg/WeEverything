"use client";

import { useEffect, useRef, useState } from "react";

const CACHE_NAME = "weeverything-profile-images-v1";
const MAX_CACHED_IMAGES = 100;
const IMAGE_PREFETCH_MARGIN = "400px";

type ResolvedImage = {
  source: string;
  url: string;
};

const isProfileStorageImage = (source: string) => {
  try {
    const url = new URL(source);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return false;

    return (
      url.origin === new URL(supabaseUrl).origin &&
      url.pathname.includes("/storage/v1/object/sign/profile-media/")
    );
  } catch {
    return false;
  }
};

const CachedImage = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) => {
  const shouldCache = isProfileStorageImage(src);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [visibleSource, setVisibleSource] = useState<string | null>(null);
  const [resolvedImage, setResolvedImage] = useState<ResolvedImage | null>(
    null,
  );

  useEffect(() => {
    if (!shouldCache || visibleSource === src) return;

    const container = imageContainerRef.current;
    if (!container) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        setVisibleSource(src);
        observer.disconnect();
      },
      { rootMargin: IMAGE_PREFETCH_MARGIN },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldCache, src, visibleSource]);

  useEffect(() => {
    if (
      !shouldCache ||
      (visibleSource !== src && "IntersectionObserver" in window)
    ) {
      return;
    }

    let isCancelled = false;
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        if (!("caches" in window)) throw new Error("Cache API unavailable");

        const sourceUrl = new URL(src);
        const cache = await window.caches.open(CACHE_NAME);
        const cacheKey = new Request(
          `${sourceUrl.origin}${sourceUrl.pathname}`,
        );
        let response = await cache.match(cacheKey);

        if (!response) {
          response = await fetch(src);
          if (
            !response.ok ||
            !response.headers.get("content-type")?.startsWith("image/")
          ) {
            throw new Error("Could not cache profile image");
          }

          await cache.put(cacheKey, response.clone());
          const cachedRequests = await cache.keys();
          const excessCount = cachedRequests.length - MAX_CACHED_IMAGES;
          if (excessCount > 0) {
            await Promise.all(
              cachedRequests
                .slice(0, excessCount)
                .map((request) => cache.delete(request)),
            );
          }
        }

        const imageBlob = await response.blob();
        if (!imageBlob.size) throw new Error("Cached profile image is empty");

        objectUrl = URL.createObjectURL(imageBlob);
        if (isCancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setResolvedImage({ source: src, url: objectUrl });
      } catch {
        if (!isCancelled) setResolvedImage({ source: src, url: src });
      }
    };

    void loadImage();

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shouldCache, src, visibleSource]);

  const imageUrl = shouldCache
    ? resolvedImage?.source === src
      ? resolvedImage.url
      : null
    : src;

  if (!imageUrl) {
    return (
      <div
        ref={imageContainerRef}
        className={className}
        aria-hidden="true"
      />
    );
  }

  return <img src={imageUrl} alt={alt} className={className} />;
};

export default CachedImage;
