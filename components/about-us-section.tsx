import Image from "next/image";
import { useTranslations } from "next-intl";
import { MemberCarousel } from "@/components/member-carousel";

interface CoChair {
  name: string;
  credentials: string;
  institute?: string;
  image?: string;
  link?: string;
  quote?: string;
}

interface Participant {
  name: string;
  credentials: string;
  institute?: string;
  image?: string;
  link?: string;
}

interface Organization {
  name: string;
  description: string;
  image?: string;
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
    { icon: "④", title: t.raw("values.collaboration") || "Global Collaboration" },
  ];

  return (
    <section className="bg-background" aria-labelledby="about-heading">
      {/* Hero Section with Background */}
      <header className="relative min-h-[400px] md:min-h-[500px] lg:min-h-[600px] bg-gradient-to-b from-emerald-900 to-emerald-700 overflow-hidden">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 bg-[url('/forest-bg.jpg')] bg-cover bg-center opacity-40" 
          aria-hidden="true" 
        />
        
        {/* Network Lines Overlay (decorative) */}
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
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
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-24">
          <div className="text-center text-white mb-12 md:mb-16 lg:mb-20">
            <h1 
              id="about-heading"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            >
              {t.raw("heroTitle") || "Empowering a Sustainable Future"}
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
              {t.raw("heroSubtitle") || "Meet the expert team behind CarbonLearn"}
            </p>
          </div>

          {/* Co-Chairs Grid */}
          <div 
            className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-20 max-w-7xl mx-auto"
            role="list"
            aria-label="Co-Chairs and Editors"
          >
            {coChairs.slice(0, 3).map((member, index) => (
              <article 
                key={member.name} 
                className="flex flex-col items-center text-center text-white w-full sm:w-[280px] md:w-[320px] lg:w-[340px]"
                role="listitem"
              >
                <a 
                  href={member.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="relative w-36 h-36 md:w-48 md:h-48 lg:w-56 lg:h-56 mb-4 md:mb-6 rounded-full overflow-hidden border-4 md:border-8 border-white shadow-2xl hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-white/50"
                  aria-label={`View profile of ${member.name}`}
                >
                  {member.image ? (
                    <Image
                      fill
                      src={member.image}
                      alt={member.name}
                      className="object-cover"
                      sizes="(max-width: 640px) 144px, (max-width: 768px) 192px, 224px"
                      priority={index < 2}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20" aria-hidden="true" />
                  )}
                </a>
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-1 md:mb-2 break-words">
                  {member.name}
                </h2>
                <p className="text-xs md:text-sm lg:text-base opacity-90 mb-1 break-words">
                  {member.credentials}
                </p>
                {member.institute && (
                  <p className="text-xs md:text-sm opacity-75">
                    {member.institute}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </header>

      {/* Our Members Section */}
      <section className="bg-gray-50 py-12 md:py-16 lg:py-20" aria-labelledby="members-heading">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 
              id="members-heading"
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-4"
            >
              {t.raw("participants.title") || "Our Members"}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t.raw("participants.description") || "Meet our dedicated team of contributors"}
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <MemberCarousel members={participants} />
          </div>
        </div>
      </section>

      {/* Global Partners Section */}
      <section className="bg-white py-12 md:py-16 lg:py-20" aria-labelledby="partners-heading">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 
              id="partners-heading"
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 md:mb-8"
            >
              {t.raw("organizations.title") || "Our Global Partners"}
            </h2>
          </div>

          <div className="max-w-5xl mx-auto">
            {/* Partners Logo Grid */}
            <div 
              className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 mb-8 md:mb-12"
              role="list"
              aria-label="Partner organizations"
            >
              {organizations.map((org) => (
                <article 
                  key={org.name} 
                  className="flex flex-col items-center text-center"
                  role="listitem"
                >
                  <div className="relative w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 mb-4 md:mb-6 bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200 p-4 md:p-6 flex items-center justify-center">
                    {org.image ? (
                      <Image
                        fill
                        src={org.image}
                        alt={`${org.name} logo`}
                        className="object-contain p-4 md:p-6"
                        sizes="(max-width: 768px) 160px, (max-width: 1024px) 192px, 224px"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-gray-400 font-bold text-xl">{org.name}</span>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-2">
                    {org.name}
                  </h3>
                  <p className="text-sm lg:text-base text-gray-600">
                    {org.description}
                  </p>
                </article>
              ))}
            </div>

            {/* Values Section */}
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8 md:mt-12"
              role="list"
              aria-label="Our core values"
            >
              {values.map((value, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 hover:bg-emerald-50 transition-colors duration-300"
                  role="listitem"
                >
                  <div 
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="text-emerald-600 text-lg">{value.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{value.title}</h4>
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