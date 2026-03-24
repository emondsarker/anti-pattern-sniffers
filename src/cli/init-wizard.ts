import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { FrameworkDefinition } from '../sniffers/sniffer-interface.js';
import { REACT_FRAMEWORK } from '../sniffers/react/index.js';
import { EXPRESS_FRAMEWORK } from '../sniffers/express/index.js';
import { NESTJS_FRAMEWORK } from '../sniffers/nestjs/index.js';

// ANSI codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const WHITE = '\x1b[37m';

const ALL_FRAMEWORKS: FrameworkDefinition[] = [
  REACT_FRAMEWORK,
  EXPRESS_FRAMEWORK,
  NESTJS_FRAMEWORK,
];

// Framework descriptions for the wizard
const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  react: 'Components, hooks, and JSX patterns',
  express: 'Routes, middleware, and controllers',
  nestjs: 'Services, DTOs, guards, and decorators',
};

// Sniffer descriptions for the wizard
const SNIFFER_DESCRIPTIONS: Record<string, string> = {
  // React
  'prop-explosion': 'Components with too many props',
  'god-hook': 'Custom hooks that do too much',
  'prop-drilling': 'Props passed through without being used',
  // Express
  'god-routes': 'Too many route handlers in one file',
  'missing-error-handling': 'Async handlers without error handling',
  'fat-controllers': 'Route handlers with too much logic',
  'no-input-validation': 'Request input used without validation',
  'callback-hell': 'Deeply nested callbacks',
  'hardcoded-secrets': 'Credentials hardcoded in source',
  // NestJS
  'god-service': 'Services with too many dependencies/methods',
  'missing-dtos': 'Endpoints without proper DTOs/validation',
  'business-logic-in-controllers': 'Business logic that belongs in services',
  'missing-guards': 'Routes without authentication guards',
  'magic-strings': 'Repeated string literals instead of enums',
};

interface WizardState {
  selectedFrameworks: Set<string>;
  enabledSniffers: Record<string, boolean>;
  detectedFrameworks: string[];
}

/**
 * Detect which frameworks a project uses by scanning package.json dependencies.
 */
function detectFrameworks(cwd: string): string[] {
  const detected: string[] = [];
  const pkgPath = join(cwd, 'package.json');

  if (!existsSync(pkgPath)) return detected;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    if (allDeps['react'] || allDeps['react-dom']) detected.push('react');
    if (allDeps['express']) detected.push('express');
    if (allDeps['@nestjs/core']) detected.push('nestjs');
  } catch {
    // Ignore parse errors
  }

  return detected;
}

/**
 * Prompt user with a question and return their answer.
 */
function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

/**
 * Generate the .snifferrc.json content from wizard selections.
 */
function generateConfig(state: WizardState): Record<string, unknown> {
  const frameworks = [...state.selectedFrameworks];
  const includePatterns: string[] = [];

  for (const fwName of frameworks) {
    const fw = ALL_FRAMEWORKS.find(f => f.name === fwName);
    if (fw) {
      includePatterns.push(...fw.defaultInclude);
    }
  }

  // Deduplicate include patterns
  const uniqueInclude = [...new Set(includePatterns)];

  // Build sniffer config
  const sniffers: Record<string, Record<string, unknown>> = {};
  for (const fwName of frameworks) {
    const fw = ALL_FRAMEWORKS.find(f => f.name === fwName);
    if (!fw) continue;

    for (const sniffer of fw.sniffers) {
      const key = sniffer.name;
      const enabled = state.enabledSniffers[`${fwName}/${key}`] !== false;
      sniffers[key] = {
        enabled,
        severity: 'warning',
        ...(sniffer.defaultConfig || {}),
      };
    }
  }

  return {
    frameworks,
    include: uniqueInclude,
    exclude: ['node_modules', 'dist', 'build', '**/*.test.*', '**/*.spec.*'],
    parallel: true,
    maxWorkers: 4,
    timeoutMs: 30000,
    outputFormat: 'markdown',
    sniffers,
    plugins: [],
  };
}

/**
 * Run the interactive setup wizard.
 */
