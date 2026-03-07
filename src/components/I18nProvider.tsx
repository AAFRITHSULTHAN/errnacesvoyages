import { useState } from 'react';
import { I18nContext, translations } from '@/i18n';
import type { Language } from '@/i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('EN');

    const t = (key: keyof typeof translations.EN): string => {
        return translations[language][key] ?? translations.EN[key];
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}
