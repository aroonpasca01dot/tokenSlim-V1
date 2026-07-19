/**
 * TokenSlim — the coding tool Plugin
 * Automatically compress prompts to save tokens.
 */

const { TokenSlimCore } = require('../core/index.js');
const core = new TokenSlimCore();

let config = {
  enabled: true,
  level: 2,
  verbose: false,
  excludePatterns: []
};

function compress(text, opts = {}) {
  if (!config.enabled || !text || text.length < 30) return text;
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

function onPrompt(context) {
  if (!config.enabled) return context;
  const { prompt, type } = context;
  if (prompt.length < 50) return context;
  if (config.excludePatterns.includes(type)) return context;
  try {
    const result = core.compress(prompt, config.level);
    return { ...context, prompt: result.compressed };
  } catch (e) {
    return context;
  }
}

function onContextWindow(contexts) {
  if (!config.enabled) return contexts;
  return contexts.map(ctx => {
    if (!ctx.text || ctx.text.length < 100) return ctx;
    try {
      const result = core.compress(ctx.text, config.level);
      return { ...ctx, text: result.compressed };
    } catch {
      return ctx;
    }
  });
}

module.exports = {
  name: '@tokenslim/opencode',
  version: '1.0.0',
  compress,
  hooks: {
    'prompt:preprocess': onPrompt,
    'context:prepare': onContextWindow
  }
};
