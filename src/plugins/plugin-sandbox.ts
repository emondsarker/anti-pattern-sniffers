import type { Detection, SnifferExport } from '../sniffers/sniffer-interface.js';

const DETECTION_FIELDS: ReadonlyArray<keyof Detection> = [
  'snifferName',
  'filePath',
  'line',
  'column',
  'message',
  'severity',
  'suggestion',
  'details',
];

const REQUIRED_DETECTION_FIELDS: ReadonlyArray<keyof Detection> = [
  'snifferName',
  'filePath',
  'line',
  'message',
  'severity',
  'suggestion',
];

function stripDetection(raw: Record<string, unknown>): Detection {
  const stripped: Record<string, unknown> = {};
  for (const field of DETECTION_FIELDS) {
    if (field in raw) {
      stripped[field] = raw[field];
    }
  }
  return stripped as unknown as Detection;
}

function validateDetection(detection: unknown, index: number): string | null {
  if (detection === null || detection === undefined || typeof detection !== 'object') {
    return `Detection at index ${index} must be a non-null object`;
  }

  const det = detection as Record<string, unknown>;
  for (const field of REQUIRED_DETECTION_FIELDS) {
    if (!(field in det)) {
      return `Detection at index ${index} is missing required field "${field}"`;
    }
  }

  return null;
}

export function wrapSnifferForSandbox(snifferModule: SnifferExport): SnifferExport {
  return {
    name: snifferModule.name,
    description: snifferModule.description,
    meta: snifferModule.meta,
    detect(fileContent: string, filePath: string, config: Record<string, unknown>): Detection[] {
      try {
        // Freeze the config object before passing to detect
        const frozenConfig = Object.freeze({ ...config });

        const result = snifferModule.detect(fileContent, filePath, frozenConfig);

        // Validate the return value is an array
        if (!Array.isArray(result)) {
          return [
            {
              snifferName: snifferModule.name,
              filePath,
              line: 0,
              column: 0,
              message: `Plugin "${snifferModule.name}" detect() did not return an array`,
              severity: 'error',
              suggestion: 'Fix the plugin to return an array of Detection objects',
            },
          ];
        }

        // Validate each Detection and strip unexpected properties
        const sanitized: Detection[] = [];
        for (let i = 0; i < result.length; i++) {
          const validationError = validateDetection(result[i], i);
          if (validationError !== null) {
            sanitized.push({
              snifferName: snifferModule.name,
              filePath,
              line: 0,
              column: 0,
              message: `Plugin "${snifferModule.name}": ${validationError}`,
              severity: 'error',
              suggestion: 'Fix the plugin to return valid Detection objects',
            });
          } else {
            sanitized.push(stripDetection(result[i] as unknown as Record<string, unknown>));
          }
        }

        return sanitized;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return [
          {
            snifferName: snifferModule.name,
            filePath,
            line: 0,
            column: 0,
            message: `Plugin "${snifferModule.name}" threw an error: ${message}`,
            severity: 'error',
            suggestion: 'Check the plugin for runtime errors',
          },
        ];
      }
    },
  };
}
