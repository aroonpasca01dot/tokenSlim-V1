# @tokenslim/cli

⚡ **Compress AI prompts from your terminal.** Save tokens before you paste a prompt into Claude, GPT, Gemini or any coding agent.

Part of [TokenSlim](https://github.com/aroonpasca01dot/tokenSlim-V1).

## Install

```bash
npm install -g @tokenslim/cli
```

This installs two commands: `tokenslim` and `tslim`.

## Usage

```bash
# Basic
tokenslim "Your long AI prompt here"

# Pipe
echo "Write a Python function..." | tokenslim --level 3 --stats

# Analyze all levels and get a recommendation
tokenslim --analyze "Your prompt here"

# From a file, script-friendly raw output
tokenslim --file prompt.txt --level 4 --raw
```

## Options

| Flag | Description |
|------|-------------|
| `-l, --level <1-4>` | Compression level (default: 2) |
| `-a, --analyze` | Show savings for all levels |
| `-f, --file <path>` | Read from a file |
| `-s, --stats` | Show token statistics |
| `-r, --raw` | Output only the compressed text |
| `-v, --version` | Show version |
| `-h, --help` | Show help |

Code blocks, inline code, URLs, emails and numbers are always preserved byte-for-byte.

MIT License
