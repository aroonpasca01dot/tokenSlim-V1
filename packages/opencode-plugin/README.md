# TokenSlim — OpenCode Plugin

⚡ Automatically compress prompts and context windows in OpenCode.

## Quick Install

```bash
# From the TokenSlim repo root:
mkdir -p ~/.opencode/plugins/tokenslim
cp packages/opencode-plugin/plugin.js ~/.opencode/plugins/tokenslim/
cp packages/core/index.js ~/.opencode/plugins/tokenslim/core.js

# Enable it in ~/.opencode/config.json:
# { "plugins": ["tokenslim"] }
```

> Both files are needed: `plugin.js` is the hook, `core.js` is the
> compression engine it loads.

## Configuration

Add a `tokenslim` section to `~/.opencode/config.json`:

```json
{
  "plugins": ["tokenslim"],
  "tokenslim": {
    "enabled": true,
    "level": 2,
    "minLength": 100,
    "excludePatterns": []
  }
}
```

## What gets compressed

- ✅ User prompts longer than `minLength` (default 100 chars)
- ✅ Context window entries
- ❌ Short queries
- ❌ Prompt types listed in `excludePatterns`
- ❌ Code blocks, inline code, URLs and emails inside prompts
  (protected by the engine — passed through unchanged)

## Compression levels

| Level | Name | Behavior |
|-------|------|----------|
| 1 | Mild | Safest, only removes obvious filler |
| 2 | Normal ⭐ | Balanced (recommended) |
| 3 | Aggressive | Max savings for long prompts |
| 4 | Extreme | Drastic shortening, telegram style |
