import { tailwindPreset } from '@lazy-patta/design-tokens/tailwind';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [tailwindPreset as unknown as Partial<Config>],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
};

export default config;
