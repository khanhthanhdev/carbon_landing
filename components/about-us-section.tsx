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
    <section className="py-12 sm:py-16 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 text-balance">
            {t("title")}
          </h1>
          <p className="text-3xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            {t("subtitle")}
          </p>
        </div>

        {/* Co-Chairs and Editors */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-4 py-2 text-xl font-medium">
              <Users className="h-4 w-4 mr-2" />
              {t("coChairs.title")}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 max-w-7xl mx-auto">
            {coChairs.map((member, index) => (
              <Card key={index} className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white p-0">
                <div className="relative">
                  {/* Profile Image */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
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
                          <Users className="h-16 w-16 text-primary/60 group-hover:text-primary/80 transition-colors duration-300" />
                        </div>
                      </>
                    )}
                    {/* Decorative elements */}
                    <div className="absolute top-4 right-4 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 text-center">
                    <div className="mb-3">
                      <h3 className="text-3xl font-bold text-foreground mb-1 leading-tight">
                        {member.name}
                      </h3>
                      {member.credentials && (
                        <p className="text-xl font-medium text-primary">
                          {member.credentials}
                        </p>
                      )}
                    </div>

                    {member.institute && (
                      <div className="flex items-center justify-center gap-2 text-xl text-muted-foreground">
                        <MapPin className="h-4 w-4" />
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
        <div className="mb-20">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium">
              <Users className="h-4 w-4 mr-2" />
              {t("participants.title")}
            </Badge>
          </div>

          <div className="max-w-6xl mx-auto">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {participants.map((member, index) => (
                  <CarouselItem key={index} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
                    <Card className="group overflow-hidden border shadow-md hover:shadow-xl transition-all duration-300 bg-white p-0">
                      <div className="relative">
                        {/* Profile Image */}
                        <div className="aspect-[4/5] bg-gradient-to-br from-muted/50 to-muted/30 relative overflow-hidden">
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
                                <Users className="h-12 w-12 text-muted-foreground group-hover:text-primary/80 transition-colors duration-300" />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-5 text-center">
                          <h4 className="text-lg font-semibold text-foreground mb-1 leading-tight">
                            {member.name}
                          </h4>
                          {member.credentials && (
                            <p className="text-sm font-medium text-primary">
                              {member.credentials}
                            </p>
                          )}
                          {member.institute && (
                            <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
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
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </div>
        </div>

        {/* Organizations */}
        <div>
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium">
              <Building2 className="h-4 w-4 mr-2" />
              {t("organizations.title")}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
            {organizations.map((org, index) => (
              <Card key={index} className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white p-0">
                <div className="relative">
                  {/* Organization Image */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
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
                          <Building2 className="h-16 w-16 text-primary/60 group-hover:text-primary/80 transition-colors duration-300" />
                        </div>
                      </>
                    )}
                    {/* Decorative elements */}
                    <div className="absolute top-4 right-4 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 text-center">
                    <h3 className="text-2xl font-bold text-foreground mb-2 leading-tight">
                      {org.name}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
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