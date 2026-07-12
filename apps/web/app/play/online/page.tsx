import type { ReactElement } from 'react';

import { OnlineHub } from '../../../components/rooms/OnlineHub';

export default function OnlinePlayPage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-12">
      <OnlineHub />
    </main>
  );
}
