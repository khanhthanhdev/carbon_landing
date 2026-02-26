import { useTranslations } from "next-intl";
import { LogoSoup } from "react-logo-soup";

interface Organization {
  description?: string;
  image?: string;
  name: string;
}

export function SponsorsSection() {
  const t = useTranslations("aboutUs");
  const organizations = (t.raw("organizations.members") ??
    []) as Organization[];
  const logos = organizations
    .map((organization) => ({
      src: organization.image ?? "",
      alt: organization.name,
    }))
    .filter((logo) => Boolean(logo.src));

  return (
    <section className="border-border/60 border-t bg-white py-16 sm:py-20">
      <div className="container mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mt-3 font-semibold text-3xl text-foreground sm:text-4xl">
            {t("organizations.title")}
          </h2>
        </div>

        {logos.length > 0 ? (
          <div className="mx-auto max-w-5xl">
            <LogoSoup baseSize={84} gap={32} logos={logos} />
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm">
            {t("organizations.emptyState")}
          </p>
        )}
      </div>
    </section>
  );
}
