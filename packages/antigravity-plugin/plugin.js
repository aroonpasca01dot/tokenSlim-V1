/**
 * TokenSlim — Antigravity Plugin
 * ===============================
 * Automatically compress prompts to save tokens.
 *
 * Usage:
 *   const { compress } = require('@tokenslim/antigravity');
 *   const shorter = compress(longPrompt, { level: 2 });
 */

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

let config = {
  enabled: true,
  level: 2,
  verbose: false,
  minLength: 50,
  excludePatterns: []
};

/**
 * Merge runtime configuration overrides.
 * @param {object} overrides partial config
 * @returns {object} the effective config
 */
function configure(overrides) {
  config = { ...config, ...overrides };
  return config;
}

/**
 * Compress a prompt string if it qualifies.
 * @param {string} text prompt text
 * @param {{level?:number}} [opts]
 * @returns {string} compressed text (or the input unchanged)
 */
function compress(text, opts = {}) {
  if (!config.enabled || typeof text !== 'string' || text.length < config.minLength) return text;
  const level = opts.level || config.level;
  try {
    const result = core.compress(text, level);
    if (config.verbose && result.stats.percent > 0) {
      console.error('  ⚡ TokenSlim: ' + result.stats.percent + '% saved (' + result.stats.saved + ' tokens)');
    }
    return result.compressed;
  } catch (e) {
    return text;
  }
}

/**
 * prompt:preprocess hook — compress qualifying prompts.
 * @param {{prompt:string,type:string}} context
 * @returns {object} context with compressed prompt
 */
function onPrompt(context) {
  if (!config.enabled || !context) return context;
  const { prompt, type } = context;
  if (typeof prompt !== 'string' || prompt.length < config.minLength) return context;
  if (config.excludePatterns.includes(type)) return context;
  try {
    const result = core.compress(prompt, config.level);
    return { ...context, prompt: result.compressed };
  } catch (e) {
    return context;
  }
}

/**
 * context:prepare hook — compress qualifying context entries.
 * @param {Array<{text:string}>} contexts
 * @returns {Array<object>}
 */
function onContextWindow(contexts) {
  if (!config.enabled || !Array.isArray(contexts)) return contexts;
  return contexts.map(ctx => {
    if (!ctx || typeof ctx.text !== 'string' || ctx.text.length < config.minLength) return ctx;
    try {
      const result = core.compress(ctx.text, config.level);
      return { ...ctx, text: result.compressed };
    } catch {
      return ctx;
    }
  });
}

module.exports = {
  name: '@tokenslim/antigravity',
  version: '1.1.0',
  compress,
  configure,
  hooks: {
    'prompt:preprocess': onPrompt,
    'context:prepare': onContextWindow
  }
};
