"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Member {
  name: string;
  credentials: string;
  institute?: string;
  image?: string;
  link?: string;
}

interface MemberCarouselProps {
  members: Member[];
  slidesToShow?: number;
  autoPlayInterval?: number;
}

export function MemberCarousel({ 
  members, 
  slidesToShow = 4, 
  autoPlayInterval = 3000 
}: MemberCarouselProps) {
  const slidesCount = members.length;
  const canLoop = slidesCount > slidesToShow;
  
  const startClones = canLoop ? members.slice(-slidesToShow) : [];
  const endClones = canLoop ? members.slice(0, slidesToShow) : [];
  const extendedMembers = canLoop ? [...startClones, ...members, ...endClones] : members;

  const [currentSlide, setCurrentSlide] = useState(() => (canLoop ? slidesToShow : 0));
  const [isAnimating, setIsAnimating] = useState(true);
  const [paused, setPaused] = useState(false);

  const goNext = useCallback(() => {
    setIsAnimating(true);
    if (!canLoop) {
      setCurrentSlide((prev) => Math.min(prev + 1, Math.max(0, slidesCount - slidesToShow)));
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
    if (paused) return;
    const id = setInterval(goNext, autoPlayInterval);
    return () => clearInterval(id);
  }, [paused, goNext, autoPlayInterval]);

  const handleTransitionEnd = useCallback(() => {
    if (!canLoop) return;
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
    ? ((currentSlide - slidesToShow + slidesCount) % slidesCount) 
    : currentSlide;

  return (
    <div className="relative" role="region" aria-label="Team members carousel">
      <div 
        className="overflow-hidden px-12" 
        onMouseEnter={() => setPaused(true)} 
        onMouseLeave={() => setPaused(false)}
      >
        <div 
          className={`flex gap-4 md:gap-8 ${isAnimating ? "transition-transform duration-500 ease-out" : ""}`}
          style={{ transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedMembers.map((member, index) => (
            <article 
              key={`${index}-${member.name}`} 
              className="flex-shrink-0 w-1/2 md:w-1/4"
            >
              <a
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center group h-full"
              >
                <div className="relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 bg-gradient-to-br from-emerald-300 to-emerald-500 mb-4 flex-shrink-0">
                  {member.image ? (
                    <Image
                      fill
                      src={member.image}
                      alt={member.name}
                      className="object-cover"
                      sizes="(max-width: 768px) 80px, (max-width: 1024px) 96px, 112px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
                  )}
                </div>
                <h4 className="text-center text-sm lg:text-base font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-300 line-clamp-2">
                  {member.name}
                </h4>
                {member.credentials && (
                  <p className="text-center text-xs lg:text-sm text-gray-600 mt-1 line-clamp-2">
                    {member.credentials}
                  </p>
                )}
              </a>
            </article>
          ))}
        </div>
      </div>

      <button
        onClick={goPrev}
        disabled={!canLoop && currentSlide === 0}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-label="Previous members"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      <button
        onClick={goNext}
        disabled={!canLoop && currentSlide >= slidesCount - slidesToShow}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-label="Next members"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Carousel navigation">
        {Array.from({ length: slidesCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => { setIsAnimating(true); setCurrentSlide(canLoop ? index + slidesToShow : index); }}
            className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              index === activeIndex ? "bg-emerald-600 w-8" : "bg-gray-300 hover:bg-gray-400 w-2"
            }`}
            aria-label={`Go to slide ${index + 1}`}
            aria-selected={index === activeIndex}
            role="tab"
          />
        ))}
      </div>
    </div>
  );
}
