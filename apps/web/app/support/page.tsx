import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { LegalPage } from '../../components/legal/LegalPage';
import { siteConfig } from '../../lib/site-config';

const TITLE = 'Support';
const DESCRIPTION = `Get help with ${siteConfig.name} — Gadha Chor, Lal Satti, and private family rooms.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/support' },
  openGraph: { title: `${TITLE} | ${siteConfig.name}`, description: DESCRIPTION, url: '/support' },
};

export default function SupportPage(): ReactElement {
  return (
    <LegalPage title={TITLE}>
      <p>
        Need help with {siteConfig.name}? We are happy to assist with gameplay, private rooms, and
        account questions.
      </p>
      <p>
        Email us at{' '}
        <a
          className="font-semibold text-action-primary underline"
          href={`mailto:${siteConfig.supportEmail}`}
        >
          {siteConfig.supportEmail}
        </a>{' '}
        and we will get back to you.
      </p>
      <p>
        To remove your account and data, visit{' '}
        <a className="font-semibold text-action-primary underline" href="/delete-account">
          Delete your account
        </a>
        .
      </p>
    </LegalPage>
  );
}
