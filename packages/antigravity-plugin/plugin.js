/**
 * TokenSlim — Antigravity Plugin
 * ================================
 * 
 * Antigravity is a lightweight coding agent that runs in terminal.
 * This plugin hooks into its prompt pipeline to compress context.
 * 
 * Installation:
 *   1. Copy plugin.js to your project
 *   2. Source/import it in your Antigravity config
 *   3. It auto-wraps the prompt function
 * 
 * Compression saves ~30-50% tokens automatically.
 */

const { TokenSlimCore } = require('@tokenslim/core');
const core = new TokenSlimCore();

let config = {
  enabled: true,
  level: 2,
  verbose: false
};

try {
  const agConfig = require(process.env.HOME + '/.antigravity/config.json');
  if (agConfig.tokenslim) {
    config = { ...config, ...agConfig.tokenslim };
  }
} catch (e) {
  // Use defaults
}

/**
 * Compress text using TokenSlim
 * @param {string} text - Input prompt
 * @param {object} opts - Options
 * @returns {string} Compressed prompt
 */
function compress(text, opts = {}) {
  if (!config.enabled || !text || text.length < 50) return text;

  const level = opts.level || config.level;
  
  try {
    const result = core.compress(text, level);
    
    if (config.verbose && result.stats.percent > 0) {
      console.error(`  ⚡ TokenSlim: ${result.stats.percent}% saved (${result.stats.saved} tokens)`);
    }
    
    return result.compressed;
  } catch (e) {
    console.error('[TokenSlim] Error:', e.message);
    return text;
  }
}

/**
 * Middleware for Antigravity's prompt handler
 * Usage: antigravity.use(tokenslimMiddleware)
 */
function middleware(next) {
  return async (prompt, context) => {
    if (config.enabled && prompt && prompt.length > 50) {
      prompt = compress(prompt);
    }
    return next(prompt, context);
  };
}

/**
 * Process entire context array (for conversation history)
 */
function compressContext(contexts) {
  if (!config.enabled || !contexts) return contexts;
  
  return contexts.map(ctx => {
    if (ctx.content && ctx.content.length > 50) {
      const result = core.compress(ctx.content, config.level);
      return { ...ctx, content: result.compressed };
    }
    return ctx;
  });
}

// Export API
module.exports = {
  name: '@tokenslim/antigravity',
  version: '1.0.0',
  compress,
  middleware,
  compressContext
};
