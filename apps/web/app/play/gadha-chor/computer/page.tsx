import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { ComputerGameExperience } from '../../../../components/game/ComputerGameExperience';

import './computer-game.css';

export const metadata: Metadata = {
  title: 'Play Computer | Lazy Patta',
};

export default function ComputerGamePage(): ReactElement {
  return <ComputerGameExperience />;
}
