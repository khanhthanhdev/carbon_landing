import Image from "next/image";
import { useTranslations } from "next-intl";

export function SponsorsSection() {
  const t = useTranslations("aboutUs");
  const organizations = t.raw("organizations.members");

  return (
    <section className="bg-background py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center font-bold text-2xl text-foreground sm:text-3xl">
          Đơn vị thực hiện
        </h2>
        <div className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-12">
          {organizations.map((org) => (
            <div className="flex-shrink-0" key={org.name}>
              <Image
                alt={org.name}
                className="object-contain"
                height={80}
                src={org.image}
                width={200}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
