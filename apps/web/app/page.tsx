import type { ReactElement } from 'react';

import { GameLobby } from '../components/home/GameLobby';
import { JsonLd } from '../components/seo/JsonLd';
import { organizationJsonLd, websiteJsonLd } from '../lib/seo/structured-data';

export default function HomePage(): ReactElement {
  return (
    <>
      <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
      <GameLobby />
    </>
  );
}
