import { join } from 'node:path';
import type { FrameworkDefinition } from '../sniffer-interface.js';

export const EXPRESS_FRAMEWORK: FrameworkDefinition = {
  name: 'express',
  label: 'Express',
  defaultInclude: ['**/*.{js,ts}'],
  sniffers: [
    { name: 'god-routes', path: join(__dirname, 'god-routes-sniffer.js') },
    { name: 'missing-error-handling', path: join(__dirname, 'missing-error-handling-sniffer.js') },
    { name: 'fat-controllers', path: join(__dirname, 'fat-controllers-sniffer.js') },
    { name: 'no-input-validation', path: join(__dirname, 'no-input-validation-sniffer.js') },
    { name: 'callback-hell', path: join(__dirname, 'callback-hell-sniffer.js') },
    { name: 'hardcoded-secrets', path: join(__dirname, 'hardcoded-secrets-sniffer.js') },
  ],
};
