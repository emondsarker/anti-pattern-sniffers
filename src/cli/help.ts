import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function printHelp(): void {
  const help = `
Usage: react-sniff [options] [dir]

Detect React anti-patterns in your codebase.

Options:
  -d, --dir <path>         Target directory to scan (default: cwd)
  -c, --config <path>      Path to config file (default: .snifferrc.json)
  -s, --sniffers <list>    Comma-separated list of sniffers to run
  -f, --format <type>      Output format: markdown | json (default: markdown)
  -o, --output <path>      Write report to file instead of stdout
  -w, --workers <n>        Number of worker threads (default: 4)
  -i, --interactive        Launch interactive TUI to browse results
  -b, --batch <n>          Show first N issues in interactive mode (default: 10)
      --parallel           Enable parallel execution (default: true)
      --no-parallel         Disable parallel execution
      --verbose            Show debug output
  -q, --quiet              Suppress all output (exit code only)
  -h, --help               Show this help message
  -v, --version            Show version number

Examples:
  react-sniff                              Scan current directory
  react-sniff src/                         Scan specific directory
  ras -i                                   Interactive mode
  ras -i -b 20                             Interactive, show first 20 issues
  react-sniff --sniffers prop-explosion    Run only prop explosion sniffer
  react-sniff --format json -o report.json Output JSON report to file
  ras --no-parallel --verbose              Run sequentially with debug output

Sniffers:
  prop-explosion   Detects components with too many props
  god-hook         Detects custom hooks that do too much
  prop-drilling    Detects props passed through without being used

Configuration:
  Create a .snifferrc.json in your project root to customize thresholds.
  See https://github.com/your-repo/react-anti-pattern-sniffer for details.
`.trim();

  console.log(help);
}

export function printVersion(): void {
  try {
    const pkgPath = join(__dirname, '..', '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    console.log(`react-anti-pattern-sniffer v${pkg.version}`);
  } catch {
    console.log('react-anti-pattern-sniffer (unknown version)');
  }
}
