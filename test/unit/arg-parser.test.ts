import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../src/cli/arg-parser.js';

describe('arg-parser — --key=value format', () => {
  it('parses --key=value into flags', () => {
    const result = parseArgs(['--format=json']);
    assert.equal(result.flags.format, 'json');
  });
});

describe('arg-parser — --key value format', () => {
  it('parses --key value (next token as value)', () => {
    const result = parseArgs(['--format', 'json']);
    assert.equal(result.flags.format, 'json');
  });
});

describe('arg-parser — boolean flags', () => {
  it('parses --flag as boolean true', () => {
    const result = parseArgs(['--help']);
    assert.equal(result.flags.help, true);
  });
});

describe('arg-parser — --no- negation', () => {
  it('parses --no-parallel as false', () => {
    const result = parseArgs(['--no-parallel']);
    assert.equal(result.flags.parallel, false);
  });
});

describe('arg-parser — short aliases', () => {
  it('expands -c to --config', () => {
    const result = parseArgs(['-c', 'myconfig.json']);
    assert.equal(result.flags.config, 'myconfig.json');
  });

  it('expands -d to --dir', () => {
    const result = parseArgs(['-d', 'src']);
    assert.equal(result.flags.dir, 'src');
  });

  it('expands -h to --help (boolean)', () => {
    const result = parseArgs(['-h']);
    assert.equal(result.flags.help, true);
  });

  it('expands -f to --format', () => {
    const result = parseArgs(['-f', 'json']);
    assert.equal(result.flags.format, 'json');
  });

  it('expands -s to --sniffers', () => {
    const result = parseArgs(['-s', 'prop-explosion']);
    assert.equal(result.flags.sniffers, 'prop-explosion');
  });
});

describe('arg-parser — positionals', () => {
  it('collects positional arguments', () => {
    const result = parseArgs(['file1.jsx', 'file2.tsx']);
    assert.deepEqual(result.positionals, ['file1.jsx', 'file2.tsx']);
  });
});

describe('arg-parser — mixed flags and positionals', () => {
  it('handles flags and positionals together', () => {
    const result = parseArgs(['--format', 'json', 'myfile.jsx', '--help']);
    assert.equal(result.flags.format, 'json');
    assert.equal(result.flags.help, true);
    assert.deepEqual(result.positionals, ['myfile.jsx']);
  });
});

describe('arg-parser — multiple flags', () => {
  it('handles multiple different flags', () => {
    const result = parseArgs(['--format=json', '--workers', '4', '--parallel']);
    assert.equal(result.flags.format, 'json');
    assert.equal(result.flags.workers, '4');
    assert.equal(result.flags.parallel, true);
  });
});

describe('arg-parser — empty argv', () => {
  it('returns empty flags and positionals for empty argv', () => {
    const result = parseArgs([]);
    assert.deepEqual(result.flags, {});
    assert.deepEqual(result.positionals, []);
  });
});

describe('arg-parser — consecutive boolean flags', () => {
  it('treats --flag followed by another --flag as both boolean', () => {
    const result = parseArgs(['--help', '--version']);
    assert.equal(result.flags.help, true);
    assert.equal(result.flags.version, true);
  });
});

describe('arg-parser — --workers as string value', () => {
  it('parses --workers 8 as string "8"', () => {
    const result = parseArgs(['--workers', '8']);
    assert.equal(result.flags.workers, '8');
  });
});

describe('arg-parser — --sniffers as string value', () => {
  it('parses --sniffers with comma-separated list', () => {
    const result = parseArgs(['--sniffers', 'prop-explosion,god-hook']);
    assert.equal(result.flags.sniffers, 'prop-explosion,god-hook');
  });
});
