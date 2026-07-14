import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { LegalPage } from '../../components/legal/LegalPage';
import { siteConfig } from '../../lib/site-config';

const TITLE = 'Privacy Policy';
const DESCRIPTION = `How ${siteConfig.name} handles your data. We are not a gambling app — no cash, no betting.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/privacy' },
  openGraph: { title: `${TITLE} | ${siteConfig.name}`, description: DESCRIPTION, url: '/privacy' },
};

export default function PrivacyPage(): ReactElement {
  return (
    <LegalPage title={TITLE}>
      <p>
        {siteConfig.name} is a platform for traditional Indian family card games. It is not a
        gambling product — there is no cash, betting, coins, or casino mechanics.
      </p>
      <p>
        We collect the minimum needed to run gameplay: a guest or account identifier, your chosen
        display name, and the rooms you create or join. Guest play works without an account.
      </p>
      <p>
        Accounts use email-based sign-in through our authentication provider. We do not sell your
        personal data.
      </p>
      <p>
        You can request deletion of your account and associated data at any time — see{' '}
        <a className="font-semibold text-action-primary underline" href="/delete-account">
          Delete your account
        </a>
        .
      </p>
      <p>
        Questions? Email{' '}
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
