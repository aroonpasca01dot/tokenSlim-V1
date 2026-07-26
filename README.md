# ⚡ TokenSlim

### AI Prompt Compressor — save 10-60% of tokens on verbose prompts

TokenSlim removes filler words, pleasantries and hedging from your AI prompts while **protecting what matters**: code blocks, inline code, URLs, emails and numbers pass through byte-for-byte untouched. Works with **Claude, GPT, Gemini, Continue.dev, OpenCode, Antigravity, VSCode**, and any AI tool.

> 🎮 **[Try the live demo](https://aroonpasca01dot.github.io/tokenSlim-V1/demo/)** — paste a prompt, compress instantly.

---

## 📊 The Problem

Verbose AI prompts carry a lot of filler. Words like "please", "basically", "I would like you to" consume tokens — and tokens cost money.

**Example (Level 3, Aggressive):**

> **Before** (78 tokens): *"I would really appreciate it if you could please take a look at this code and tell me what you think about it. Basically, I am trying to implement a sorting algorithm but I think maybe there is something wrong with it. Could you please help me debug this issue? Thank you so much for your time and assistance."*
>
> **After** (38 tokens): *"at code and tell what about it. I am trying to impl sorting algorithm but there is something wrong with it. help debug issue? for time and assistance."*
>
> **≈51% saved** — and the model still understands the request.

Savings depend entirely on how verbose the input is: polite, wordy prompts compress the most; already-terse technical prompts compress little (and TokenSlim will never make a prompt *longer* — if compression doesn't help, you get your original text back).

---

## 🚀 Quick Start

### Web Demo
Open `demo/index.html` in any browser (or use the [hosted demo](https://aroonpasca01dot.github.io/tokenSlim-V1/demo/)). Paste a prompt → compress instantly.

### CLI

> Not yet published to npm — run it straight from the repo:

```bash
git clone https://github.com/aroonpasca01dot/tokenSlim-V1.git
cd tokenSlim-V1

# Basic usage
node packages/cli/index.js "Your long AI prompt here"

# Pipe from echo
echo "Write a Python function..." | node packages/cli/index.js --level 3 --stats

# Analyze all levels
node packages/cli/index.js --analyze "Your prompt here"

# Read from file, raw output (script-friendly)
node packages/cli/index.js --file prompt.txt --level 4 --raw

# Optional: install the `tokenslim` command globally
cd packages/cli && npm link
tokenslim "Your prompt here"
```

### VSCode Extension
1. Copy `packages/vscode-extension/` to `~/.vscode/extensions/tokenslim/`
2. Copy the engine into it: `cp packages/core/index.js ~/.vscode/extensions/tokenslim/core.js`
3. Restart VSCode
4. Select prompt text → `Ctrl+Shift+C` → Compressed! Savings appear in the status bar.

### OpenCode
```bash
mkdir -p ~/.opencode/plugins/tokenslim
cp packages/opencode-plugin/plugin.js ~/.opencode/plugins/tokenslim/
cp packages/core/index.js ~/.opencode/plugins/tokenslim/core.js
# Then add to ~/.opencode/config.json:  { "plugins": ["tokenslim"] }
```

### Antigravity
```javascript
const { compress } = require('./packages/antigravity-plugin/plugin.js');
const compressed = compress(longPrompt, { level: 2 });
```

### Continue.dev
See [`packages/continue-plugin/README.md`](packages/continue-plugin/README.md) — adds a `/compress` custom command.

---

## 📦 Packages

| Package | Description | Path |
|---------|-------------|------|
| `@tokenslim/core` | Core compression engine | `packages/core/` |
| `@tokenslim/cli` | CLI tool | `packages/cli/` |
| `tokenslim` (VSCode) | VSCode extension | `packages/vscode-extension/` |
| `@tokenslim/continue-plugin` | Continue.dev integration | `packages/continue-plugin/` |
| `@tokenslim/opencode` | OpenCode plugin | `packages/opencode-plugin/` |
| `@tokenslim/antigravity` | Antigravity plugin | `packages/antigravity-plugin/` |
| demo | Web demo page | `demo/` |

---

## 🎯 Compression Levels

| Level | Name | Typical Savings* | Best For |
|-------|------|------------------|----------|
| 1 | Mild | ~5-15% | Short prompts, preserving tone & wording |
| 2 | **Normal** ⭐ | **~10-25%** | **Daily use (recommended)** |
| 3 | Aggressive | ~25-45% | Long prompts, max savings |
| 4 | Extreme | ~40-60% | Internal context, budget mode |

\* Measured on verbose, conversational prompts. Terse technical prompts save less. Token counts are estimates (`max(words, chars/4)`); exact counts vary per model tokenizer.

**What each level does:**

- **Mild** — removes obvious filler adverbs only (*basically, actually, very, really…*). No rewriting.
- **Normal** — + pleasantries (*please, thanks*), hedging (*maybe, hopefully*), redundant phrases (*"I would like you to"*), and safe long-word shorthand (*configuration → config, documentation → docs*).
- **Aggressive** — + articles, connectors, coding shorthand (*function → fn, argument → arg*).
- **Extreme** — + stop-word sweep; telegram-style output for internal/context text.

---

## 🔧 How It Works

TokenSlim uses a multi-phase compression pipeline:

```
Input → 1. Protect code/URLs/emails → 2. Remove redundant phrases
      → 3. Apply shorthand → 4. Filter filler words (per line)
      → 5. Cleanup → 6. Restore protected parts → Output
```

### What Gets Removed
- ✅ Filler words (basically, actually, just, very)
- ✅ Pleasantries (thanks, please, you're welcome)
- ✅ Hedging (maybe, perhaps, hopefully)
- ✅ Redundant phrases (As an AI assistant…, I would like you to…)

### What's Protected (byte-for-byte)
- ✅ Code blocks (``` … ```)
- ✅ Inline code (`` `…` `` — including dots, flags like `-g`, `$&` patterns)
- ✅ URLs and emails
- ✅ Numbers and decimals (3.14 stays 3.14)
- ✅ Line structure — lists and paragraphs keep their shape (levels 1-2)

### Safety Guarantees
- 🛡️ Output is **never empty** for non-empty input
- 🛡️ Output is **never longer** than the input (falls back to the original if compression wouldn't help)
- 🛡️ Only shorthand that LLMs reliably understand (no `hlpr`/`clt`-style mangling)

### Limitations
- Designed for **English** prompts (filler-word lists are English)
- Token counts are **estimates** — the exact number depends on the model's tokenizer
- Aggressive/Extreme levels trade grammar for savings — review the output before using it in prompts where nuance matters

---

## 🛠️ Development

```bash
git clone https://github.com/aroonpasca01dot/tokenSlim-V1.git
cd tokenSlim-V1

# Run all tests (core + CLI)
npm test

# Rebuild the demo page after editing the core engine
npm run build

# Serve the demo locally
npm run demo
```

The demo embeds a copy of `packages/core/index.js` between the
`TOKENSLIM_CORE_START`/`END` markers — `npm run build` keeps it in sync.

---

## 🤝 Why Contribute?

TokenSlim solves a **universal pain point**: expensive AI tokens. Every developer using AI coding tools saves money with this. Star, fork, contribute!

---

## 📄 License

MIT — free for personal and commercial use.

---

**⚡ TokenSlim — Smarter prompts, smaller bills.**

Made with ❤️ for the AI coding community.
