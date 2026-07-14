import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { GameLobby } from '../components/home/GameLobby';
import { siteConfig } from '../lib/site-config';

const HOME_TITLE = 'Lazy Patta — Play Desi Indian Card Games Online';
const HOME_DESCRIPTION =
  'Play Gadha Chor, Gulaam Chor, Lal Satti, Badam Saat, and traditional Indian family card games online. Guest play, private family rooms, English, Gujarati, and Hindi.';

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: '/',
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

// WebSite structured data. Only facts we can honestly assert — no ratings,
// review counts, or download totals.
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  alternateName: ['Lazy Patta Desi Card Games', 'Lazy Patta Indian Card Games'],
  url: `${siteConfig.canonicalOrigin}/`,
} as const;

export default function HomePage(): ReactElement {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <GameLobby />
    </>
  );
}
