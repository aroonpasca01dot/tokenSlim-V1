#!/usr/bin/env node

/**
 * TokenSlim CLI v1.0.0
 * =====================
 * Compress AI prompts from terminal.
 * 
 * Usage:
 *   tokenslim "your long prompt here"
 *   echo "long prompt" | tokenslim
 *   tokenslim --file prompt.txt
 *   tokenslim --level 3 "prompt"
 *   tokenslim --analyze "prompt"
 *   tokenslim --pipe              # read stdin
 * 
 * Options:
 *   -l, --level <1-4>  Compression level (default: 2)
 *   -a, --analyze      Show analysis for all levels
 *   -f, --file <path>  Read from file
 *   -s, --stats        Show token statistics
 *   -r, --raw          Raw output (no formatting)
 *   -v, --version      Show version
 *   -h, --help         Show help
 */

const fs = require('fs');
const path = require('path');
const { TokenSlimCore } = require('../core/index.js');

const core = new TokenSlimCore();
const pkg = require('./package.json');

const LEVEL_NAMES = {
  1: 'Mild (20% savings)',
  2: 'Normal (40% savings) ⭐',
  3: 'Aggressive (60% savings)',
  4: 'Extreme (80% savings)'
};

function showHelp() {
  console.log(`
╔══════════════════════════════════════════╗
║        TokenSlim CLI v${pkg.version}          ║
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
  -r, --raw          Raw output (no formatting)
  -v, --version      Show version
  -h, --help         Show this help

Compression Levels:
  1 = Mild     ~20% — Safe, preserves readability
  2 = Normal   ~40% — Balanced (recommended)
  3 = Aggressive ~60% — Max savings for long prompts
  4 = Extreme  ~80% — Drastic (for internal/context)

Examples:
  $ tokenslim "Generate a Python function that sorts numbers"
  $ tokenslim -l 3 -s "Please write a function for me"
  $ cat prompt.txt | tokenslim --level 4 --stats
`);
}

function showVersion() {
  console.log(`TokenSlim CLI v${pkg.version}`);
}

function printStats(stats, level) {
  const label = LEVEL_NAMES[level] || `Level ${level}`;
  console.log('');
  console.log(`  📊 Level ${level}: ${label}`);
  console.log(`     Original:   ${String(stats.original).padStart(5)} tokens`);
  console.log(`     Compressed: ${String(stats.compressed).padStart(5)} tokens`);
  console.log(`     Saved:      ${String(stats.saved).padStart(5)} tokens (${stats.percent}%)`);
  console.log('');
}

function printResult(result, level, showStats) {
  if (showStats) {
    printStats(result.stats, level);
  }
  console.log(result.compressed);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Check if piped input
    if (!process.stdin.isTTY) {
      return readStdin();
    }
    showHelp();
    return;
  }

  // Parse flags
  let level = 2;
  let showStats = false;
  let analyze = false;
  let filePath = null;
  let textArgs = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-l':
      case '--level':
        level = parseInt(args[++i], 10);
        if (level < 1 || level > 4 || isNaN(level)) {
          console.error('❌ Level must be 1-4');
          process.exit(1);
        }
        break;
      case '-s':
      case '--stats':
        showStats = true;
        break;
      case '-a':
      case '--analyze':
        analyze = true;
        break;
      case '-f':
      case '--file':
        filePath = args[++i];
        break;
      case '-r':
      case '--raw':
        // Raw mode handled by not printing formatting
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
        if (arg.startsWith('-')) {
          console.error(`❌ Unknown option: ${arg}`);
          process.exit(1);
        }
        textArgs.push(arg);
    }
  }

  let text;

  if (filePath) {
    try {
      text = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.error(`❌ Cannot read file: ${filePath}`);
      process.exit(1);
    }
  } else if (textArgs.length > 0) {
    text = textArgs.join(' ');
  } else if (!process.stdin.isTTY) {
    return readStdin(level, showStats);
  } else {
    console.error('❌ No input text provided');
    console.error('   Usage: tokenslim "your prompt here"');
    console.error('   Or pipe: echo "prompt" | tokenslim');
    process.exit(1);
  }

  processText(text, level, showStats, analyze);
}

function readStdin(level = 2, showStats = false) {
  let buffer = '';
  process.stdin.on('data', (chunk) => {
    buffer += chunk.toString();
  });
  process.stdin.on('end', () => {
    processText(buffer.trim(), level, showStats);
  });
}

function processText(text, level, showStats, analyze) {
  if (!text || text.length === 0) {
    console.error('❌ Empty input');
    process.exit(1);
  }

  if (analyze) {
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

  const result = core.compress(text, level);
  printResult(result, level, showStats);

  if (!showStats) {
    // Print mini stats
    const bar = createBar(result.stats.percent, 20);
    process.stderr.write(`  💰 Saved ${result.stats.percent}% (${result.stats.saved} tokens) ${bar}\n`);
  }
}

function createBar(percent, width) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// Run
main();
