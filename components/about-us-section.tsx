import { Building2, Globe2, Handshake, Users } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface TeamMember {
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

const getMemberInitials = (name: string): string =>
  name
    .split(" ")
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

export function AboutUsSection({ locale }: AboutUsSectionProps) {
  const t = useTranslations("aboutUs");

  const isVietnamese = locale.startsWith("vi");
  const coChairs = t.raw("coChairs.members") as TeamMember[];
  const participants = t.raw("participants.members") as TeamMember[];
  const organizations = t.raw("organizations.members") as Organization[];

  const primaryCoChairs = coChairs.slice(0, 3);
  const otherEditors = [...coChairs.slice(3), ...participants];

  const principles = [
    {
      description: isVietnamese
        ? "Kết nối học thuật, tài chính và quản trị để xây dựng năng lực thị trường carbon."
        : "Linking policy, finance, and academia to support market-readiness in carbon transition.",
      icon: Globe2,
      title: isVietnamese
        ? "Khung Hợp Tác Quốc Tế"
        : "International Coordination",
    },
    {
      description: isVietnamese
        ? "Thiết kế chương trình gắn với cơ chế tín dụng xanh, MRV và chuẩn công bố minh bạch."
        : "Designing practical guidance around green finance, MRV, and transparent disclosure.",
      icon: Building2,
      title: isVietnamese
        ? "Năng Lực Tài Chính Xanh"
        : "Green Finance Competence",
    },
    {
      description: isVietnamese
        ? "Tăng cường năng lực cho SMEs thông qua đào tạo, nghiên cứu ứng dụng và chia sẻ thực tiễn."
        : "Equipping SMEs with applied research, training programs, and implementation support.",
      icon: Handshake,
      title: isVietnamese
        ? "Hỗ Trợ Triển Khai Thực Tế"
        : "Practical Implementation",
    },
  ];

  return (
    <section
      aria-labelledby="about-heading"
      className="bg-[linear-gradient(180deg,#f6f8f7_0%,#f0f4f2_38%,#ffffff_100%)]"
    >
      <section className="bg-[#eff2f1] py-14 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mt-3 font-semibold text-3xl text-foreground sm:text-3xl">
              {t.raw("coChairs.title") || "Co-Chairs and Editors"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {isVietnamese
                ? "Đội ngũ chuyên gia định hướng nội dung với kinh nghiệm trong kinh tế khí hậu, chính sách công và tài chính bền vững."
                : "Senior experts guiding program quality across climate economics, public policy, and sustainable finance."}
            </p>
          </div>

          <ul
            aria-label="Co-chairs"
            className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-3"
          >
            {primaryCoChairs.map((member, index) => {
              const hasExternalProfile = Boolean(
                member.link && member.link !== "#"
              );
              const CardWrapper = hasExternalProfile ? "a" : "div";
              const wrapperProps = hasExternalProfile
                ? {
                    href: member.link,
                    rel: "noopener noreferrer",
                    target: "_blank",
                  }
                : {};

              return (
                <li className="text-center" key={member.name}>
                  <article>
                    <CardWrapper
                      aria-label={
                        hasExternalProfile
                          ? `Open profile of ${member.name}`
                          : `Profile card of ${member.name}`
                      }
                      className="group block"
                      {...wrapperProps}
                    >
                      <div
                        className="animate-fade-in-up opacity-0 [animation-fill-mode:forwards]"
                        style={{ animationDelay: `${index * 120}ms` }}
                      >
                        <div className="relative mx-auto h-44 w-44 overflow-hidden rounded-full bg-[#dce3df] ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-[1.03] sm:h-48 sm:w-48">
                          {member.image ? (
                            <Image
                              alt={member.name}
                              className="object-cover"
                              fill
                              priority={index < 2}
                              sizes="(max-width: 640px) 176px, 192px"
                              src={member.image}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7aa995] to-[#2f6f5a] font-semibold text-3xl text-white">
                              {getMemberInitials(member.name)}
                            </div>
                          )}
                        </div>
                        <h3 className="mt-5 font-semibold text-2xl text-[#08384a] leading-tight sm:text-3xl">
                          {member.name}
                        </h3>
                        <p className="mx-auto mt-3 max-w-[20rem] text-[#08384a] text-lg leading-relaxed sm:text-xl">
                          {member.credentials}
                        </p>
                        {member.institute && (
                          <p className="mx-auto mt-2 max-w-[16rem] text-[#255b54] text-base leading-relaxed sm:text-lg">
                            {member.institute}
                          </p>
                        )}
                      </div>
                    </CardWrapper>
                  </article>
                </li>
              );
            })}
          </ul>

          {otherEditors.length > 0 && (
            <div className="mx-auto mt-14 max-w-7xl border-border/60 border-t pt-10">
              <div className="mb-8 text-center">
                <p className="font-semibold text-primary text-xs uppercase tracking-[0.22em]">
                  {isVietnamese ? "Nhóm Biên Tập" : "Editorial Team"}
                </p>
                <h3 className="mt-2 font-semibold text-foreground text-xl sm:text-2xl">
                  {isVietnamese ? "Các Biên Tập Khác" : "Other Editors"}
                </h3>
              </div>

              <ul
                aria-label="Other editors"
                className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4"
              >
                {otherEditors.map((member, index) => {
                  const hasExternalProfile = Boolean(
                    member.link && member.link !== "#"
                  );
                  const CardWrapper = hasExternalProfile ? "a" : "div";
                  const wrapperProps = hasExternalProfile
                    ? {
                        href: member.link,
                        rel: "noopener noreferrer",
                        target: "_blank",
                      }
                    : {};

                  return (
                    <li className="text-center" key={`editor-${member.name}`}>
                      <article>
                        <CardWrapper
                          aria-label={
                            hasExternalProfile
                              ? `Open profile of ${member.name}`
                              : `Profile card of ${member.name}`
                          }
                          className="group block"
                          {...wrapperProps}
                        >
                          <div
                            className="animate-fade-in-up opacity-0 [animation-fill-mode:forwards]"
                            style={{ animationDelay: `${(index + 3) * 80}ms` }}
                          >
                            <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-[#dce3df] ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-[1.03] sm:h-28 sm:w-28">
                              {member.image ? (
                                <Image
                                  alt={member.name}
                                  className="object-cover"
                                  fill
                                  sizes="(max-width: 640px) 96px, 112px"
                                  src={member.image}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#7aa995] to-[#2f6f5a] font-semibold text-white text-xl">
                                  {getMemberInitials(member.name)}
                                </div>
                              )}
                            </div>
                            <h4 className="mt-4 font-semibold text-[#08384a] text-base leading-tight sm:text-lg">
                              {member.name}
                            </h4>
                            {member.credentials && (
                              <p className="mx-auto mt-2 max-w-[16rem] text-[#255b54] text-sm leading-relaxed">
                                {member.credentials}
                              </p>
                            )}
                            {member.institute && (
                              <p className="mx-auto mt-1 max-w-[16rem] text-muted-foreground text-xs leading-relaxed sm:text-sm">
                                {member.institute}
                              </p>
                            )}
                          </div>
                        </CardWrapper>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="py-14 sm:py-16 lg:py-20">
        <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <article
                className="rounded-2xl border border-border bg-white p-6 shadow-[0_14px_35px_rgba(8,56,74,0.08)]"
                key={principle.title}
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">
                    {principle.title}
                  </h3>
                </div>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {principle.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-border border-t bg-[#f6f8f7] py-14 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="font-semibold text-primary text-xs uppercase tracking-[0.22em]">
              {isVietnamese ? "Tổ Chức Đồng Hành" : "Institutional Partners"}
            </p>
            <h2 className="mt-3 font-semibold text-2xl text-foreground sm:text-3xl">
              {t.raw("organizations.title") || "Organizing Institutions"}
            </h2>
          </div>

          <ul
            aria-label="Partner organizations"
            className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6"
          >
            {organizations.map((organization) => (
              <li key={organization.name}>
                <article className="flex items-start gap-4 rounded-2xl border border-border/80 bg-white p-4 text-left shadow-sm sm:gap-6 sm:p-6">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                    {organization.image ? (
                      <Image
                        alt={`${organization.name} logo`}
                        className="object-contain p-2"
                        fill
                        sizes="64px"
                        src={organization.image}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Users aria-hidden="true" className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base text-foreground sm:text-lg">
                      {organization.name}
                    </h3>
                    <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {organization.description}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
}
