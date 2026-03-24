---
description: Performance benchmark sniffers by running detect() against large synthetic input and measuring execution time
---

Benchmark sniffer performance. Target: `$ARGUMENTS` (leave empty to benchmark all sniffers).

## Step 1: Build the project

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && npx tsc
```

## Step 2: Discover sniffers to benchmark

If `$ARGUMENTS` is provided, locate that specific sniffer. Otherwise, find all sniffers by reading:
- `src/sniffers/react/index.ts`
- `src/sniffers/express/index.ts`
- `src/sniffers/nestjs/index.ts`

Also check for any root-level sniffers in `src/sniffers/` (e.g., `god-hook-sniffer.ts`, `prop-drilling-sniffer.ts`, `prop-explosion-sniffer.ts`).

Build a list of all sniffer module paths (using the `dist/` compiled versions with `.js` extension).

## Step 3: Run benchmarks

For each sniffer, run a benchmark using `node -e` with inline JavaScript. The benchmark should:
1. Load the sniffer module
2. Generate a large synthetic input of approximately 10,000 lines that contains patterns the sniffer would detect (React components with props, hooks, nested components, etc.)
3. Run `detect()` 100 times in a loop
4. Measure total time using `performance.now()` (available via `require('perf_hooks')`)
5. Calculate average time per run and operations per second

Example benchmark script structure:

```bash
cd /home/emon/personal/react-anti-pattern-sniffer && node -e "
const { performance } = require('perf_hooks');
const mod = require('./dist/src/sniffers/<framework>/<name>-sniffer.js');
const sniffer = mod.default || mod;

// Generate synthetic input (~10K lines)
let code = '';
for (let i = 0; i < 500; i++) {
  code += 'function Component' + i + '(props) {\n';
  for (let j = 0; j < 18; j++) {
    code += '  const val' + j + ' = props.item' + j + ';\n';
  }
  code += '  return <div>{val0}</div>;\n}\n';
}

const config = sniffer.meta.defaultConfig;
const iterations = 100;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  sniffer.detect(code, 'test.tsx', config);
}
const elapsed = performance.now() - start;
const avg = elapsed / iterations;
const opsPerSec = (1000 / avg).toFixed(1);
console.log(JSON.stringify({ name: sniffer.name, avgMs: avg.toFixed(2), opsPerSec, status: avg > 10 ? 'SLOW' : 'OK' }));
"
```

Run each sniffer's benchmark separately so a crash in one does not affect others.

## Step 4: Present results

Format results as a table:

| Sniffer | Avg (ms) | Ops/sec | Status |
|---------|----------|---------|--------|

Flag any sniffer averaging over 10ms per run as **SLOW**.

## Step 5: Optimization suggestions

For any sniffer flagged as SLOW, read its source code and suggest specific optimizations:
- Replacing global regex with sticky or indexed approaches
- Reducing unnecessary string copies or splits
- Caching compiled regex patterns
- Using early-exit conditions to skip files that clearly do not match
- Avoiding repeated `stripCommentsAndStrings()` calls
