import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function printHelp(): void {
  const help = `
Usage: aps [options] [dir]
       sniff [options] [dir]

Detect anti-patterns in your codebase (React, Express, NestJS).

Commands:
  init                         Run setup wizard to configure frameworks

Options:
  -d, --dir <path>         Target directory to scan (default: cwd)
  -c, --config <path>      Path to config file (default: .snifferrc.json)
  -s, --sniffers <list>    Comma-separated list of sniffers to run
  -f, --format <type>      Output format: markdown | json (default: markdown)
  -o, --output <path>      Write report to file instead of stdout
  -w, --workers <n>        Number of worker threads (default: 4)
  -i, --interactive        Launch interactive TUI to browse results
  -b, --batch <n>          Limit output to first N issues (default: 10)
      --parallel           Enable parallel execution (default: true)
      --no-parallel        Disable parallel execution
      --verbose            Show debug output
  -q, --quiet              Suppress all output (exit code only)
  -h, --help               Show this help message
  -v, --version            Show version number

Workspace:
  -W, --workspace          Force workspace/monorepo mode
      --no-workspace       Force single-project mode
      --packages <dirs>    Comma-separated package directories
      --package-filter <p> Only scan packages matching pattern

Examples:
  aps                                    Scan current directory
  aps src/                               Scan specific directory
  aps -i                                 Interactive mode
  aps -i -b 20                           Interactive, show first 20 issues
  aps --sniffers prop-explosion          Run only prop explosion sniffer
  aps --format json -o report.json       Output JSON report to file
  aps init                               Setup wizard

Frameworks:
  react      Prop explosion, god hook, prop drilling
  express    God routes, missing error handling, fat controllers, and more
  nestjs     God service, missing DTOs, business logic in controllers, and more

Configuration:
  Create a .snifferrc.json in your project root or run 'aps init'.
`.trim();

  console.log(help);
}

export function printVersion(): void {
  try {
    const pkgPath = join(__dirname, '..', '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    console.log(`anti-pattern-sniffer v${pkg.version}`);
  } catch {
    console.log('anti-pattern-sniffer (unknown version)');
  }
}
