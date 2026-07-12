import { getMessages, type Locale, type MessageKey } from './index';

export type MessageValues = Record<string, string | number>;

const PLURAL_BLOCK = /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g;
const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Minimal ICU-subset formatter. Supports:
 *   - simple argument substitution: `{name}`
 *   - cardinal plurals: `{count, plural, one {# item} other {# items}}`,
 *     where `#` is replaced by the argument's value.
 *
 * This is deliberately not a full ICU implementation — it covers exactly the
 * constructs used by the message catalogue. The plural rule is one-vs-other,
 * which matches the `one`/`other` categories authored for en/gu/hi.
 */
export function formatMessage(locale: Locale, key: MessageKey, values: MessageValues = {}): string {
  const template = getMessages(locale)[key];

  const withPlurals = template.replace(PLURAL_BLOCK, (_match, arg, one, other) => {
    const raw = values[arg];
    const count = typeof raw === 'number' ? raw : Number(raw);
    const branch = count === 1 ? one : other;
    return branch.replace(/#/g, String(raw ?? ''));
  });

  return withPlurals.replace(PLACEHOLDER, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
