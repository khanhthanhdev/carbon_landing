"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface Member {
  credentials: string;
  image?: string;
  institute?: string;
  link?: string;
  name: string;
}

interface MemberCarouselProps {
  autoPlayInterval?: number;
  members: Member[];
  slidesToShow?: number;
}

export function MemberCarousel({
  members,
  slidesToShow = 4,
  autoPlayInterval = 3000,
}: MemberCarouselProps) {
  const slidesCount = members.length;
  const canLoop = slidesCount > slidesToShow;

  const baseMembers = members.map((member) => ({
    key: `member-${member.name}-${member.link ?? member.credentials}`,
    member,
  }));
  const startClones = canLoop
    ? members.slice(-slidesToShow).map((member) => ({
        key: `clone-start-${member.name}-${member.link ?? member.credentials}`,
        member,
      }))
    : [];
  const endClones = canLoop
    ? members.slice(0, slidesToShow).map((member) => ({
        key: `clone-end-${member.name}-${member.link ?? member.credentials}`,
        member,
      }))
    : [];
  const extendedMembers = canLoop
    ? [...startClones, ...baseMembers, ...endClones]
    : baseMembers;

  const [currentSlide, setCurrentSlide] = useState(() =>
    canLoop ? slidesToShow : 0
  );
  const [isAnimating, setIsAnimating] = useState(true);
  const [paused, setPaused] = useState(false);

  const goNext = useCallback(() => {
    setIsAnimating(true);
    if (!canLoop) {
      setCurrentSlide((prev) =>
        Math.min(prev + 1, Math.max(0, slidesCount - slidesToShow))
      );
      return;
    }
    setCurrentSlide((prev) => prev + 1);
  }, [canLoop, slidesCount, slidesToShow]);

  const goPrev = useCallback(() => {
    setIsAnimating(true);
    if (!canLoop) {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
      return;
    }
    setCurrentSlide((prev) => prev - 1);
  }, [canLoop]);

  useEffect(() => {
    if (paused) {
      return;
    }
    const id = setInterval(goNext, autoPlayInterval);
    return () => clearInterval(id);
  }, [paused, goNext, autoPlayInterval]);

  const handleTransitionEnd = useCallback(() => {
    if (!canLoop) {
      return;
    }
    if (currentSlide >= slidesCount + slidesToShow) {
      setIsAnimating(false);
      setTimeout(() => setCurrentSlide(slidesToShow), 20);
    } else if (currentSlide < 0) {
      setIsAnimating(false);
      setTimeout(() => setCurrentSlide(slidesCount + slidesToShow - 1), 20);
    }
  }, [canLoop, currentSlide, slidesCount, slidesToShow]);

  useEffect(() => {
    if (!isAnimating) {
      const t = setTimeout(() => setIsAnimating(true), 50);
      return () => clearTimeout(t);
    }
  }, [isAnimating]);

  const activeIndex = canLoop
    ? (currentSlide - slidesToShow + slidesCount) % slidesCount
    : currentSlide;

  return (
    <div aria-label="Team members carousel" className="relative" role="region">
      <div
        className="overflow-hidden px-12"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className={`flex gap-4 md:gap-8 ${isAnimating ? "transition-transform duration-500 ease-out" : ""}`}
          onTransitionEnd={handleTransitionEnd}
          style={{
            transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)`,
          }}
        >
          {extendedMembers.map(({ member, key }) => (
            <article className="w-1/2 flex-shrink-0 md:w-1/4" key={key}>
              <a
                className="group flex h-full flex-col items-center"
                href={member.link}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="relative mb-4 h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl md:h-24 md:w-24 lg:h-28 lg:w-28">
                  {member.image ? (
                    <Image
                      alt={member.name}
                      className="object-cover"
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 80px, (max-width: 1024px) 96px, 112px"
                      src={member.image}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
                  )}
                </div>
                <h4 className="line-clamp-2 text-center font-semibold text-gray-900 text-sm transition-colors duration-300 group-hover:text-emerald-600 lg:text-base">
                  {member.name}
                </h4>
                {member.credentials && (
                  <p className="mt-1 line-clamp-2 text-center text-gray-600 text-xs lg:text-sm">
                    {member.credentials}
                  </p>
                )}
              </a>
            </article>
          ))}
        </div>
      </div>

      <button
        aria-label="Previous members"
        className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full bg-emerald-600 p-2 text-white transition-colors duration-300 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
        disabled={!canLoop && currentSlide === 0}
        onClick={goPrev}
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
      </button>
      <button
        aria-label="Next members"
        className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full bg-emerald-600 p-2 text-white transition-colors duration-300 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-gray-300"
        disabled={!canLoop && currentSlide >= slidesCount - slidesToShow}
        onClick={goNext}
      >
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      <div
        aria-label="Carousel navigation"
        className="mt-8 flex justify-center gap-2"
        role="tablist"
      >
        {Array.from(
          { length: slidesCount },
          (_, slideNumber) => slideNumber
        ).map((slideNumber) => (
          <button
            aria-label={`Go to slide ${slideNumber + 1}`}
            aria-selected={slideNumber === activeIndex}
            className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              slideNumber === activeIndex
                ? "w-8 bg-emerald-600"
                : "w-2 bg-gray-300 hover:bg-gray-400"
            }`}
            key={`slide-dot-${slideNumber + 1}`}
            onClick={() => {
              setIsAnimating(true);
              setCurrentSlide(
                canLoop ? slideNumber + slidesToShow : slideNumber
              );
            }}
            role="tab"
          />
        ))}
      </div>
    </div>
  );
}
