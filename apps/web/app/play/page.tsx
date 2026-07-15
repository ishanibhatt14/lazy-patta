import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { PlayLauncher } from '../../components/home/PlayLauncher';

export const metadata: Metadata = {
  title: 'Play Lazy Patta',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlayPage(): ReactElement {
  return <PlayLauncher />;
}
