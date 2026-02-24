import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TrainingModule = {
  title: string;
  duration: string;
  topics: string[];
};

type BenefitList = string[];

type StatItem = {
  icon: "users" | "book" | "award";
  value: string;
  description: string;
};

const statIconMap: Record<StatItem["icon"], typeof Users> = {
  users: Users,
  book: BookOpen,
  award: Award,
};

export function TrainingDetails() {
  const t = useTranslations("training");
  const modules = t.raw("modules.items") as TrainingModule[];
  const benefits = t.raw("benefits.items") as BenefitList;
  const stats = t.raw("stats.items") as StatItem[];

  return (
    <section className="bg-background py-20 lg:py-32" id="training">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
            <BookOpen className="h-4 w-4" />
            <span className="font-medium text-sm">{t("badge")}</span>
          </div>
          <h2 className="mb-4 text-balance font-bold text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="mb-16 grid gap-6 md:grid-cols-2">
          {modules.map((module) => (
            <Card
              className="border-2 p-6 transition-shadow hover:shadow-lg"
              key={module.title}
            >
              <div className="mb-4 flex items-start justify-between">
                <h3 className="font-bold text-foreground text-xl">
                  {module.title}
                </h3>
                <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  {module.duration}
                </div>
              </div>
              <ul className="space-y-2">
                {module.topics.map((topic) => (
                  <li
                    className="flex items-start gap-2 text-muted-foreground"
                    key={topic}
                  >
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="mb-16 rounded-2xl bg-muted/50 p-8 lg:p-12">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-6 font-bold text-2xl text-foreground sm:text-3xl">
                {t("benefits.title")}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div className="flex items-start gap-2" key={benefit}>
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Image
                alt={t("imageAlt")}
                className="rounded-xl object-cover shadow-lg"
                fill
                src="/diverse-business-professionals-learning-sustainabi.jpg"
              />
              <div className="absolute -right-6 -bottom-6 rounded-xl bg-primary p-6 text-primary-foreground shadow-lg">
                <Award className="mb-2 h-12 w-12" />
                <div className="font-bold text-2xl">{t("badgeCard.title")}</div>
                <div className="text-sm opacity-90">
                  {t("badgeCard.subtitle")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12 grid gap-8 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = statIconMap[stat.icon];
            return (
              <Card className="border-2 p-6 text-center" key={stat.value}>
                <Icon className="mx-auto mb-4 h-12 w-12 text-primary" />
                <div className="mb-2 font-bold text-3xl text-foreground">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.description}</div>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            className="group bg-primary px-8 py-6 text-lg text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            {t("cta.button")}
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="mt-4 text-muted-foreground text-sm">{t("cta.note")}</p>
        </div>
      </div>
    </section>
  );
}
