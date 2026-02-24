import Image from "next/image";
import { useTranslations } from "next-intl";
import { MemberCarousel } from "@/components/member-carousel";

interface CoChair {
  credentials: string;
  image?: string;
  institute?: string;
  link?: string;
  name: string;
  quote?: string;
}

interface Participant {
  credentials: string;
  image?: string;
  institute?: string;
  link?: string;
  name: string;
}

interface Organization {
  description: string;
  image?: string;
  name: string;
}

interface AboutUsSectionProps {
  locale: string;
}

export function AboutUsSection({ locale }: AboutUsSectionProps) {
  const t = useTranslations("aboutUs");

  const coChairs = t.raw("coChairs.members") as CoChair[];
  const participants = t.raw("participants.members") as Participant[];
  const organizations = t.raw("organizations.members") as Organization[];

  const values = [
    { icon: "①", title: t.raw("values.innovation") || "Innovation & Impact" },
    { icon: "②", title: t.raw("values.research") || "Innovation & Research" },
    { icon: "③", title: t.raw("values.empowerment") || "Empowerment for SMEs" },
    {
      icon: "④",
      title: t.raw("values.collaboration") || "Global Collaboration",
    },
  ];

  return (
    <section aria-labelledby="about-heading" className="bg-background">
      {/* Hero Section with Background */}
      <header className="relative min-h-[400px] overflow-hidden bg-gradient-to-b from-emerald-900 to-emerald-700 md:min-h-[500px] lg:min-h-[600px]">
        {/* Background Image Overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/forest-bg.jpg')] bg-center bg-cover opacity-40"
        />

        {/* Network Lines Overlay (decorative) */}
        <div aria-hidden="true" className="absolute inset-0 opacity-20">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                height="50"
                id="grid"
                patternUnits="userSpaceOnUse"
                width="50"
              >
                <circle cx="25" cy="25" fill="white" opacity="0.5" r="2" />
              </pattern>
            </defs>
            <rect fill="url(#grid)" height="100%" width="100%" />
          </svg>
        </div>

        {/* Content */}
        <div className="container relative mx-auto px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-24">
          <div className="mb-12 text-center text-white md:mb-16 lg:mb-20">
            <h1
              className="mb-4 font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
              id="about-heading"
            >
              {t.raw("heroTitle") || "Empowering a Sustainable Future"}
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-white/90 md:text-xl">
              {t.raw("heroSubtitle") ||
                "Meet the expert team behind CarbonLearn"}
            </p>
          </div>

          {/* Co-Chairs Grid */}
          <div
            aria-label="Co-Chairs and Editors"
            className="mx-auto flex max-w-7xl flex-wrap justify-center gap-8 md:gap-12 lg:gap-20"
            role="list"
          >
            {coChairs.slice(0, 3).map((member, index) => (
              <article
                className="flex w-full flex-col items-center text-center text-white sm:w-[280px] md:w-[320px] lg:w-[340px]"
                key={member.name}
                role="listitem"
              >
                <a
                  aria-label={`View profile of ${member.name}`}
                  className="relative mb-4 h-36 w-36 overflow-hidden rounded-full border-4 border-white shadow-2xl transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50 md:mb-6 md:h-48 md:w-48 md:border-8 lg:h-56 lg:w-56"
                  href={member.link}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {member.image ? (
                    <Image
                      alt={member.name}
                      className="object-cover"
                      fill
                      priority={index < 2}
                      sizes="(max-width: 640px) 144px, (max-width: 768px) 192px, 224px"
                      src={member.image}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="h-full w-full bg-white/20"
                    />
                  )}
                </a>
                <h2 className="mb-1 break-words font-bold text-lg md:mb-2 md:text-xl lg:text-2xl">
                  {member.name}
                </h2>
                <p className="mb-1 break-words text-xs opacity-90 md:text-sm lg:text-base">
                  {member.credentials}
                </p>
                {member.institute && (
                  <p className="text-xs opacity-75 md:text-sm">
                    {member.institute}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </header>

      {/* Our Members Section */}
      <section
        aria-labelledby="members-heading"
        className="bg-gray-50 py-12 md:py-16 lg:py-20"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center md:mb-12">
            <h2
              className="mb-2 font-bold text-2xl text-gray-900 md:mb-4 md:text-3xl lg:text-4xl"
              id="members-heading"
            >
              {t.raw("participants.title") || "Our Members"}
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              {t.raw("participants.description") ||
                "Meet our dedicated team of contributors"}
            </p>
          </div>

          <div className="mx-auto max-w-6xl">
            <MemberCarousel members={participants} />
          </div>
        </div>
      </section>

      {/* Global Partners Section */}
      <section
        aria-labelledby="partners-heading"
        className="bg-white py-12 md:py-16 lg:py-20"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center md:mb-12">
            <h2
              className="mb-4 font-bold text-2xl text-gray-900 md:mb-8 md:text-3xl lg:text-4xl"
              id="partners-heading"
            >
              {t.raw("organizations.title") || "Our Global Partners"}
            </h2>
          </div>

          <div className="mx-auto max-w-5xl">
            {/* Partners Logo Grid */}
            <div
              aria-label="Partner organizations"
              className="mb-8 grid grid-cols-1 gap-8 md:mb-12 md:grid-cols-2 md:gap-12 lg:gap-16"
              role="list"
            >
              {organizations.map((org) => (
                <article
                  className="flex flex-col items-center text-center"
                  key={org.name}
                  role="listitem"
                >
                  <div className="relative mb-4 flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-md transition-shadow duration-300 hover:shadow-xl md:mb-6 md:h-48 md:w-48 md:p-6 lg:h-56 lg:w-56">
                    {org.image ? (
                      <Image
                        alt={`${org.name} logo`}
                        className="object-contain p-4 md:p-6"
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 160px, (max-width: 1024px) 192px, 224px"
                        src={org.image}
                      />
                    ) : (
                      <span className="font-bold text-gray-400 text-xl">
                        {org.name}
                      </span>
                    )}
                  </div>
                  <h3 className="mb-2 font-bold text-base text-gray-900 md:text-lg lg:text-xl">
                    {org.name}
                  </h3>
                  <p className="text-gray-600 text-sm lg:text-base">
                    {org.description}
                  </p>
                </article>
              ))}
            </div>

            {/* Values Section */}
            <div
              aria-label="Our core values"
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 md:gap-6 lg:grid-cols-4"
              role="list"
            >
              {values.map((value) => (
                <div
                  className="flex items-start gap-3 rounded-lg bg-gray-50 p-4 transition-colors duration-300 hover:bg-emerald-50"
                  key={value.title}
                  role="listitem"
                >
                  <div
                    aria-hidden="true"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100"
                  >
                    <span className="text-emerald-600 text-lg">
                      {value.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {value.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
