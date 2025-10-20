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
          href="https://docs.google.com/forms/d/e/1FAIpQLSeXauPOOpCrnnMoH3Y883Gpt5f2kjItQh9u_GdD-DXhUWDsjA/viewform" // Replace with actual survey link
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {t('buttonText')}
        </a>
      </div>
    </section>
  );
}