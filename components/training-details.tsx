import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Clock, Award, CheckCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

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
    <section className="py-20 lg:py-32 bg-background" id="training">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">{t("badge")}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">{t("title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">{t("description")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {modules.map((module) => (
            <Card key={module.title} className="p-6 hover:shadow-lg transition-shadow border-2">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">{module.title}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  <Clock className="h-4 w-4" />
                  {module.duration}
                </div>
              </div>
              <ul className="space-y-2">
                {module.topics.map((topic) => (
                  <li key={topic} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-2xl p-8 lg:p-12 mb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">{t("benefits.title")}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Image
                src="/diverse-business-professionals-learning-sustainabi.jpg"
                alt={t("imageAlt")}
                fill
                className="rounded-xl shadow-lg object-cover"
              />
              <div className="absolute -bottom-6 -right-6 bg-primary text-primary-foreground p-6 rounded-xl shadow-lg">
                <Award className="h-12 w-12 mb-2" />
                <div className="text-2xl font-bold">{t("badgeCard.title")}</div>
                <div className="text-sm opacity-90">{t("badgeCard.subtitle")}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {stats.map((stat) => {
            const Icon = statIconMap[stat.icon];
            return (
              <Card key={stat.value} className="p-6 text-center border-2">
                <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.description}</div>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 group">
            {t("cta.button")}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">{t("cta.note")}</p>
        </div>
      </div>
    </section>
  );
}
