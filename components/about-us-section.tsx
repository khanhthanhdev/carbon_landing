"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

export function AboutUsSection() {
  const t = useTranslations("aboutUs");

  const coChairs = t.raw("coChairs.members") as Array<{ name: string; credentials: string; institute?: string; image?: string; link?: string; quote?: string }>;
  const participants = t.raw("participants.members") as Array<{ name: string; credentials: string; institute?: string; image?: string; link?: string }>;
  const organizations = t.raw("organizations.members") as Array<{ name: string; description: string; image?: string }>;

  const slidesToShow = 4;
  const slidesCount = participants.length;
  // Clone last slides in front and first slides after to allow seamless left/right loops
  const canLoop = slidesCount > slidesToShow;
  const startClones = canLoop ? participants.slice(-slidesToShow) : [];
  const endClones = canLoop ? participants.slice(0, slidesToShow) : [];
  const extendedParticipants = canLoop ? [...startClones, ...participants, ...endClones] : participants;

  const [currentSlide, setCurrentSlide] = useState(() => (participants.length > slidesToShow ? slidesToShow : 0));
  // Continuous carousel: manage animation vs instant jump when looping
  const [isAnimating, setIsAnimating] = useState(true);
  const [paused, setPaused] = useState(false);

  const goNext = () => {
    setIsAnimating(true);
    if (!canLoop) {
      setCurrentSlide((prev) => Math.min(prev + 1, Math.max(0, slidesCount - slidesToShow)));
      return;
    }
    setCurrentSlide((prev) => prev + 1);
  };

  const goPrev = () => {
    setIsAnimating(true);
    if (!canLoop) {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
      return;
    }
    setCurrentSlide((prev) => prev - 1);
  };

  // Auto-play: advance every 3s unless paused
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => goNext(), 3000);
    return () => clearInterval(id);
  }, [paused, slidesCount]);

  // When we reach the cloned area / jump to negative, jump instantly to correct index
  const handleTransitionEnd = () => {
    if (!canLoop) return;
    if (currentSlide >= slidesCount + slidesToShow) {
      // we transitioned to the first cloned frame right after last real slide
      setIsAnimating(false); // switch off animation for instant jump
      setTimeout(() => setCurrentSlide(slidesToShow), 20);
    } else if (currentSlide < 0) {
      setIsAnimating(false);
      setTimeout(() => setCurrentSlide(slidesCount + slidesToShow - 1), 20);
    }
  };

  // Re-enable animation after an instant jump
  useEffect(() => {
    if (!isAnimating) {
      const t = setTimeout(() => setIsAnimating(true), 50);
      return () => clearTimeout(t);
    }
  }, [isAnimating]);

  return (
    <section className="bg-background">
      {/* Hero Section with Background */}
      <div className="relative min-h-[500px] lg:min-h-[600px] bg-gradient-to-b from-emerald-900 to-emerald-700 overflow-hidden">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 bg-[url('/forest-bg.jpg')] bg-cover bg-center opacity-40" />
        
        {/* Network Lines Overlay (decorative) */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <circle cx="25" cy="25" r="2" fill="white" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center text-white mb-16 lg:mb-20">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
              Empowering a Sustainable Future
            </h1>
          </div>

          {/* Three Main Leaders */}
          <div className="flex flex-wrap justify-center gap-12 lg:gap-20 max-w-7xl mx-auto">
            {coChairs.slice(0, 3).map((member, index) => (
              <div key={index} className="flex flex-col items-center text-center text-white w-full sm:w-[320px] md:w-[360px] lg:w-[340px]">
                {/* Circular Avatar with White Border */}
                <a 
                  href={member.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="relative w-48 h-48 lg:w-56 lg:h-56 mb-6 rounded-full overflow-hidden border-8 border-white shadow-2xl hover:scale-105 transition-transform duration-300"
                >
                  {member.image ? (
                    <Image
                      fill
                      src={member.image}
                      alt={member.name}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20" />
                  )}
                </a>
                <h3 className="text-xl lg:text-2xl font-bold mb-2 break-words">{member.name}</h3>
                <p className="text-sm lg:text-base opacity-90 mb-1 break-words">{member.credentials}</p>
                {/* <p className="text-sm lg:text-base opacity-75 italic">
                  "{member.quote || "Bridging economics and ecology"}"
                </p> */}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Leadership Section */}
      <div className="bg-gray-50 py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Our Member
            </h2>
          </div>

          {/* Leadership Slideshow - 4 at a time */}
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              {/* Carousel Container */}
              <div className="overflow-hidden px-12" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                <div 
                  className={`flex gap-8 ${isAnimating ? "transition-transform duration-500 ease-out" : ""}`}
                              style={{ transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)` }}
                  onTransitionEnd={handleTransitionEnd}
                >
                  {extendedParticipants.map((member, index) => (
                    <div key={`${index}-${member.name}`} className="flex-shrink-0 w-1/4">
                      <a
                        href={member.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center group h-full"
                      >
                        {/* Avatar Circle */}
                        <div className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 bg-gradient-to-br from-emerald-300 to-emerald-500 mb-4 flex-shrink-0">
                          {member.image ? (
                            <Image
                              fill
                              src={member.image}
                              alt={member.name}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
                          )}
                        </div>
                        {/* Name */}
                        <h4 className="text-center text-sm lg:text-base font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-300 line-clamp-2">
                          {member.name}
                        </h4>
                        <p className="text-center text-xs lg:text-sm text-gray-600 mt-1 line-clamp-2">
                          {member.credentials}
                        </p>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <button
                onClick={goPrev}
                disabled={!canLoop && currentSlide === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors duration-300"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goNext}
                disabled={!canLoop && currentSlide >= slidesCount - slidesToShow}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors duration-300"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: slidesCount }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => { setIsAnimating(true); setCurrentSlide(canLoop ? index + slidesToShow : index); }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === (canLoop ? ((currentSlide - slidesToShow + slidesCount) % slidesCount) : currentSlide) ? "bg-emerald-600 w-8" : "bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Global Partners Section */}
      <div className="bg-white py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">
              Our Global Partners
            </h2>
          </div>

          <div className="max-w-5xl mx-auto">
            {/* Partners Logo Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 mb-12">
              {organizations.map((org, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="relative w-48 h-48 lg:w-56 lg:h-56 mb-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200 p-6 flex items-center justify-center">
                    {org.image ? (
                      <Image
                        fill
                        src={org.image}
                        alt={org.name}
                        className="object-contain p-6"
                      />
                    ) : (
                      <div className="text-gray-400 font-bold text-xl">{org.name}</div>
                    )}
                  </div>
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                    {org.name}
                  </h3>
                  <p className="text-sm lg:text-base text-gray-600">
                    {org.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Values Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 text-lg">①</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Innovation & Impact</h4>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 text-lg">②</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Innovation & Research</h4>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 text-lg">③</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Empowerment for SMEs</h4>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 text-lg">④</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Global Collaboration</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Section */}
      {/* <div className="bg-gradient-to-br from-emerald-50 to-teal-50 py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Quote className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
            <blockquote className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 italic">
              "Knowledge is the carbon currency of tomorrow."
            </blockquote>
            <div className="text-gray-600 text-lg">
              <p className="font-semibold">VinUniversity</p>
              <p className="text-sm">Leading private for Vietnam</p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Final CTA Section */}
      {/* <div className="bg-emerald-600 py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Assess Your Carbon Readiness?
          </h2>
          <Button 
            size="lg" 
            className="bg-white text-emerald-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-full shadow-lg"
          >
            Take the Survey (Google Form)
          </Button>
        </div>
      </div> */}
    </section>
  );
}