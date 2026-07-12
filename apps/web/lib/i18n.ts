import {
  formatMessage,
  getMessages,
  type Locale,
  type MessageKey,
  type MessageValues,
} from '@lazy-patta/localization';

export interface Translator {
  /** Plain lookup for keys without ICU arguments. */
  readonly t: (key: MessageKey) => string;
  /** Whole-sentence ICU formatting (no string concatenation, per ADR i18n). */
  readonly format: (key: MessageKey, values?: MessageValues) => string;
}

export function createTranslator(locale: Locale): Translator {
  const messages = getMessages(locale);
  return {
    t: (key) => messages[key],
    format: (key, values = {}) => formatMessage(locale, key, values),
  };
}
