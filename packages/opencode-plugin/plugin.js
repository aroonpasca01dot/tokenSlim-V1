/**
 * TokenSlim — OpenCode Plugin
 * ============================
 * 
 * OpenCode supports custom hooks for prompt preprocessing.
 * This plugin hooks into the prompt pipeline to compress context.
 * 
 * Installation:
 *   1. Copy plugin.js to ~/.opencode/plugins/tokenslim/
 *   2. Add to ~/.opencode/config.json:
 *      { "plugins": ["tokenslim"] }
 *   3. Restart OpenCode
 * 
 * Compression saves ~30-50% tokens on context windows.
 */

const fs = require('fs');
const path = require('path');
const { TokenSlimCore } = require('@tokenslim/core');

const core = new TokenSlimCore();

// Default config
let config = {
  enabled: true,
  level: 2,
  preserveCodeBlocks: true,
  maxContextTokens: 4096,
  excludePatterns: []
};

// Load user config
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
  if (!config.enabled) return context;

  const { prompt, type } = context;

  // Don't compress short prompts
  if (prompt.length < 100) return context;

  // Don't compress excluded types
  if (config.excludePatterns.includes(type)) return context;

  try {
    const result = core.compress(prompt, config.level);
    logSavings(prompt, result);
    return { ...context, prompt: result.compressed };
  } catch (e) {
    console.error('[TokenSlim] Compression failed:', e.message);
    return context;
  }
}

function onContextWindow(contexts) {
  if (!config.enabled) return contexts;

  return contexts.map(ctx => {
    if (!ctx.text || ctx.text.length < 100) return ctx;
    
    try {
      const result = core.compress(ctx.text, config.level);
      logSavings(ctx.text, result, 'Context');
      return { ...ctx, text: result.compressed };
    } catch {
      return ctx;
    }
  });
}

function logSavings(original, result, label = 'Prompt') {
  if (result.stats.percent > 0) {
    const saved = result.stats.percent;
    const tokens = result.stats.saved;
    process.stderr.write(`  ⚡ TokenSlim [${label}]: saved ${saved}% (${tokens} tokens)\n`);
  }
}

// Plugin metadata
module.exports = {
  name: '@tokenslim/opencode',
  version: '1.0.0',
  hooks: {
    'prompt:preprocess': onPrompt,
    'context:prepare': onContextWindow
  }
};
