import type { ReactElement } from 'react';

import { FamilyHub } from '../../../components/family/FamilyHub';

export default function FamilyPlayPage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-12">
      <FamilyHub />
    </main>
  );
}
