# TokenSlim VSCode Extension

⚡ **Compress AI prompts directly from VSCode.** Save tokens, save money.

## Features

- **Compress Selection** (`Ctrl+Shift+C`) — Select text, compress instantly
- **Compress Prompt** — Compress entire editor content
- **Analyze Prompt** (`Ctrl+Shift+A`) — See token savings for all levels
- **Session Stats** — Track total tokens saved per session
- **Status Bar** — Quick access and live savings counter

## Installation

### From VSIX (locally)
```bash
# Build VSIX
npx vsce package
# Install in VSCode
code --install-extension tokenslim-1.0.0.vsix
```

### From source
1. Copy `packages/vscode-extension/` to `~/.vscode/extensions/tokenslim/`
2. Copy the core engine into it: `cp packages/core/index.js ~/.vscode/extensions/tokenslim/core.js`
3. Restart VSCode

## Usage

1. Open any file with prompt text
2. Select text or leave cursor in editor
3. Press `Ctrl+Shift+C` to compress
4. See savings notification instantly

## Configuration

Settings → Search "TokenSlim":

- `tokenslim.level` — Default compression level (1-4)
- `tokenslim.showNotifications` — Show savings popup
