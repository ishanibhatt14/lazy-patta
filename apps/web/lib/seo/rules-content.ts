import type { MessageKey } from '@lazy-patta/localization';

import type { GameSlug } from '../game-discovery';

export interface RulesSection {
  readonly headingKey: MessageKey;
  readonly bodyKey: MessageKey;
}

export interface RulesFaqItem {
  readonly questionKey: MessageKey;
  readonly answerKey: MessageKey;
}

export interface RulesContent {
  readonly slug: GameSlug;
  readonly metaTitleKey: MessageKey;
  readonly metaDescriptionKey: MessageKey;
  readonly headingKey: MessageKey;
  readonly introKey: MessageKey;
  readonly sections: readonly RulesSection[];
  readonly faq: readonly RulesFaqItem[];
}

function sections(prefix: 'rules.gadhaChor' | 'rules.lalSatti'): readonly RulesSection[] {
  return [
    { headingKey: 'seo.rules.heading.players', bodyKey: `${prefix}.players` as MessageKey },
    { headingKey: 'seo.rules.heading.setup', bodyKey: `${prefix}.setup` as MessageKey },
    { headingKey: 'seo.rules.heading.objective', bodyKey: `${prefix}.objective` as MessageKey },
    { headingKey: 'seo.rules.heading.play', bodyKey: `${prefix}.play` as MessageKey },
    { headingKey: 'seo.rules.heading.end', bodyKey: `${prefix}.end` as MessageKey },
    { headingKey: 'seo.rules.heading.variations', bodyKey: `${prefix}.variations` as MessageKey },
    { headingKey: 'seo.rules.heading.mistakes', bodyKey: `${prefix}.mistakes` as MessageKey },
    { headingKey: 'seo.rules.heading.strategy', bodyKey: `${prefix}.strategy` as MessageKey },
  ];
}

function faq(prefix: 'rules.gadhaChor' | 'rules.lalSatti'): readonly RulesFaqItem[] {
  return [1, 2, 3].map((n) => ({
    questionKey: `${prefix}.faq.q${n}` as MessageKey,
    answerKey: `${prefix}.faq.a${n}` as MessageKey,
  }));
}

export const RULES_CONTENT: Record<GameSlug, RulesContent> = {
  'gadha-chor': {
    slug: 'gadha-chor',
    metaTitleKey: 'rules.gadhaChor.metaTitle',
    metaDescriptionKey: 'rules.gadhaChor.metaDescription',
    headingKey: 'rules.gadhaChor.heading',
    introKey: 'rules.gadhaChor.intro',
    sections: sections('rules.gadhaChor'),
    faq: faq('rules.gadhaChor'),
  },
  'lal-satti': {
    slug: 'lal-satti',
    metaTitleKey: 'rules.lalSatti.metaTitle',
    metaDescriptionKey: 'rules.lalSatti.metaDescription',
    headingKey: 'rules.lalSatti.heading',
    introKey: 'rules.lalSatti.intro',
    sections: sections('rules.lalSatti'),
    faq: faq('rules.lalSatti'),
  },
};
