import en from './messages/en.json';
import gu from './messages/gu.json';
import hi from './messages/hi.json';

export const LOCALES = ['en', 'gu', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Every message key is derived from the English catalogue (source of truth). */
export type MessageKey = keyof typeof en;

export const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  gu,
  hi,
};

export function getMessages(locale: Locale): Record<MessageKey, string> {
  return messages[locale];
}
