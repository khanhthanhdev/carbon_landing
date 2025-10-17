"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Image from "next/image";

export function AboutUsSection() {
  const t = useTranslations("aboutUs");

  const coChairs = t.raw("coChairs.members") as Array<{ name: string; credentials: string; institute?: string; image?: string; link?: string }>;
  const participants = t.raw("participants.members") as Array<{ name: string; credentials: string; institute?: string; image?: string; link?: string }>;
  const organizations = t.raw("organizations.members") as Array<{ name: string; description: string; image?: string }>;

  return (
    <section className="pt-16 sm:pt-0 py-8 sm:py-12 lg:py-16 xl:py-12 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8 lg:mb-12 xl:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-3xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-3 sm:mb-4 text-balance">
            {t("title")}
          </h1>
          <p className="text-base sm:text-lg md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty px-4">
            {t("subtitle")}
          </p>
        </div>

        {/* Co-Chairs and Editors */}
        <div className="mb-8 lg:mb-10 xl:mb-8">
          <div className="text-center mb-8 lg:mb-10">
            <Badge variant="secondary" className="mb-3 px-3 py-1.5 text-lg font-medium">
              <Users className="h-4 w-4 mr-2" />
              {t("coChairs.title")}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {coChairs.map((member, index) => (
              <Card key={index} className="group overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white p-0">
                <div className="relative">
                  {/* Profile Image */}
                  <div className="aspect-[4/5] sm:aspect-[3/4] bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                    {member.image ? (
                      <a href={member.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                        <Image
                          fill
                          src={member.image}
                          alt={member.name}
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        />
                      </a>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/10 transition-colors duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Users className="h-12 w-12 sm:h-14 sm:h-14 text-primary/60 group-hover:text-primary/80 transition-colors duration-300" />
                        </div>
                      </>
                    )}
                    {/* Decorative elements */}
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-6 text-center">
                    <div className="mb-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1 leading-tight">
                        {member.name}
                      </h3>
                      {member.credentials && (
                        <p className="text-base sm:text-lg font-medium text-primary">
                          {member.credentials}
                        </p>
                      )}
                    </div>

                    {member.institute && (
                      <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-muted-foreground">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="font-medium">{member.institute}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div className="mb-12 lg:mb-16">
          <div className="text-center mb-8 lg:mb-10">
            <Badge variant="secondary" className="mb-3 px-3 py-1.5 text-sm font-medium">
              <Users className="h-4 w-4 mr-2" />
              {t("participants.title")}
            </Badge>
          </div>

          <div className="max-w-5xl mx-auto">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-3">
                {participants.map((member, index) => (
                  <CarouselItem key={index} className="pl-2 md:pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Card className="group overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 bg-white p-0">
                      <div className="relative">
                        {/* Profile Image */}
                        <div className="aspect-[3/4] bg-gradient-to-br from-muted/50 to-muted/30 relative overflow-hidden">
                          {member.image ? (
                            <a href={member.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                              <Image
                                fill
                                src={member.image}
                                alt={member.name}
                                className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                              />
                            </a>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/5 transition-colors duration-300" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Users className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground group-hover:text-primary/80 transition-colors duration-300" />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3 sm:p-4 text-center">
                          <h4 className="text-sm sm:text-base font-semibold text-foreground mb-1 leading-tight">
                            {member.name}
                          </h4>
                          {member.credentials && (
                            <p className="text-xs sm:text-sm font-medium text-primary">
                              {member.credentials}
                            </p>
                          )}
                          {member.institute && (
                            <div className="flex items-center justify-center gap-1 mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="font-medium truncate">{member.institute}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </Carousel>
          </div>
        </div>

        {/* Organizations */}
        <div>
          <div className="text-center mb-8 lg:mb-10">
            <Badge variant="secondary" className="mb-3 px-3 py-1.5 text-sm font-medium">
              <Building2 className="h-4 w-4 mr-2" />
              {t("organizations.title")}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {organizations.map((org, index) => (
              <Card key={index} className="group overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white p-0">
                <div className="relative">
                  {/* Organization Image */}
                  <div className="aspect-[16/9] sm:aspect-[21/9] bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                    {org.image ? (
                      <Image
                        fill
                        src={org.image}
                        alt={org.name}
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/10 transition-colors duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Building2 className="h-12 w-12 sm:h-14 sm:w-14 text-primary/60 group-hover:text-primary/80 transition-colors duration-300" />
                        </div>
                      </>
                    )}
                    {/* Decorative elements */}
                    <div className="absolute top-3 right-3 w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-6 text-center">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 leading-tight">
                      {org.name}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {org.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}