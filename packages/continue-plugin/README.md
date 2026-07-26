# TokenSlim — Continue.dev Integration

⚡ Use TokenSlim compression from inside [Continue.dev](https://continue.dev).

## What this provides

Continue.dev does not expose a local prompt-preprocessing hook, so this
package offers two honest ways to save tokens:

1. **Recommended — compress before you paste.** Run your prompt through the
   TokenSlim CLI (or the web demo) and paste the compressed result into
   Continue. This is a real, local, zero-cost compression:

   ```bash
   node packages/cli/index.js --raw "your long prompt here"
   ```

2. **`/compress` custom command.** `config.json` in this folder adds a
   `/compress` command that asks the model itself to rewrite your input in
   compressed form. Note: this spends tokens on the rewrite request, so it
   only pays off when you reuse the compressed prompt multiple times
   (e.g. a system prompt or a saved template).

## Install the custom command

Merge the `customCommands` entry from `config.json` into your
`~/.continue/config.json`:

```json
{
  "customCommands": [
    {
      "name": "compress",
      "description": "⚡ TokenSlim: rewrite the selected prompt in compressed form",
      "prompt": "Compress the following prompt. Remove filler words, pleasantries and hedging. Keep all technical content, code blocks, URLs and numbers exactly as they are. Output ONLY the compressed version, no explanations:\n\n{{{ input }}}"
    }
  ]
}
```

Then restart Continue and type `/compress <your text>`.
