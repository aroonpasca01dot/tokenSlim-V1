/**
 * TokenSlim — OpenCode Plugin
 * ============================
 *
 * Hooks into the prompt pipeline to compress context before it is
 * sent to the model.
 *
 * Installation:
 *   1. mkdir -p ~/.opencode/plugins/tokenslim
 *   2. cp plugin.js ~/.opencode/plugins/tokenslim/
 *   3. cp ../core/index.js ~/.opencode/plugins/tokenslim/core.js
 *   4. Add to ~/.opencode/config.json:
 *      { "plugins": ["tokenslim"] }
 *   5. Restart OpenCode
 */

const fs = require('fs');
const path = require('path');

// The core engine can live in three places depending on how the
// plugin was installed; try each layout in order.
let TokenSlimCore;
const CORE_PATHS = ['@tokenslim/core', './core.js', '../core/index.js'];
for (const p of CORE_PATHS) {
  try {
    ({ TokenSlimCore } = require(p));
    break;
  } catch (e) { /* try next layout */ }
}
if (!TokenSlimCore) {
  throw new Error('TokenSlim: core engine not found. Copy packages/core/index.js next to plugin.js as core.js');
}

const core = new TokenSlimCore();

// Default config
let config = {
  enabled: true,
  level: 2,
  minLength: 100,
  excludePatterns: []
};

// Load user config (~/.opencode/config.json → { "tokenslim": {...} })
try {
  const configPath = path.join(__dirname, '..', '..', 'config.json');
  if (fs.existsSync(configPath)) {
    const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (userConfig.tokenslim) {
      config = { ...config, ...userConfig.tokenslim };
    }
  }
} catch (e) {
  // Use defaults
}

/**
 * OpenCode Plugin API
 */

function onPrompt(context) {
  if (!config.enabled || !context) return context;

  const { prompt, type } = context;

  if (typeof prompt !== 'string' || prompt.length < config.minLength) return context;
  if (config.excludePatterns.includes(type)) return context;

  try {
    const result = core.compress(prompt, config.level);
    logSavings(result);
    return { ...context, prompt: result.compressed };
  } catch (e) {
    console.error('[TokenSlim] Compression failed:', e.message);
    return context;
  }
}

function onContextWindow(contexts) {
  if (!config.enabled || !Array.isArray(contexts)) return contexts;

  return contexts.map(ctx => {
    if (!ctx || typeof ctx.text !== 'string' || ctx.text.length < config.minLength) return ctx;

    try {
      const result = core.compress(ctx.text, config.level);
      logSavings(result, 'Context');
      return { ...ctx, text: result.compressed };
    } catch {
      return ctx;
    }
  });
}

function logSavings(result, label = 'Prompt') {
  if (result.stats.percent > 0) {
    process.stderr.write(`  ⚡ TokenSlim [${label}]: saved ${result.stats.percent}% (${result.stats.saved} tokens)\n`);
  }
}

// Plugin metadata
module.exports = {
  name: '@tokenslim/opencode',
  version: '1.1.0',
  hooks: {
    'prompt:preprocess': onPrompt,
    'context:prepare': onContextWindow
  }
};
