'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export function SurveySection() {
  const t = useTranslations('SurveySection');

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">{t('title')}</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          {t('description')}
        </p>
        <a
        href="https://docs.google.com/forms/d/e/1FAIpQLSd7ZdH_8L38kXJJ9EjqnodwZqpKK7vvIT0n3LeuzbyPiKoi6w/viewform?usp=dialog" // Replace with actual survey link
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Take our survey to help improve CarbonLearn"
          className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {t('buttonText')}
        </a>
      </div>
    </section>
  );
}