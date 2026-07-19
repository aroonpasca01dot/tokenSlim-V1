/**
 * TokenSlim — OpenCode Plugin Installation Guide
 * ================================================
 * 
 * ## Quick Install
 * 
 * ```bash
 * # Navigate to TokenSlim project
 * cd packages/opencode-plugin
 * 
 * # Copy plugin to OpenCode plugins directory
 * mkdir -p ~/.opencode/plugins/tokenslim
 * cp plugin.js ~/.opencode/plugins/tokenslim/
 * 
 * # Add to config
 * echo '{"plugins": ["tokenslim"]}' > ~/.opencode/plugins.json
 * # Or merge into existing ~/.opencode/config.json
 * ```
 * 
 * ## Configuration
 * 
 * Add to ~/.opencode/config.json:
 * 
 * ```json
 * {
 *   "plugins": ["tokenslim"],
 *   "tokenslim": {
 *     "enabled": true,
 *     "level": 2,
 *     "maxContextTokens": 4096
 *   }
 * }
 * ```
 * 
 * ## What Gets Compressed
 * 
 * ✅ User prompts (>100 chars)
 * ✅ Context window files
 * ✅ Conversation history
 * ❌ Short queries (<100 chars)
 * ❌ Error messages
 * ❌ Excluded patterns
 * 
 * ## Compression Levels
 * 
 * 1 = Mild — Safe, preserves readability
 * 2 = Normal — Balanced (recommended)
 * 3 = Aggressive — Max savings for long prompts
 * 4 = Extreme — Drastic shortening
 */
