export interface UserPreferences {
  id: string; // userId
  userId: string;
  darkMode: boolean;
  language?: string; // Language code: 'en' | 'fr' | 'de' | 'ja'
  updatedAt: string;
}
