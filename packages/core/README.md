# @tokenslim/core

⚡ **AI Prompt Compressor** — remove filler words, pleasantries and hedging from AI prompts while protecting code blocks, inline code, URLs, emails and numbers byte-for-byte.

Part of [TokenSlim](https://github.com/aroonpasca01dot/tokenSlim-V1). Works in Node.js and the browser (zero dependencies).

## Install

```bash
npm install @tokenslim/core
```

## Usage

```js
const { TokenSlimCore } = require('@tokenslim/core');
const core = new TokenSlimCore();

const { compressed, stats } = core.compress(
  'I would like you to please generate a Python function, thank you so much!',
  2 // level 1-4
);

console.log(compressed);      // compressed prompt
console.log(stats.percent);   // estimated % of tokens saved
```

### API

- `compress(text, level?)` → `{ compressed, stats: { original, compressed, saved, percent } }`
- `analyze(text)` → savings at all 4 levels + a recommended level
- `summarize(text, level?)` → stats only

### Levels

| Level | Name | Typical savings* |
|-------|------|------------------|
| 1 | Mild | ~5-15% |
| 2 | Normal ⭐ | ~10-25% |
| 3 | Aggressive | ~25-45% |
| 4 | Extreme | ~40-60% |

\* On verbose, conversational English prompts. Token counts are estimates (`max(words, chars/4)`).

### Guarantees

- Code blocks, inline code, URLs and emails pass through **unchanged**
- Negations (`not`, `no`, `never`) are always preserved
- Output is never empty and never longer than the input

MIT License
