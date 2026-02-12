import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUserPreferences, updateUserPreferences } from '../api/userPreferences';
import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';
import deTranslations from '../locales/de.json';
import jaTranslations from '../locales/ja.json';

export type Language = 'en' | 'fr' | 'de' | 'ja';

const translations: Record<Language, typeof enTranslations> = {
  en: enTranslations,
  fr: frTranslations,
  de: deTranslations,
  ja: jaTranslations,
};

// Currency mapping for each language
const currencyConfig: Record<Language, { code: string; symbol: string; locale: string }> = {
  en: { code: 'GBP', symbol: '£', locale: 'en-GB' },
  fr: { code: 'EUR', symbol: '€', locale: 'fr-FR' },
  de: { code: 'EUR', symbol: '€', locale: 'de-DE' },
  ja: { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  availableLanguages: { code: Language; name: string }[];
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
  currencyCode: string;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('language');
    if (saved && (saved === 'en' || saved === 'fr' || saved === 'de' || saved === 'ja')) {
      return saved as Language;
    }
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'fr' || browserLang === 'de' || browserLang === 'ja') {
      return browserLang as Language;
    }
    return 'en';
  });
  const [loading, setLoading] = useState(false);
  // Ref to track which userId we've loaded for - ensures we always load when user becomes available
  const loadedForUserIdRef = useRef<string | null>(null);

  // Reset ref when user logs out
  useEffect(() => {
    if (!user) {
      loadedForUserIdRef.current = null;
    }
  }, [user]);

  // Fetch user language preference when user logs in - depend only on user?.userId so we always run when user is set
  useEffect(() => {
    const userId = user?.userId;
    if (!userId) {
      return;
    }
    // Avoid duplicate load for same user in same session
    if (loadedForUserIdRef.current === userId) {
      return;
    }

    let cancelled = false;
    loadedForUserIdRef.current = userId;
    console.log('[Language] Loading preferences for user:', userId);
    setLoading(true);

    getUserPreferences(userId)
      .then((preferences) => {
        if (cancelled) return;
        console.log('[Language] Loaded preferences from API:', preferences);
        if (preferences?.language && ['en', 'fr', 'de', 'ja'].includes(preferences.language)) {
          console.log('[Language] Applying saved language:', preferences.language);
          setLanguageState(preferences.language as Language);
          localStorage.setItem('language', preferences.language);
          document.documentElement.lang = preferences.language;
        } else {
          console.log('[Language] No/invalid language in response, defaulting to "en"');
          setLanguageState('en');
          localStorage.setItem('language', 'en');
          document.documentElement.lang = 'en';
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[Language] Failed to load user preferences:', error);
        setLanguageState('en');
        localStorage.setItem('language', 'en');
        document.documentElement.lang = 'en';
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]); // Only depend on userId - effect runs whenever user identity is set

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    
    // Update document language attribute for accessibility
    document.documentElement.lang = lang;

    // Save to backend if user is authenticated
    if (user) {
      try {
        console.log('[Language] Saving preferences for user:', user.userId, 'language:', lang);
        console.log('[Language] User object:', { userId: user.userId, userDetails: user.userDetails });
        const updated = await updateUserPreferences({ language: lang }, user.userId);
        console.log('[Language] Preferences saved successfully:', updated);
        
        // Verify the save was successful
        if (!updated || updated.language !== lang) {
          console.warn('[Language] Warning: Saved preferences do not match expected value', {
            expected: lang,
            received: updated?.language
          });
        }
      } catch (error: any) {
        console.error('[Language] Failed to save language preference:', error);
        console.error('[Language] Error details:', {
          message: error.message,
          status: error.status,
          stack: error.stack,
          userId: user.userId,
          language: lang,
          errorData: (error as any).errorData
        });
        // Show error in console but don't block UI - language change still works locally
        console.warn('[Language] Language preference saved to localStorage only. Backend save failed.');
      }
    } else {
      console.warn('[Language] User not authenticated - saving to localStorage only');
    }
  };

  // Translation function with parameter support
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const k2 of keys) {
          if (value && typeof value === 'object' && k2 in value) {
            value = value[k2];
          } else {
            return key; // Return key if not found even in English
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters in the format {paramName}
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramName) => {
        return params[paramName] || match;
      });
    }

    return value;
  };

  const availableLanguages = [
    { code: 'en' as Language, name: translations.en.languages.en },
    { code: 'fr' as Language, name: translations.en.languages.fr },
    { code: 'de' as Language, name: translations.en.languages.de },
    { code: 'ja' as Language, name: translations.en.languages.ja },
  ];

  // Currency formatting function
  const formatCurrency = (amount: number): string => {
    const config = currencyConfig[language];
    try {
      // Use Intl.NumberFormat for proper locale-aware formatting
      const formatter = new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.code,
        minimumFractionDigits: config.code === 'JPY' ? 0 : 2,
        maximumFractionDigits: config.code === 'JPY' ? 0 : 2,
      });
      return formatter.format(amount);
    } catch (error) {
      // Fallback to simple formatting if Intl.NumberFormat fails
      if (config.code === 'JPY') {
        return `${config.symbol}${Math.round(amount).toLocaleString()}`;
      }
      return `${config.symbol}${amount.toFixed(2)}`;
    }
  };

  const currencySymbol = currencyConfig[language].symbol;
  const currencyCode = currencyConfig[language].code;

  // Set document language attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        availableLanguages,
        formatCurrency,
        currencySymbol,
        currencyCode,
        loading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
