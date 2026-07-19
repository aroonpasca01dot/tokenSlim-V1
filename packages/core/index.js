/**
 * TokenSlim Core v1.0.0
 * =====================
 * AI Prompt Compression Engine
 * 
 * Strategy:
 * 1. Parse → Structure → Compress → Reconstruct
 * 2. Remove filler words, minify instructions, deduplicate context
 * 3. Preserve code blocks, structured data, and critical context
 * 4. Multiple compression levels: mild (20%), normal (40%), aggresive (60%), extreme (80%)
 */

// ─── Filler & Boilerplate Patterns ──────────────────────────────────────────

const FILLER_PATTERNS = [
  // Common conversation fillers
  /\b(?:alright|okay|ok\b|well\b|so\b|now\b|basically|actually|honestly|literally|essentially|absolutely|certainly|definitely|surely|indeed|obviously|naturally|surely)\b\s*/gi,
  
  // Polite softening (safe to remove in most contexts)
  /\b(?:please\s|kindly\s|could you\s|would you\s|can you\s|i'd like you to\s|i want you to\s|i need you to\s|i would like\s|i want\s|i need\s)\b/gi,
  
  // Gratitude & pleasantries (safe for compression)
  /\b(?:thanks?|thank you|appreciate it|much obliged|you're welcome|no problem|my pleasure)\b\s*/gi,
  
  // Apologetic language
  /\b(?:sorry\b|apologies|my bad|excuse me|pardon|i apologize)\b\s*/gi,

  // Hedging language
  /\b(?:maybe\b|perhaps\b|probably\b|possibly\b|might\b|could be|i think\b|i guess\b|i suppose|it seems|it appears|kind of|sort of|a bit|a little)\b\s*/gi,

  // Verbose instruction starters
  /\b(?:i'm going to\s|i will\s|i'll\s|let me\s|let us\s|we will\s|we'll\s|we are going to\s)\b/gi,

  // Redundant question framing
  /\b(?:could you tell me\s|can you tell me\s|do you know\s|do you have any idea\s|i was wondering\s|i'm curious\s)\b/gi
];

// ─── Instruction Shorthand Map ──────────────────────────────────────────────

const INSTRUCTION_SHORTHAND = [
  // Code generation
  { pattern: /generate\s+(?:a\s+)?(?:Python|JavaScript|TypeScript|Java|C\#?|Go|Rust|Ruby|PHP)\s+(?:function|method|class|script|program)/gi,
    replace: (m) => {
      const lang = m.match(/(?:Python|JavaScript|TypeScript|Java|C\#?|Go|Rust|Ruby|PHP)/i)[0];
      const type = m.match(/(?:function|method|class|script|program)/i)[0];
      return `${lang} ${type}: `;
    }
  },

  // Verbose requests → shorthand
  { pattern: /create\s+(?:a\s+)?(?:new\s+)?/gi, replace: 'new ' },
  { pattern: /write\s+(?:a\s+)?/gi, replace: '' },
  { pattern: /implement\s+(?:a\s+)?/gi, replace: 'impl: ' },
  { pattern: /add\s+(?:a\s+)?/gi, replace: '+ ' },
  { pattern: /remove\s+(?:a\s+)?/gi, replace: '- ' },
  { pattern: /update\s+(?:a\s+)?/gi, replace: '→ ' },
  { pattern: /modify\s+(?:a\s+)?/gi, replace: 'mod: ' },
  { pattern: /convert\s+(?:a\s+)?/gi, replace: '→ ' },
  { pattern: /refactor\s+(?:a\s+)?/gi, replace: 'ref: ' },
  { pattern: /optimize\s+(?:a\s+)?/gi, replace: 'opt: ' },
  { pattern: /debug\s+(?:a\s+)?/gi, replace: 'dbg: ' },
  { pattern: /explain\s+/gi, replace: '? ' },
  { pattern: /describe\s+/gi, replace: 'desc: ' },
  { pattern: /summarize\s+/gi, replace: 'sum: ' },
  { pattern: /list\s+(?:all\s+)?(?:the\s+)?/gi, replace: '→ ' },
  { pattern: /find\s+(?:all\s+)?(?:the\s+)?/gi, replace: 'find: ' },

  // Output formatting
  { pattern: /please\s+(?:format|display|show|output|return)\s+(?:the\s+)?(?:result|output|answer|response)\s+(?:as|in)\s+(?:a\s+)?/gi, replace: 'fmt: ' },
  { pattern: /in\s+(?:the\s+)?(?:format|form|style)\s+(?:of\s+)?/gi, replace: 'as ' },
  
  // Code-specific
  { pattern: /with\s+proper\s+(?:error\s+)?handling/gi, replace: 'err_handle' },
  { pattern: /with\s+(?:input\s+)?validation/gi, replace: 'validate' },
  { pattern: /handle\s+(?:edge\s+)?cases/gi, replace: 'edge_cases' },
  { pattern: /well-(?:documented|commented)/gi, replace: 'doc' },
  { pattern: /type\s+(?:annotations?|hints?)/gi, replace: 'typed' },
  { pattern: /async\s+(?:await\s+)?/gi, replace: 'async ' },
  
  // Explanation starters
  { pattern: /the\s+(?:concept|idea|notion|principle)\s+(?:of|behind|that)\s+/gi, replace: '' },
  { pattern: /in\s+(?:other\s+)?words?\s+/gi, replace: 'i.e. ' },
  { pattern: /for\s+(?:example|instance)\s+/gi, replace: 'e.g. ' },
  { pattern: /as\s+(?:an\s+)?(?:example|illustration)\s+/gi, replace: 'e.g. ' },
  { pattern: /that\s+(?:is|means?)\s+/gi, replace: ': ' },
  { pattern: /which\s+means?\s+/gi, replace: '→ ' },
  { pattern: /this\s+(?:means?|implies|indicates)\s+that\s+/gi, replace: '→ ' },
];

// ─── Redundant Context Patterns ─────────────────────────────────────────────

const REDUNDANT_PATTERNS = [
  // Repeated agent/tool names in context
  /\b(?:Claude|GPT|Gemini|Copilot|Codex)\s+(?:AI\s+)?(?:assistant|model|language model)\b/gi,
  
  // Self-references
  /\b(?:I am|I'm)\s+(?:a|an)\s+(?:AI|language model|assistant|chatbot)\b[^.]*\./gi,
  /\bAs\s+(?:an\s+)?(?:AI|language model|assistant)\b[^.]*\./gi,

  // Redundant instruction prefixes (common in Continue.dev / OpenCode context)
  /\b(?:Here's?\s+(?:the\s+)?(?:code|solution|answer|result|implementation|example|approach|way)\s*[:\.]?\s*)/gi,
  /\b(?:Here\s+is\s+(?:the\s+)?(?:code|solution|answer|result|implementation|example|approach|way)\s*[:\.]?\s*)/gi,
  /\b(?:The\s+(?:following|below)\s+(?:code|solution|answer|result))\s*[:\.]?\s*/gi,
  /\b(?:This\s+(?:code|solution|function|class|script|program))\s+(?:will|does|handles|implements|takes|returns|accepts)\s+/gi,
];

// ─── Compression Strategies ─────────────────────────────────────────────────

const NO_AGGRESSIVE_WORDS = new Set([
  'the','a','an','this','that','these','those',
  'very','quite','rather','pretty','somewhat',
  'just','only','simply','merely','purely',
  'then','also','too','as','well','still',
  'already','yet','even','ever','never',
  'always','often','usually','frequently','sometimes',
  'really','truly','genuinely','highly','extremely',
  'such','certain','particular','specific','various',
  'every','each','both','all','any','some','few','several',
  'much','many','more','most','lots',
]);

const AGGRESSIVE_WORDS = new Set([
  'the','a','an','this','that','these','those',
  'very','quite','rather','pretty','somewhat',
  'just','only','simply','merely','purely',
  'then','also','too','as','well','still',
  'already','yet','even','ever','never',
  'always','often','usually','frequently','sometimes',
  'really','truly','genuinely','highly','extremely',
  'such','certain','particular','specific','various',
  'every','each','both','all','any','some','few','several',
  'much','many','more','most','lots',
  'with','without','from','into','onto','upon',
  'about','around','between','among','through',
  'during','before','after','until','since',
  'because','since','while','whereas',
  'although','though','however','nevertheless',
  'therefore','thus','hence','consequently',
  'furthermore','moreover','additionally','besides',
  'indeed','surely','certainly','definitely','absolutely',
  'accordingly','subsequently','simultaneously',
]);

const EXTREME_WORDS = new Set([
  'the','a','an','this','that','these','those',
  'very','quite','rather','pretty','just','only','simply',
  'then','also','too','well','still','already','yet','even',
  'always','often','usually','sometimes','really','truly',
  'such','certain','various','every','each','both','all',
  'some','few','several','much','many','more','most',
  'with','without','from','into','onto','upon',
  'about','around','between','among','through',
  'during','before','after','until','since',
  'because','since','while','whereas',
  'although','though','however','nevertheless',
  'therefore','thus','hence','consequently',
  'furthermore','moreover','additionally','besides',
  'indeed','surely','certainly','definitely','absolutely',
  'it','its','itself','they','them','their','themselves',
  'we','us','our','ours','ourselves',
  'you','your','yours','yourself','yourselves',
  'he','him','his','himself','she','her','hers','herself',
  'this','that','these','those',
  'do','does','did','done','doing',
  'have','has','had','having',
  'be','am','is','are','was','were','been','being',
  'will','would','shall','should','can','could','may','might',
  'get','got','gets','getting',
  'make','made','makes','making',
  'use','used','uses','using',
  'need','needs','needed','needing',
  'want','wants','wanted','wanting',
]);

// ─── Core Engine ────────────────────────────────────────────────────────────

class TokenSlimCore {
  /**
   * Compress input text based on compression level
   * @param {string} text - Input prompt or text
   * @param {number} level - 1 (mild), 2 (normal), 3 (aggressive), 4 (extreme)
   * @returns {{ compressed: string, stats: { original: number, compressed: number, saved: number, percent: number } }}
   */
  compress(text, level = 2) {
    if (!text || typeof text !== 'string') {
      return { compressed: text || '', stats: this._emptyStats(text) };
    }

    const originalTokens = this._countTokens(text);
    let result = text;

    // Phase 1: Preserve code blocks and structured data
    const preserved = this._preserveBlocks(result);
    result = preserved.text;

    // Phase 2: Apply compression based on level
    switch (level) {
      case 1: result = this._mildCompress(result); break;
      case 2: result = this._normalCompress(result); break;
      case 3: result = this._aggressiveCompress(result); break;
      case 4: result = this._extremeCompress(result); break;
      default: result = this._normalCompress(result); break;
    }

    // Phase 3: Restore preserved blocks
    result = this._restoreBlocks(result, preserved.blocks);

    // Phase 4: Clean up whitespace
    result = result
      .replace(/\s+/g, ' ')
      .replace(/\s*([.,:;!?)])\s*/g, '$1 ')
      .replace(/\s*([([{])\s*/g, ' $1')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\s{2,}/g, ' ');

    const compressedTokens = this._countTokens(result);
    
    return {
      compressed: result,
      stats: {
        original: originalTokens,
        compressed: compressedTokens,
        saved: originalTokens - compressedTokens,
        percent: originalTokens > 0 
          ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
          : 0
      }
    };
  }

  /**
   * Estimate token count (approximation ~4 chars per token)
   */
  _countTokens(text) {
    if (!text) return 0;
    // Rough but reliable estimation
    const words = text.split(/\s+/).length;
    const chars = text.length;
    return Math.max(words, Math.round(chars / 4));
  }

  /**
   * Preserve code blocks, inline code, JSON, and lists to protect from compression
   */
  _preserveBlocks(text) {
    const blocks = [];
    let index = 0;

    // Mark code blocks first (``` ... ```) — preserve EVERYTHING inside
    text = text.replace(/(```[\s\S]*?```)/g, (match) => {
      const placeholder = `@@BLOCK${index}@@`;
      blocks.push({ content: match });
      index++;
      return placeholder;
    });

    // Mark inline code (`...`)
    text = text.replace(/(`[^`\n]+`)/g, (match) => {
      const placeholder = `@@BLOCK${index}@@`;
      blocks.push({ content: match });
      index++;
      return placeholder;
    });

    return { text, blocks };
  }

  _restoreBlocks(text, blocks) {
    for (let i = 0; i < blocks.length; i++) {
      const placeholder = `@@BLOCK${i}@@`;
      // Use split-join to replace ALL occurrences
      text = text.split(placeholder).join(blocks[i].content);
    }
    return text;
  }



  /**
   * Level 1: Mild compression (~20% saved)
   * - Remove filler words & basic boilerplate
   */
  _mildCompress(text) {
    // Remove filler patterns
    FILLER_PATTERNS.forEach(pattern => {
      text = text.replace(pattern, '');
    });

    // Apply instruction shorthand
    INSTRUCTION_SHORTHAND.forEach(({ pattern, replace }) => {
      text = text.replace(pattern, typeof replace === 'function' ? replace : replace);
    });

    return text;
  }

  /**
   * Level 2: Normal compression (~40% saved)
   * - Everything in mild
   * - Remove redundant context patterns
   * - Remove common stop words
   */
  _normalCompress(text) {
    text = this._mildCompress(text);

    // Remove redundant patterns
    REDUNDANT_PATTERNS.forEach(pattern => {
      text = text.replace(pattern, '');
    });

    // Remove common determiners and modifiers
    text = text.replace(/\b(the|a|an)\s+/gi, '');

    // Reduce multiple spaces to one
    text = text.replace(/\s{2,}/g, ' ');

    return text;
  }

  /**
   * Level 3: Aggressive compression (~60% saved)
   * - Everything in normal
   * - Aggressive word removal
   * - Shorten sentences
   */
  _aggressiveCompress(text) {
    text = this._normalCompress(text);

    // Aggressive phrase compression
    text = text
      .replace(/make sure (?:to|that)/gi, 'ensure')
      .replace(/in order to/gi, 'to')
      .replace(/as well as/gi, '&')
      .replace(/due to the fact that/gi, 'since')
      .replace(/in the event that/gi, 'if')
      .replace(/on a regular basis/gi, 'regularly')
      .replace(/at this point in time/gi, 'now')
      .replace(/in the near future/gi, 'soon')
      .replace(/with the exception of/gi, 'except')
      .replace(/in spite of (?:the fact )?that/gi, 'though')
      .replace(/(?:should|could|would) be/gi, 'be')
      .replace(/(?:should|could|would) not/gi, 'not')
      .replace(/is able to/gi, 'can')
      .replace(/has the ability to/gi, 'can')
      .replace(/is going to/gi, 'will')
      .replace(/ought to/gi, 'should')
      .replace(/such as/gi, 'e.g.')
      .replace(/it is (?:important|essential|crucial|necessary) to/gi, 'must')
      .replace(/it is (?:possible|likely|probable) that/gi, '')
      .replace(/on the other hand/gi, 'otoh');

    // Remove aggressive words (filter-based, more thorough)
    const words = text.split(/\s+/);
    const filtered = words.filter(word => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (!clean) return true;
      if (AGGRESSIVE_WORDS.has(clean)) return false;
      return true;
    });

    text = filtered.join(' ');
    return text;
  }

  /**
   * Level 4: Extreme compression (~80% saved)
   * - Everything in aggressive
   * - Maximum word removal
   * - Drastic shortening (for internal/context use)
   */
  _extremeCompress(text) {
    text = this._aggressiveCompress(text);

    // Extreme phrase stripping
    text = text
      .replace(/i (?:am|will|would|can|could|shall) /gi, '')
      .replace(/you (?:can|could|should|will|may) /gi, '')
      .replace(/(?:this|the) (?:function|code|solution|implementation|program|script)/gi, 'it')
      .replace(/(?:in a|in the|for the|on the|at the) /g, ' ');

    // Strip extreme filler words
    const words = text.split(/\s+/);
    const filtered = words.filter(word => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (!clean) return true;
      if (EXTREME_WORDS.has(clean)) return false;
      return true;
    });

    text = filtered.join(' ');

    // Remove orphaned single letters (not digits/numbers/symbols)
    text = text.replace(/\b[a-z]\b\s*/gi, '');

    return text;
  }

  /**
   * Analyze text and return compression suggestions
   */
  analyze(text) {
    const stats = {};
    
    for (let level = 1; level <= 4; level++) {
      const result = this.compress(text, level);
      stats[`level${level}`] = result.stats;
    }

    const levels = ['Mild', 'Normal', 'Aggressive', 'Extreme'];
    
    return {
      levels: levels.map((name, i) => ({
        name,
        level: i + 1,
        ...stats[`level${i + 1}`]
      })),
      recommendation: this._getRecommendation(stats, text)
    };
  }

  _getRecommendation(stats, text) {
    const lines = text.split('\n').length;
    const words = text.split(/\s+/).length;

    // Short prompts: mild is fine
    if (words < 30) return 1;
    // Medium prompts: normal is best
    if (words < 100) return 2;
    // Long prompts: aggressive for max savings
    if (words < 500) return 3;
    // Very long: extreme
    return 4;
  }

  /**
   * Get token savings summary for display
   */
  summarize(text, level = 2) {
    const result = this.compress(text, level);
    return {
      original: result.stats.original,
      compressed: result.stats.compressed,
      saved: result.stats.saved,
      percent: result.stats.percent,
      level,
      compressed: result.compressed
    };
  }

  _emptyStats(text) {
    return {
      original: 0,
      compressed: 0,
      saved: 0,
      percent: 0
    };
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TokenSlimCore };
}

if (typeof window !== 'undefined') {
  window.TokenSlimCore = TokenSlimCore;
}
