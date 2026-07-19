# ⚡ TokenSlim

### AI Prompt Compressor — Save up to 60% on token costs

TokenSlim removes filler words, minifies instructions, and preserves important context. Works with **Claude, GPT, Gemini, Continue.dev, OpenCode, Antigravity, VSCode**, and any AI tool.

---

## 📊 The Problem

AI prompts are **30–60% filler**. Words like "please", "basically", "I would like you to" consume tokens and money.

| Prompt | Tokens | Cost (Claude) |
|--------|--------|---------------|
| Original | 100 | ~$0.003 |
| After TokenSlim | 42 | ~$0.001 |
| **Savings** | **58%** | **58% less** |

> 💰 For heavy users, that's **$50–200/month saved**.

---

## 🚀 Quick Start

### Web Demo
Open `demo/index.html` in any browser. Paste a prompt → compress instantly.

### CLI
```bash
# Install
npm install -g @tokenslim/cli

# Basic usage
tokenslim "Your long AI prompt here"

# Pipe from echo
echo "Write a Python function..." | tokenslim --level 3 --stats

# Analyze all levels
tokenslim --analyze "Your prompt here"

# Read from file
tokenslim --file prompt.txt --level 4
```

### VSCode Extension
1. Open VSCode
2. Install from VSIX or copy `packages/vscode-extension/`
3. Select prompt text → `Ctrl+Shift+C` → Compressed!
4. See savings in status bar

### Continue.dev
```bash
# Install
npm install @tokenslim/continue-plugin

# Add to ~/.continue/config.json:
cp packages/continue-plugin/config.json ~/.continue/
```

### OpenCode
```bash
# Copy plugin
cp packages/opencode-plugin/plugin.js ~/.opencode/plugins/tokenslim/

# Add to ~/.opencode/config.json:
# { "plugins": ["tokenslim"] }
```

### Antigravity
```javascript
const { compress } = require('@tokenslim/antigravity');
const compressed = compress(longPrompt);
```

---

## 📦 Packages

| Package | Description | Path |
|---------|-------------|------|
| `@tokenslim/core` | Core compression engine | `packages/core/` |
| `@tokenslim/cli` | CLI tool | `packages/cli/` |
| `@tokenslim/vscode` | VSCode extension | `packages/vscode-extension/` |
| `@tokenslim/continue` | Continue.dev plugin | `packages/continue-plugin/` |
| `@tokenslim/opencode` | OpenCode plugin | `packages/opencode-plugin/` |
| `@tokenslim/antigravity` | Antigravity plugin | `packages/antigravity-plugin/` |
| `@tokenslim/demo` | Web demo page | `demo/` |

---

## 🎯 Compression Levels

| Level | Name | Savings | Best For |
|-------|------|---------|----------|
| 1 | Mild | ~20% | Short prompts, preserving tone |
| 2 | **Normal** ⭐ | **~40%** | **Daily use (recommended)** |
| 3 | Aggressive | ~60% | Long prompts, max savings |
| 4 | Extreme | ~80% | Internal context, budget mode |

---

## 🔧 How It Works

TokenSlim uses a multi-phase compression pipeline:

```
Input → 1. Preserve blocks → 2. Remove fillers → 3. Apply shorthand → 4. Filter words → Output
                                    ↓
                            ✅ Code blocks preserved
                            ✅ Technical terms kept
                            ✅ Context maintained
                            ✅ Money saved
```

### What Gets Removed
- ✅ Filler words (basically, actually, just, very)
- ✅ Pleasantries (thanks, please, you're welcome)
- ✅ Hedging (maybe, perhaps, I think)
- ✅ Redundant context (As an AI assistant...)
- ✅ Verbose instruction starters (I would like you to...)

### What's Preserved
- ✅ Code blocks (``` ... ```)
- ✅ Inline code (`...`)
- ✅ Technical terms
- ✅ Numbers and important data
- ✅ Essential instructions

---

## 📈 Demo

Open `demo/index.html` to try it live:

**Before:** 100 tokens → **After:** 42 tokens → **Save 58%** 🎉

---

## 🛠️ Development

```bash
# Clone
git clone https://github.com/aroonpasca01dot/TokenSlim.git
cd TokenSlim

# Install
npm install

# Test core
npm test --workspace=packages/core

# Build all
npm run build
```

---

## 🤝 Why Contribute?

TokenSlim solves a **universal pain point**: expensive AI tokens. Every developer using AI coding tools saves money with this. Star, fork, contribute!

---

## 📄 License

MIT — free for personal and commercial use.

---

**⚡ TokenSlim — Smarter prompts, smaller bills.**

Made with ❤️ for the AI coding community.
