import { HOUSE_RULE_GAME_SLUGS, presetsFor } from '@lazy-patta/game-contracts';
import { getMessages, type Locale, type MessageKey } from '@lazy-patta/localization';
import { describe, expect, it } from 'vitest';

const LOCALES: readonly Locale[] = ['en', 'gu', 'hi'];

describe('house-rule preset localization', () => {
  it('resolves every preset label and description key in all locales', () => {
    for (const locale of LOCALES) {
      const messages = getMessages(locale);
      for (const slug of HOUSE_RULE_GAME_SLUGS) {
        for (const preset of presetsFor(slug)) {
          const label = messages[preset.labelKey as MessageKey];
          const description = messages[preset.descriptionKey as MessageKey];
          expect(label, `${locale}:${preset.labelKey}`).toBeTruthy();
          expect(description, `${locale}:${preset.descriptionKey}`).toBeTruthy();
        }
      }
    }
  });
});