export async function runInitWizard(): Promise<void> {
  const cwd = process.cwd();
  const configPath = join(cwd, '.snifferrc.json');

  // Check for existing config
  if (existsSync(configPath)) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await ask(rl, `${YELLOW}${BOLD}.snifferrc.json already exists.${RESET} Overwrite? ${DIM}(y/N)${RESET} `);
    if (answer.toLowerCase() !== 'y') {
      console.log(`${DIM}Aborted.${RESET}`);
      rl.close();
      return;
    }
    rl.close();
  }

  console.log('');
  console.log(`  ${MAGENTA}${BOLD}Anti-Pattern Sniffer${RESET} ${DIM}— Setup Wizard${RESET}`);
  console.log('');

  // Detect frameworks
  const detected = detectFrameworks(cwd);
  if (detected.length > 0) {
    console.log(`  ${GREEN}${BOLD}Detected:${RESET} ${detected.map(d => {
      const fw = ALL_FRAMEWORKS.find(f => f.name === d);
      return fw ? fw.label : d;
    }).join(', ')}`);
    console.log('');
  }

  const state: WizardState = {
    selectedFrameworks: new Set<string>(),
    enabledSniffers: {},
    detectedFrameworks: detected,
  };

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  // Step 1: Select frameworks
  console.log(`  ${BOLD}Which framework(s) does this project use?${RESET}`);
  console.log('');

  for (const fw of ALL_FRAMEWORKS) {
    const isDetected = detected.includes(fw.name);
    const defaultMark = isDetected ? `${GREEN} (detected)${RESET}` : '';
    const snifferCount = fw.sniffers.length;

    console.log(`    ${BOLD}${fw.label}${RESET}${defaultMark} — ${DIM}${FRAMEWORK_DESCRIPTIONS[fw.name] || ''} (${snifferCount} sniffers)${RESET}`);
  }

  console.log('');
  const defaultAnswer = detected.length > 0 ? detected.join(',') : 'react';
  const fwAnswer = await ask(rl, `  ${CYAN}Frameworks${RESET} ${DIM}(comma-separated, default: ${defaultAnswer})${RESET}: `);

  const selectedNames = (fwAnswer || defaultAnswer).split(',').map(s => s.trim().toLowerCase());
  for (const name of selectedNames) {
    if (ALL_FRAMEWORKS.some(f => f.name === name)) {
      state.selectedFrameworks.add(name);
    } else {
      console.log(`  ${YELLOW}Unknown framework "${name}", skipping${RESET}`);
    }
  }

  if (state.selectedFrameworks.size === 0) {
    state.selectedFrameworks.add('react');
  }

  console.log('');
  console.log(`  ${GREEN}${BOLD}Selected:${RESET} ${[...state.selectedFrameworks].join(', ')}`);
  console.log('');

  // Step 2: Configure sniffers per framework
  for (const fwName of state.selectedFrameworks) {
    const fw = ALL_FRAMEWORKS.find(f => f.name === fwName)!;
    console.log(`  ${BOLD}${fw.label} Sniffers:${RESET}`);
    console.log('');

    for (const sniffer of fw.sniffers) {
      const desc = SNIFFER_DESCRIPTIONS[sniffer.name] || sniffer.name;
      console.log(`    ${WHITE}${sniffer.name}${RESET} — ${DIM}${desc}${RESET}`);
    }

    console.log('');
    const disableAnswer = await ask(rl, `  ${CYAN}Disable any?${RESET} ${DIM}(comma-separated names, or press Enter to keep all)${RESET}: `);

    if (disableAnswer) {
      const toDisable = disableAnswer.split(',').map(s => s.trim());
      for (const name of toDisable) {
        state.enabledSniffers[`${fwName}/${name}`] = false;
        console.log(`    ${DIM}Disabled: ${name}${RESET}`);
      }
    }

    console.log('');
  }

  // Step 3: Generate and write config
  const config = generateConfig(state);
  const configJson = JSON.stringify(config, null, 2);

  console.log(`  ${BOLD}Generated .snifferrc.json:${RESET}`);
  console.log('');

  // Print with subtle coloring
  for (const line of configJson.split('\n')) {
    console.log(`  ${DIM}${line}${RESET}`);
  }

  console.log('');
  const confirmAnswer = await ask(rl, `  ${CYAN}Write to .snifferrc.json?${RESET} ${DIM}(Y/n)${RESET}: `);

  if (confirmAnswer.toLowerCase() === 'n') {
    console.log(`  ${DIM}Aborted. Config not written.${RESET}`);
  } else {
    writeFileSync(configPath, configJson + '\n', 'utf8');
    console.log(`  ${GREEN}${BOLD}Done!${RESET} Config written to ${DIM}.snifferrc.json${RESET}`);
    console.log('');
    console.log(`  ${DIM}Run ${WHITE}aps${DIM} or ${WHITE}aps -i${DIM} to start scanning.${RESET}`);
  }

  console.log('');
  rl.close();
}

// Export for testing
export { detectFrameworks, generateConfig };
export type { WizardState };
