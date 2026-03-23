/**
 * God Hook Sniffer
 *
 * Detects custom hooks that do too much — too many useState, useEffect,
 * or total hook calls — suggesting they should be split into smaller,
 * focused hooks with single responsibilities.
 */

import type { Detection, SnifferExport, Severity } from './sniffer-interface.js';
import {
  CUSTOM_HOOK_DECL,
  USE_STATE,
  USE_EFFECT,
  USE_CALLBACK,
  USE_MEMO,
  USE_REF,
  USE_LAYOUT_EFFECT,
  extractBracedBlock,
  findOpeningBrace,
  getLineNumber,
  countMatches,
  stripCommentsAndStrings,
} from '../utils/regex-helpers.js';

interface GodHookConfig {
  maxUseState: number;
  maxUseEffect: number;
  maxTotalHooks: number;
  severity: Severity;
}

const DEFAULT_CONFIG: GodHookConfig = {
  maxUseState: 4,
  maxUseEffect: 3,
  maxTotalHooks: 10,
  severity: 'warning',
};

function resolveConfig(config: Record<string, unknown>): GodHookConfig {
  return {
    maxUseState:
      typeof config.maxUseState === 'number' ? config.maxUseState : DEFAULT_CONFIG.maxUseState,
    maxUseEffect:
      typeof config.maxUseEffect === 'number' ? config.maxUseEffect : DEFAULT_CONFIG.maxUseEffect,
    maxTotalHooks:
      typeof config.maxTotalHooks === 'number' ? config.maxTotalHooks : DEFAULT_CONFIG.maxTotalHooks,
    severity:
      typeof config.severity === 'string' ? (config.severity as Severity) : DEFAULT_CONFIG.severity,
  };
}

function detect(
  fileContent: string,
  filePath: string,
  config: Record<string, unknown>,
): Detection[] {
  const detections: Detection[] = [];
  const cfg = resolveConfig(config);

  // Reset the global regex before use
  const hookDeclRegex = new RegExp(CUSTOM_HOOK_DECL.source, CUSTOM_HOOK_DECL.flags);

  let match: RegExpExecArray | null;

  while ((match = hookDeclRegex.exec(fileContent)) !== null) {
    const hookName = match[1] || match[2];
    const matchIndex = match.index;

    // Find the opening brace of the hook body
    const braceIndex = findOpeningBrace(fileContent, matchIndex + match[0].length);
    if (braceIndex === -1) continue;

    // Extract the full hook body
    const body = extractBracedBlock(fileContent, braceIndex);
    if (!body) continue;

    // Strip comments and strings to avoid false positives
    const strippedBody = stripCommentsAndStrings(body);

    // Count individual hook calls
    const useStateCount = countMatches(strippedBody, USE_STATE);
    const useEffectCount = countMatches(strippedBody, USE_EFFECT);
    const useCallbackCount = countMatches(strippedBody, USE_CALLBACK);
    const useMemoCount = countMatches(strippedBody, USE_MEMO);
    const useRefCount = countMatches(strippedBody, USE_REF);
    const useLayoutEffectCount = countMatches(strippedBody, USE_LAYOUT_EFFECT);

    const totalHooks =
      useStateCount +
      useEffectCount +
      useCallbackCount +
      useMemoCount +
      useRefCount +
      useLayoutEffectCount;

    // Check thresholds
    const exceedsUseState = useStateCount > cfg.maxUseState;
    const exceedsUseEffect = useEffectCount > cfg.maxUseEffect;
    const exceedsTotalHooks = totalHooks > cfg.maxTotalHooks;

    if (exceedsUseState || exceedsUseEffect || exceedsTotalHooks) {
      const line = getLineNumber(fileContent, matchIndex);

      detections.push({
        snifferName: 'god-hook',
        filePath,
        line,
        column: 1,
        message: `Hook "${hookName}" has ${useStateCount} useState, ${useEffectCount} useEffect, ${totalHooks} total hook calls`,
        severity: cfg.severity,
        suggestion:
          `**Consider splitting \`${hookName}\`:**\n` +
          `- Extract related state + effects into focused sub-hooks\n` +
          `- Each hook should have a single responsibility\n` +
          `- Use \`useReducer\` for complex related state\n` +
          `- Extract pure data transformations outside hooks`,
        details: {
          hookName,
          useStateCount,
          useEffectCount,
          useCallbackCount,
          useMemoCount,
          useRefCount,
          totalHooks,
          thresholds: {
            maxUseState: cfg.maxUseState,
            maxUseEffect: cfg.maxUseEffect,
            maxTotalHooks: cfg.maxTotalHooks,
          },
        },
      });
    }
  }

  return detections;
}

const sniffer: SnifferExport = {
  name: 'god-hook',
  description:
    'Detects custom hooks that have grown too large with too many useState, useEffect, or total hook calls, suggesting they be split into focused sub-hooks.',
  meta: {
    name: 'god-hook',
    description:
      'Detects custom hooks that have grown too large with too many useState, useEffect, or total hook calls, suggesting they be split into focused sub-hooks.',
    category: 'hooks',
    severity: 'warning',
    defaultConfig: { ...DEFAULT_CONFIG },
  },
  detect,
};

export default sniffer;
export { sniffer as godHookSniffer };
