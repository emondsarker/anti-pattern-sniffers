export interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positionals: string[];
}

const SHORT_ALIASES: Record<string, string> = {
  '-c': '--config',
  '-d': '--dir',
  '-f': '--format',
  '-o': '--output',
  '-s': '--sniffers',
  '-w': '--workers',
  '-h': '--help',
  '-v': '--version',
  '-q': '--quiet',
  '-i': '--interactive',
  '-b': '--batch',
};

/**
 * Parse CLI arguments with zero dependencies.
 * Supports: --key=value, --key value, --boolean, --no-x (negation), -short aliases
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  let i = 0;
  while (i < argv.length) {
    let token = argv[i];

    // Expand short aliases
    if (SHORT_ALIASES[token]) {
      token = SHORT_ALIASES[token];
    }

    if (token.startsWith('--no-')) {
      // Negation: --no-parallel => parallel = false
      const key = token.substring(5);
      flags[key] = false;
      i++;
    } else if (token.startsWith('--')) {
      const eqIndex = token.indexOf('=');
      if (eqIndex !== -1) {
        // --key=value
        const key = token.substring(2, eqIndex);
        const value = token.substring(eqIndex + 1);
        flags[key] = value;
        i++;
      } else {
        const key = token.substring(2);
        const next = argv[i + 1];
        // If next token exists and doesn't start with -, it's the value
        if (next !== undefined && !next.startsWith('-')) {
          flags[key] = next;
          i += 2;
        } else {
          // Boolean flag
          flags[key] = true;
          i++;
        }
      }
    } else if (token.startsWith('-') && token.length === 2) {
      // Single-char flag not in aliases
      const key = token.substring(1);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      positionals.push(token);
      i++;
    }
  }

  return { flags, positionals };
}
