import { describe, expect, it } from 'vitest';

import en from './messages/en.json';
import gu from './messages/gu.json';
import hi from './messages/hi.json';

import { LOCALES, messages } from './index';

const ICU_PLACEHOLDER = /\{(\w+)/g;

function placeholders(value: string): Set<string> {
  return new Set([...value.matchAll(ICU_PLACEHOLDER)].map((m) => m[1]!));
}

describe('localization key sync', () => {
  const enKeys = Object.keys(en).sort();

  it('exposes exactly the en/gu/hi locales', () => {
    expect(LOCALES).toEqual(['en', 'gu', 'hi']);
  });

  it.each([
    ['gu', gu],
    ['hi', hi],
  ])('%s has the same key set as en (no missing or extra keys)', (_name, catalogue) => {
    expect(Object.keys(catalogue).sort()).toEqual(enKeys);
  });

  it('every locale shares en ICU placeholders (no dropped interpolations)', () => {
    for (const locale of LOCALES) {
      for (const key of enKeys) {
        const expected = placeholders((en as Record<string, string>)[key]!);
        const actual = placeholders(messages[locale][key as keyof typeof en]);
        expect(actual, `${locale}:${key}`).toEqual(expected);
      }
    }
  });

  it('has no empty translations', () => {
    for (const locale of LOCALES) {
      for (const value of Object.values(messages[locale])) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
