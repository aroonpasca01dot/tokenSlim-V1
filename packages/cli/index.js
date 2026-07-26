#!/usr/bin/env node

/**
 * TokenSlim CLI v1.1.0
 * =====================
 * Compress AI prompts from terminal.
 *
 * Usage:
 *   tokenslim "your long prompt here"
 *   echo "long prompt" | tokenslim
 *   tokenslim --file prompt.txt
 *   tokenslim --level 3 "prompt"
 *   tokenslim --analyze "prompt"
 *
 * Options:
 *   -l, --level <1-4>  Compression level (default: 2)
 *   -a, --analyze      Show analysis for all levels
 *   -f, --file <path>  Read from file
 *   -s, --stats        Show token statistics
 *   -r, --raw          Raw output only (no stats, no progress bar)
 *   -v, --version      Show version
 *   -h, --help         Show help
 */

const fs = require('fs');

let TokenSlimCore;
try {
  // Published package layout
  ({ TokenSlimCore } = require('@tokenslim/core'));
} catch (e) {
  // Monorepo layout
  ({ TokenSlimCore } = require('../core/index.js'));
}

const core = new TokenSlimCore();
const pkg = require('./package.json');

const LEVEL_NAMES = {
  1: 'Mild (safest)',
  2: 'Normal ⭐',
  3: 'Aggressive',
  4: 'Extreme'
};

/** Print CLI usage help. */
function showHelp() {
  console.log(`
╔══════════════════════════════════════════╗
║        TokenSlim CLI v${pkg.version}             ║
║     ⚡ AI Prompt Compressor              ║
╚══════════════════════════════════════════╝

Usage:
  $ tokenslim "your long prompt here"
  $ echo "long prompt" | tokenslim
  $ tokenslim --file prompt.txt

Options:
  -l, --level <1-4>  Compression level (default: 2)
  -a, --analyze      Show analysis for all levels
  -f, --file <path>  Read from file instead of stdin/args
  -s, --stats        Show token statistics
  -r, --raw          Raw output only (no stats, no progress bar)
  -v, --version      Show version
  -h, --help         Show this help

Compression Levels (typical savings on verbose prompts):
  1 = Mild       ~5-15%  — Safest, preserves wording
  2 = Normal     ~10-25% — Balanced (recommended)
  3 = Aggressive ~25-45% — Max savings for long prompts
  4 = Extreme    ~40-60% — Drastic (for internal/context text)

Examples:
  $ tokenslim "Generate a Python function that sorts numbers"
  $ tokenslim -l 3 -s "Please write a function for me"
  $ cat prompt.txt | tokenslim --level 4 --stats
`);
}

/** Print the CLI version. */
function showVersion() {
  console.log(`TokenSlim CLI v${pkg.version}`);
}

/**
 * Print token statistics for a compression result.
 * @param {{original:number,compressed:number,saved:number,percent:number}} stats
 * @param {number} level compression level used
 */
function printStats(stats, level) {
  const label = LEVEL_NAMES[level] || `Level ${level}`;
  console.log('');
  console.log(`  📊 Level ${level}: ${label}`);
  console.log(`     Original:   ${String(stats.original).padStart(5)} tokens (est.)`);
  console.log(`     Compressed: ${String(stats.compressed).padStart(5)} tokens (est.)`);
  console.log(`     Saved:      ${String(stats.saved).padStart(5)} tokens (${stats.percent}%)`);
  console.log('');
}

/** Parse argv, resolve the input source, and dispatch processing. */
function main() {
  const args = process.argv.slice(2);

  const opts = {
    level: 2,
    showStats: false,
    analyze: false,
    raw: false,
    filePath: null,
    textArgs: []
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-l':
      case '--level':
        opts.level = parseInt(args[++i], 10);
        if (isNaN(opts.level) || opts.level < 1 || opts.level > 4) {
          console.error('❌ Level must be 1-4');
          process.exit(1);
        }
        break;
      case '-s':
      case '--stats':
        opts.showStats = true;
        break;
      case '-a':
      case '--analyze':
        opts.analyze = true;
        break;
      case '-f':
      case '--file':
        opts.filePath = args[++i];
        if (!opts.filePath) {
          console.error('❌ --file requires a path');
          process.exit(1);
        }
        break;
      case '-r':
      case '--raw':
        opts.raw = true;
        break;
      case '-v':
      case '--version':
        showVersion();
        return;
      case '-h':
      case '--help':
        showHelp();
        return;
      default:
        if (arg.startsWith('-') && arg !== '-') {
          console.error(`❌ Unknown option: ${arg}`);
          process.exit(1);
        }
        opts.textArgs.push(arg);
    }
  }

  if (opts.filePath) {
    let text;
    try {
      text = fs.readFileSync(opts.filePath, 'utf-8');
    } catch (e) {
      console.error(`❌ Cannot read file: ${opts.filePath}`);
      process.exit(1);
    }
    processText(text, opts);
  } else if (opts.textArgs.length > 0) {
    processText(opts.textArgs.join(' '), opts);
  } else if (!process.stdin.isTTY) {
    readStdin(opts);
  } else if (args.length === 0) {
    showHelp();
  } else {
    console.error('❌ No input text provided');
    console.error('   Usage: tokenslim "your prompt here"');
    console.error('   Or pipe: echo "prompt" | tokenslim');
    process.exit(1);
  }
}

/**
 * Buffer stdin fully, then process it with the parsed options.
 * @param {{level:number,showStats:boolean,analyze:boolean,raw:boolean}} opts
 */
function readStdin(opts) {
  let buffer = '';
  process.stdin.on('data', (chunk) => {
    buffer += chunk.toString();
  });
  process.stdin.on('end', () => {
    processText(buffer.trim(), opts);
  });
}

/**
 * Compress (or analyze) the text and print results per options.
 * @param {string} text input prompt
 * @param {{level:number,showStats:boolean,analyze:boolean,raw:boolean}} opts
 */
function processText(text, opts) {
  if (!text || text.length === 0) {
    console.error('❌ Empty input');
    process.exit(1);
  }

  if (opts.analyze) {
    const analysis = core.analyze(text);
    console.log('\n  📈 TokenSlim Analysis');
    console.log('  ─────────────────────');
    analysis.levels.forEach(l => {
      console.log(`  Level ${l.level} (${l.name}): ${l.original} → ${l.compressed} tokens (save ${l.percent}%)`);
    });
    console.log(`  ─────────────────────`);
    console.log(`  ✅ Recommended: Level ${analysis.recommendation}\n`);

    const result = core.compress(text, analysis.recommendation);
    console.log('  Optimized output:');
    console.log('');
    console.log(result.compressed);
    console.log('');
    return;
  }

  const result = core.compress(text, opts.level);

  if (opts.raw) {
    console.log(result.compressed);
    return;
  }

  if (opts.showStats) {
    printStats(result.stats, opts.level);
  }
  console.log(result.compressed);

  if (!opts.showStats) {
    const bar = createBar(result.stats.percent, 20);
    process.stderr.write(`  💰 Saved ${result.stats.percent}% (${result.stats.saved} tokens) ${bar}\n`);
  }
}

/**
 * Render a textual progress bar.
 * @param {number} percent 0-100
 * @param {number} width bar width in characters
 * @returns {string}
 */
function createBar(percent, width) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// Run
main();
