import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Detect frameworks by checking package.json dependencies and framework config files.
 * Returns array of framework names: 'react', 'express', 'nestjs'
 */
export function detectFrameworks(dir: string): string[] {
  const detected: string[] = [];
  const pkgPath = join(dir, 'package.json');

  if (existsSync(pkgPath)) {
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
      // ignore parse errors
    }
  }

  // Also check for framework config files
  if (existsSync(join(dir, 'next.config.js')) || existsSync(join(dir, 'next.config.mjs')) || existsSync(join(dir, 'next.config.ts'))) {
    if (!detected.includes('react')) detected.push('react');
  }
  if (existsSync(join(dir, 'nest-cli.json'))) {
    if (!detected.includes('nestjs')) detected.push('nestjs');
  }
  if (existsSync(join(dir, 'vite.config.ts')) || existsSync(join(dir, 'vite.config.js'))) {
    // Vite could be React, but we already check react dep above — this is just a hint
  }

  return detected;
}
