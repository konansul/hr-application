import { en } from './languages/en';
import { ru } from './languages/ru';
import { tr } from './languages/tr';
import { de } from './languages/de';
import { es } from './languages/es';
import { fr } from './languages/fr';
import { pt } from './languages/pt';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
];

export const DICT = {
  en,
  ru,
  tr,
  de,
  es,
  fr,
  pt,
} as const;

export type LanguageCode = keyof typeof DICT;