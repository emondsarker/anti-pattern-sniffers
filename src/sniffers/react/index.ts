import { join } from 'node:path';
import type { FrameworkDefinition } from '../sniffer-interface.js';

export const REACT_FRAMEWORK: FrameworkDefinition = {
  name: 'react',
  label: 'React',
  defaultInclude: ['**/*.{jsx,tsx}'],
  sniffers: [
    { name: 'prop-explosion', path: join(__dirname, 'prop-explosion-sniffer.js') },
    { name: 'god-hook', path: join(__dirname, 'god-hook-sniffer.js') },
    { name: 'prop-drilling', path: join(__dirname, 'prop-drilling-sniffer.js') },
  ],
};
