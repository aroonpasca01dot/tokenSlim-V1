/**
 * TokenSlim — VSCode Extension
 * ==============================
 * 
 * Commands:
 *   TokenSlim: Compress Prompt     — Compress entire editor content
 *   TokenSlim: Compress Selection  — Compress selected text
 *   TokenSlim: Analyze Prompt      — Show token analysis
 *   TokenSlim: Show Session Stats  — Show running session stats
 * 
 * Keybindings:
 *   Ctrl+Shift+C  — Compress selection
 *   Ctrl+Shift+A  — Analyze prompt
 */

const vscode = require('vscode');

// The core engine can live in three places depending on how the
// extension was installed; try each layout in order.
let TokenSlimCore;
const CORE_PATHS = ['@tokenslim/core', './core.js', '../core/index.js'];
for (const p of CORE_PATHS) {
  try {
    ({ TokenSlimCore } = require(p));
    break;
  } catch (e) { /* try next layout */ }
}
if (!TokenSlimCore) {
  throw new Error('TokenSlim: core engine not found. Copy packages/core/index.js next to extension.js as core.js');
}

let statusBarItem;
let sessionStats = { prompts: 0, tokensSaved: 0 };

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const core = new TokenSlimCore();

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = '⚡ TokenSlim';
  statusBarItem.tooltip = 'TokenSlim: Click to compress selection';
  statusBarItem.command = 'tokenslim.compressSelection';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // ─── Commands ─────────────────────────────────────────────────

  const compressCmd = vscode.commands.registerCommand(
    'tokenslim.compress',
    () => compressEditor(core)
  );

  const compressSelectionCmd = vscode.commands.registerCommand(
    'tokenslim.compressSelection', 
    () => compressSelection(core)
  );

  const analyzeCmd = vscode.commands.registerCommand(
    'tokenslim.analyze',
    () => analyzePrompt(core)
  );

  const showStatsCmd = vscode.commands.registerCommand(
    'tokenslim.showStats',
    () => showStats()
  );

  context.subscriptions.push(
    compressCmd,
    compressSelectionCmd,
    analyzeCmd,
    showStatsCmd
  );

  // Log activation
  console.log('⚡ TokenSlim extension activated');
}

function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}

// ─── Command Implementations ──────────────────────────────────────────────

/** Read the extension settings. @returns {{level:number,showNotifications:boolean}} */
function getConfig() {
  const config = vscode.workspace.getConfiguration('tokenslim');
  return {
    level: config.get('level', 2),
    showNotifications: config.get('showNotifications', true)
  };
}

/** Compress the entire active editor content in place. */
function compressEditor(core) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const text = editor.document.getText();
  if (!text || text.trim().length === 0) {
    vscode.window.showWarningMessage('Editor is empty');
    return;
  }

  const { level, showNotifications } = getConfig();
  const result = core.compress(text, level);

  // Replace editor content
  editor.edit(editBuilder => {
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(text.length)
    );
    editBuilder.replace(fullRange, result.compressed);
  });

  updateStats(result);
  updateStatusBar();

  if (showNotifications) {
    vscode.window.showInformationMessage(
      `⚡ TokenSlim: Saved ${result.stats.percent}% (${result.stats.saved} tokens)`
    );
  }
}

/** Compress the current selection in place. */
function compressSelection(core) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const selection = editor.selection;
  const text = editor.document.getText(selection);

  if (selection.isEmpty) {
    vscode.window.showWarningMessage('No text selected. Select text or use "Compress Prompt" for full editor.');
    return;
  }

  const { level, showNotifications } = getConfig();
  const result = core.compress(text, level);

  // Replace selection
  editor.edit(editBuilder => {
    editBuilder.replace(selection, result.compressed);
  });

  updateStats(result);
  updateStatusBar();

  if (showNotifications) {
    vscode.window.showInformationMessage(
      `⚡ TokenSlim: Saved ${result.stats.percent}% (${result.stats.saved} tokens)`
    );
  }
}

/** Show an all-levels token analysis for the selection or document. */
function analyzePrompt(core) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const text = editor.selection.isEmpty 
    ? editor.document.getText()
    : editor.document.getText(editor.selection);

  if (!text || text.trim().length === 0) {
    vscode.window.showWarningMessage('No text to analyze');
    return;
  }

  const analysis = core.analyze(text);

  const panel = vscode.window.createOutputChannel('TokenSlim Analysis');
  panel.clear();
  panel.appendLine('╔═══════════════════════════════════╗');
  panel.appendLine('║   📈 TokenSlim Analysis           ║');
  panel.appendLine('╚═══════════════════════════════════╝');
  panel.appendLine('');
  
  analysis.levels.forEach(l => {
    const bar = createBar(l.percent, 15);
    panel.appendLine(`  Level ${l.level} (${l.name}):`);
    panel.appendLine(`    ${l.original} → ${l.compressed} tokens`);
    panel.appendLine(`    Save ${l.percent}% ${bar}`);
    panel.appendLine('');
  });

  panel.appendLine(`  ✅ Recommended: Level ${analysis.recommendation}`);
  panel.appendLine('');
  panel.appendLine('  ─────────────────────────────────────');
  panel.appendLine(`  Original:  ${text.length} chars`);
  panel.appendLine(`  Words:     ${text.trim().split(/\s+/).length}`);
  panel.show();
}

/** Show cumulative session savings in an output channel. */
function showStats() {
  const panel = vscode.window.createOutputChannel('TokenSlim Stats');
  panel.clear();
  panel.appendLine('╔═══════════════════════════════════╗');
  panel.appendLine('║   ⚡ TokenSlim Session Stats      ║');
  panel.appendLine('╚═══════════════════════════════════╝');
  panel.appendLine('');
  panel.appendLine(`  Prompts compressed: ${sessionStats.prompts}`);
  panel.appendLine(`  Total tokens saved: ${sessionStats.tokensSaved}`);
  panel.appendLine('');
  
  if (sessionStats.prompts > 0) {
    const avg = Math.round(sessionStats.tokensSaved / sessionStats.prompts);
    panel.appendLine(`  Average savings: ${avg} tokens/prompt`);
  }
  
  panel.show();
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Accumulate a compression result into the session stats. */
function updateStats(result) {
  sessionStats.prompts++;
  sessionStats.tokensSaved += result.stats.saved;
}

/** Refresh the status bar item with the running savings total. */
function updateStatusBar() {
  if (statusBarItem) {
    statusBarItem.text = `⚡ TokenSlim (${sessionStats.tokensSaved} saved)`;
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

module.exports = { activate, deactivate };
