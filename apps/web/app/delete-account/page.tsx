import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { LegalPage } from '../../components/legal/LegalPage';
import { siteConfig } from '../../lib/site-config';

const TITLE = 'Delete Your Account';
const DESCRIPTION = `How to permanently delete your ${siteConfig.name} account and associated data.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/delete-account' },
  openGraph: {
    title: `${TITLE} | ${siteConfig.name}`,
    description: DESCRIPTION,
    url: '/delete-account',
  },
};

export default function DeleteAccountPage(): ReactElement {
  return (
    <LegalPage title={TITLE}>
      <p>
        You can permanently delete your {siteConfig.name} account and the data associated with it at
        any time.
      </p>
      <p>
        To request deletion, email{' '}
        <a
          className="font-semibold text-action-primary underline"
          href={`mailto:${siteConfig.supportEmail}`}
        >
          {siteConfig.supportEmail}
        </a>{' '}
        from the address on your account with the subject “Delete my account”. We will remove your
        profile, room memberships, and personal data.
      </p>
      <p>
        Guest play does not create a stored account. Deleting the app or clearing your browser
        removes local guest data.
      </p>
      <p>
        This page exists as the stable deletion URL required by the App Store and Google Play. An
        in-app self-service deletion flow will replace the email step before store submission.
      </p>
    </LegalPage>
  );
}
