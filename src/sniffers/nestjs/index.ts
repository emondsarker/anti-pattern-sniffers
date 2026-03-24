import { join } from 'node:path';
import type { FrameworkDefinition } from '../sniffer-interface.js';

export const NESTJS_FRAMEWORK: FrameworkDefinition = {
  name: 'nestjs',
  label: 'NestJS',
  defaultInclude: ['**/*.ts'],
  sniffers: [
    { name: 'god-service', path: join(__dirname, 'god-service-sniffer.js') },
    { name: 'missing-dtos', path: join(__dirname, 'missing-dtos-sniffer.js') },
    { name: 'business-logic-in-controllers', path: join(__dirname, 'business-logic-in-controllers-sniffer.js') },
    { name: 'missing-guards', path: join(__dirname, 'missing-guards-sniffer.js') },
    { name: 'magic-strings', path: join(__dirname, 'magic-strings-sniffer.js') },
  ],
};
