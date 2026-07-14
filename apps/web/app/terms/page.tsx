import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { LegalPage } from '../../components/legal/LegalPage';
import { siteConfig } from '../../lib/site-config';

const TITLE = 'Terms of Service';
const DESCRIPTION = `The terms for using ${siteConfig.name}, a platform for Desi family card games.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: { title: `${TITLE} | ${siteConfig.name}`, description: DESCRIPTION, url: '/terms' },
};

export default function TermsPage(): ReactElement {
  return (
    <LegalPage title={TITLE}>
      <p>
        By using {siteConfig.name} you agree to play fairly and to treat other players — usually
        your own family and friends — with respect.
      </p>
      <p>
        {siteConfig.name} is provided for entertainment. It is not a gambling service: there is no
        wagering, no cash prizes, and no purchasable coins.
      </p>
      <p>
        The service is offered “as is” while we build toward a full launch. Features may change, and
        private rooms are intended for people you know.
      </p>
      <p>
        For questions about these terms, contact{' '}
        <a
          className="font-semibold text-action-primary underline"
          href={`mailto:${siteConfig.supportEmail}`}
        >
          {siteConfig.supportEmail}
        </a>
        .
      </p>
    </LegalPage>
  );
}
