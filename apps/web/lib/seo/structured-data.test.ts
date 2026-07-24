import { describe, expect, it } from 'vitest';

import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  videoGameJsonLd,
  webApplicationJsonLd,
  websiteJsonLd,
} from './structured-data';

describe('videoGameJsonLd', () => {
  const jsonLd = videoGameJsonLd({
    slug: 'gadha-chor',
    locale: 'en',
    name: 'Gadha Chor',
    description: 'A quick family card game.',
  });

  it('carries the game aliases as alternateName', () => {
    expect(jsonLd['@type']).toBe('VideoGame');
    expect(jsonLd.alternateName).toContain('Gulam Chor');
    expect(jsonLd.url).toBe('https://lazypatta.com/en/games/gadha-chor');
  });

  it('never fabricates ratings, reviews, or offers', () => {
    expect(jsonLd).not.toHaveProperty('aggregateRating');
    expect(jsonLd).not.toHaveProperty('review');
    expect(jsonLd).not.toHaveProperty('offers');
  });
});

describe('site-wide entities', () => {
  it('links WebSite to Organization by @id', () => {
    const website = websiteJsonLd();
    const organization = organizationJsonLd();
    expect((website.publisher as { '@id': string })['@id']).toBe(organization['@id']);
    expect(organization.logo).toMatchObject({
      '@type': 'ImageObject',
      url: 'https://lazypatta.com/icons/icon-512.png',
      width: 512,
      height: 512,
    });
  });
});

describe('webApplicationJsonLd', () => {
  const jsonLd = webApplicationJsonLd('Play on your phone.');

  it('describes a free, browser-based GameApplication linked to the Organization', () => {
    expect(jsonLd['@type']).toBe('WebApplication');
    expect(jsonLd.applicationCategory).toBe('GameApplication');
    expect(jsonLd.url).toBe('https://lazypatta.com/mobile');
    expect(jsonLd.description).toBe('Play on your phone.');
    expect((jsonLd.publisher as { '@id': string })['@id']).toBe(organizationJsonLd()['@id']);
    expect(jsonLd.offers).toMatchObject({ '@type': 'Offer', price: '0', priceCurrency: 'USD' });
  });

  it('lists real product screenshots as absolute URLs', () => {
    expect(jsonLd.screenshot).toEqual([
      'https://lazypatta.com/images/screenshots/lazy-patta-mobile-home.png',
      'https://lazypatta.com/images/screenshots/lazy-patta-lal-satti.png',
      'https://lazypatta.com/images/screenshots/lazy-patta-game-setup.png',
      'https://lazypatta.com/images/screenshots/lazy-patta-game-table.png',
      'https://lazypatta.com/images/screenshots/lazy-patta-win.png',
    ]);
  });

  it('never fabricates ratings or reviews', () => {
    expect(jsonLd).not.toHaveProperty('aggregateRating');
    expect(jsonLd).not.toHaveProperty('review');
  });
});

describe('breadcrumbListJsonLd', () => {
  it('numbers positions from 1 and resolves absolute item URLs', () => {
    const jsonLd = breadcrumbListJsonLd([
      { name: 'Home', path: '/' },
      { name: 'How to play', path: '/en/how-to-play' },
    ]);
    expect(jsonLd.itemListElement).toStrictEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lazypatta.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'How to play',
        item: 'https://lazypatta.com/en/how-to-play',
      },
    ]);
  });
});

describe('faqPageJsonLd', () => {
  it('maps each entry to a Question with an accepted Answer', () => {
    const jsonLd = faqPageJsonLd([{ question: 'How many players?', answer: 'Three to six.' }]);
    expect(jsonLd.mainEntity).toStrictEqual([
      {
        '@type': 'Question',
        name: 'How many players?',
        acceptedAnswer: { '@type': 'Answer', text: 'Three to six.' },
      },
    ]);
  });
});
