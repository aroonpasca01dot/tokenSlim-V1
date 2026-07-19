/**
 * TokenSlim — Continue.dev Installation Guide
 * =============================================
 * 
 * ## Quick Install
 * 
 * ```bash
 * # Install via npm
 * npm install -g @tokenslim/core
 * 
 * # Copy config
 * cp config.json ~/.continue/config.json
 * 
 * # Or merge manually:
 * # Open ~/.continue/config.json and add the "experimental.promptCompression" section
 * ```
 * 
 * ## Features
 * 
 * ✅ Auto-compresses conversation history
 * ✅ Preserves code blocks and important context
 * ✅ Configurable compression level (1-4)
 * ✅ Custom slash commands
 * ✅ Token savings tracking
 * 
 * ## Configuration
 * 
 * Edit the `experimental.promptCompression` section in your config:
 * 
 * ```json
 * "promptCompression": {
 *   "enabled": true,
 *   "level": "normal",  // "mild", "normal", "aggressive", "extreme"
 *   "maxTokens": 8000,
 *   "autoDetect": true
 * }
 * ```
 * 
 * ## Slash Commands
 * 
 * - `/compress` — Compress current input
 * - `/compress-stats` — Show session savings
 */
