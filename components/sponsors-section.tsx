import Image from "next/image";
import { useTranslations } from "next-intl";

export function SponsorsSection() {
  const t = useTranslations('aboutUs');
  const organizations = t.raw('organizations.members');

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-foreground">
          Our Sponsors
        </h2>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-12">
          {organizations.map((org, index) => (
            <div key={index} className="flex-shrink-0">
              <Image
                src={org.image}
                alt={org.name}
                width={200}
                height={80}
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}