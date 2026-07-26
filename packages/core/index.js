/**
 * TokenSlim Core v1.1.0
 * =======================
 * AI Prompt Compressor — Universal Module
 * Works in: Browser (script tag) + Node.js (require)
 *
 * Usage:
 *   const { TokenSlimCore } = require('./index.js');
 *   const core = new TokenSlimCore();
 *   core.compress("your prompt", 2);
 *
 *   // Browser:
 *   <script src="index.js">
 *   const core = new TokenSlimCore();
 *
 * ─── Compression Pipeline ────────────────────────────────────
 * Phase 1: Extract + protect code blocks, inline code, URLs, emails
 * Phase 2: Remove redundant phrases (level 2+)
 * Phase 3: Apply shorthand substitutions (safe tier 2+, tight tier 3+)
 * Phase 4: Filler-word removal per line (level-based word sets)
 * Phase 5: Extra pattern cleanup (level 3+) / extreme strip (level 4)
 * Phase 6: Whitespace + punctuation cleanup (newline-preserving)
 * Phase 7: Restore protected segments
 * Phase 8: Safety net — never return empty / never make it worse
 * ──────────────────────────────────────────────────────────────
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    // Also set global for convenience
    root.TokenSlimCore = module.exports.TokenSlimCore;
  } else {
    root.TokenSlimCore = factory().TokenSlimCore;
  }
}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {

"use strict";

var VERSION = '1.1.0';

// ─── Shorthand Maps ──────────────────────────────────────────
// Only standard abbreviations that stay readable to an LLM and do
// not expand the BPE token count (e.g. "hlpr" or "→" often cost
// MORE tokens than the original word, so they are excluded).

// Safe tier — applied at level 2+. Long words with universally
// understood short forms.
var SHORTHAND_SAFE = {
  'configuration': 'config',
  'configurations': 'configs',
  'documentation': 'docs',
  'repository': 'repo',
  'repositories': 'repos',
  'authentication': 'auth',
  'authorization': 'auth',
  'initialization': 'init',
  'initialize': 'init',
  'implementation': 'impl',
  'application': 'app',
  'applications': 'apps',
  'environment': 'env',
  'environments': 'envs',
  'information': 'info',
  'parameter': 'param',
  'parameters': 'params',
  'specification': 'spec',
  'specifications': 'specs',
  'administrator': 'admin',
  'directory': 'dir',
  'directories': 'dirs',
  'maximum': 'max',
  'minimum': 'min',
  'approximately': 'approx',
  'development': 'dev',
  'production': 'prod',
  'database': 'db',
  'databases': 'dbs'
};

// Tight tier — applied at level 3+. Shorter words where the
// abbreviation is still unambiguous in a coding context.
var SHORTHAND_TIGHT = {
  'implement': 'impl',
  'function': 'fn',
  'functions': 'fns',
  'argument': 'arg',
  'arguments': 'args',
  'variable': 'var',
  'variables': 'vars',
  'object': 'obj',
  'boolean': 'bool',
  'callback': 'cb',
  'message': 'msg',
  'error': 'err',
  'response': 'res',
  'request': 'req',
  'previous': 'prev',
  'current': 'curr',
  'property': 'prop',
  'properties': 'props',
  'attribute': 'attr',
  'attributes': 'attrs',
  'reference': 'ref',
  'references': 'refs',
  'utility': 'util',
  'utilities': 'utils',
  'identifier': 'id',
  'identifiers': 'ids',
  'number': 'num',
  'string': 'str'
};

/**
 * Compile a shorthand map into a single alternation regex plus a
 * lookup table, so each tier is applied in one pass.
 * @param {Object.<string,string>} map word → abbreviation
 * @returns {{re: RegExp, map: Object.<string,string>}}
 */
function buildShorthandRule(map) {
  var keys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
  return {
    re: new RegExp('\\b(?:' + keys.join('|') + ')\\b', 'gi'),
    map: map
  };
}

var SHORTHAND_SAFE_RULE = buildShorthandRule(SHORTHAND_SAFE);
var SHORTHAND_TIGHT_RULE = buildShorthandRule(SHORTHAND_TIGHT);

/**
 * Look up the abbreviation for a matched word, preserving the
 * original capitalization ("Configuration" → "Config", "AUTH" style
 * all-caps stays all-caps).
 * @param {string} match the matched word as it appeared in the text
 * @param {Object.<string,string>} map word → abbreviation
 * @returns {string} the abbreviation, case-matched to the input
 */
function shorthandFor(match, map) {
  var repl = map[match.toLowerCase()];
  if (match.length > 1 && match === match.toUpperCase()) {
    return repl.toUpperCase();
  }
  var first = match.charAt(0);
  if (first !== first.toLowerCase()) {
    return repl.charAt(0).toUpperCase() + repl.slice(1);
  }
  return repl;
}

// Abbreviations we must keep in the extreme-level short-word sweep.
var SHORTHAND_VALUES = (function () {
  var set = {};
  [SHORTHAND_SAFE, SHORTHAND_TIGHT].forEach(function (m) {
    Object.keys(m).forEach(function (k) { set[m[k]] = true; });
  });
  return set;
}());

// ─── Filler Words ────────────────────────────────────────────
// Each level's set is a superset of the previous one.

var FILLERS_MILD_LIST = [
  'basically', 'actually', 'literally', 'honestly', 'essentially',
  'virtually', 'practically', 'frankly', 'truly', 'simply',
  'just', 'very', 'really', 'quite', 'totally', 'absolutely',
  'completely', 'entirely', 'definitely', 'certainly', 'obviously'
];

var FILLERS_NORMAL_LIST = FILLERS_MILD_LIST.concat([
  // Pleasantries
  'please', 'thanks', 'thank', 'kindly', 'grateful',
  'appreciate', 'appreciated', 'welcome',
  // Hedging
  'maybe', 'perhaps', 'possibly', 'probably',
  'hopefully', 'ideally', 'potentially',
  'somewhat', 'somehow', 'slightly',
  'wondering', 'curious', 'pretty'
]);

var FILLERS_AGGRESSIVE_LIST = FILLERS_NORMAL_LIST.concat([
  // Articles & demonstratives
  'the', 'a', 'an', 'that', 'these', 'those', 'this',
  // Connectors
  'also', 'well', 'then', 'so', 'rather',
  'thus', 'hence', 'therefore',
  'however', 'moreover', 'furthermore', 'nevertheless',
  'nonetheless', 'meanwhile',
  // Hedging verbs (risky below this level)
  'think', 'guess', 'suppose', 'believe', 'like',
  // Pronouns & modals
  'your', 'you', 'me', 'my', 'our',
  'would', 'could', 'should', 'might', 'shall',
  // Weak qualifiers
  'good', 'great', 'awesome', 'nice', 'fine'
]);

var FILLERS_EXTREME_LIST = FILLERS_AGGRESSIVE_LIST.concat([
  'i', 'we', 'he', 'she', 'it', 'they', 'them',
  'is', 'are', 'was', 'were', 'be', 'been', 'am',
  'has', 'have', 'had',
  'do', 'does', 'did',
  'will', 'can', 'may', 'need', 'now',
  'want', 'get', 'got', 'make', 'made',
  'use', 'used', 'using',
  'take', 'took', 'taken',
  'give', 'gave', 'given',
  'put', 'let',
  'every', 'each', 'any', 'all', 'some', 'both'
]);

/**
 * Build a plain-object set from a word list for O(1) membership tests.
 * @param {string[]} list
 * @returns {Object.<string,boolean>}
 */
function toSet(list) {
  var s = {};
  for (var i = 0; i < list.length; i++) s[list[i]] = true;
  return s;
}

var FILLER_SETS = {
  1: toSet(FILLERS_MILD_LIST),
  2: toSet(FILLERS_NORMAL_LIST),
  3: toSet(FILLERS_AGGRESSIVE_LIST),
  4: toSet(FILLERS_EXTREME_LIST)
};

// ─── Redundant Phrases ───────────────────────────────────────
var REDUNDANT_PHRASES_LEVEL2 = [
  { pattern: /\bas an? (AI assistant|AI|LLM|language model)\b/gi, replacement: '' },
  { pattern: /\bI (?:am|'m) (?:here to|happy to|glad to|ready to|willing to)\b/gi, replacement: '' },
  { pattern: /\bI would (?:really |greatly |truly )?(?:like you to|love you to|appreciate it if you(?: could)?)\b/gi, replacement: '' },
  { pattern: /\bit would be (?:great|nice|helpful|awesome) if you\b/gi, replacement: '' },
  { pattern: /\bcould you please\b/gi, replacement: '' },
  { pattern: /\bplease (make sure|ensure|do)\b/gi, replacement: '$1' },
  { pattern: /\bthank you (?:for|so much|very much)\b/gi, replacement: '' },
  { pattern: /\byou can (?:also|just|simply)\b/gi, replacement: '' },
  { pattern: /\bfeel free to\b/gi, replacement: '' },
  { pattern: /\bgo ahead and\b/gi, replacement: '' },
  { pattern: /\bin (?:order )?to (?:be able to|get started)\b/gi, replacement: 'to' },
  { pattern: /\bdoesn't matter\b/gi, replacement: '' },
  { pattern: /\bno problem\b/gi, replacement: '' },
  { pattern: /\bno worries\b/gi, replacement: '' },
  { pattern: /\bof course\b/gi, replacement: '' },
  { pattern: /\bi think (?:that )?(?:maybe|perhaps)\b/gi, replacement: '' },
  { pattern: /\bat the end of the day\b/gi, replacement: '' },
  { pattern: /\bwhen it comes to\b/gi, replacement: 'for' },
  { pattern: /\bin terms of\b/gi, replacement: 'for' },
  { pattern: /\bdue to the fact that\b/gi, replacement: 'because' },
  { pattern: /\bin order to\b/gi, replacement: 'to' },
  { pattern: /\bthe majority of\b/gi, replacement: 'most' },
  { pattern: /\bis able to\b/gi, replacement: 'can' },
  { pattern: /\bhas the ability to\b/gi, replacement: 'can' },
  { pattern: /\bit is (?:worth noting|important to note) that\b/gi, replacement: '' },
  { pattern: /\bas you (?:can see|may know|might know)\b/gi, replacement: '' },
  { pattern: /\bI'll go ahead and\b/gi, replacement: '' },
  { pattern: /\bas soon as possible\b/gi, replacement: 'ASAP' },
  { pattern: /\b(?:am|is|are) going to\b/gi, replacement: 'will' }
];

var REDUNDANT_PHRASES_AGGRESSIVE = [
  { pattern: /\bi (?:would (?:like|love|want)|need|want)\b/gi, replacement: '' },
  { pattern: /\bcan you (?:please )?(?:help|assist|check|look at)\b/gi, replacement: '' },
  { pattern: /\bwhat I (?:am trying|mean|want) (?:to say|to do|is)\b/gi, replacement: '' },
  { pattern: /\bplease (?:take a look|check|review|help)\b/gi, replacement: '' },
  { pattern: /\bI (?:was )?(?:wondering|curious|hoping) (?:if|that)\b/gi, replacement: '' },
  { pattern: /\b(?:let me|allow me to|permit me to)\b/gi, replacement: '' },
  { pattern: /\bI have (?:been working on|been trying|been looking at)\b/gi, replacement: '' },
  { pattern: /\bas a matter of fact\b/gi, replacement: '' },
  { pattern: /\bnot only (?:that|this) but\b/gi, replacement: '' },
  { pattern: /\bon the (?:other hand|contrary)\b/gi, replacement: '' },
  { pattern: /\bin (?:order|an effort|an attempt) to\b/gi, replacement: 'to' },
  { pattern: /\bthe (?:aforementioned|abovementioned)\b/gi, replacement: '' },
  { pattern: /\byou (?:should|can|could|might|may) (?:also|then|now)\b/gi, replacement: '' },
  { pattern: /\bwith that (?:being said|said|in mind)\b/gi, replacement: '' },
  { pattern: /\bin this (?:case|scenario|situation|context)\b/gi, replacement: '' }
];

// Extreme-level stop word sweep (level 4 only). Negations (not, no,
// nor, never) are deliberately excluded — dropping them inverts meaning.
var EXTREME_WORDS = [
  'the','a','an','in','on','at','to','for','of','by','with','and','or','but',
  'as','be','is','was','do','it','its','this','that','these','those','are','has','have',
  'had','did','does','can','may','will','would','could','should','might','shall','all',
  'any','some','each','every','very','just','also','too','now','then','here','there',
  'so','yet','if','than','yes','oh','ah','well','up','down','out','off','over',
  'under','into','upon','about','after','before','between','through','during','without',
  'within','along','among','across','behind','above','below','beneath','beside',
  'am','been','being','having','doing','getting','making','using','taking','giving',
  'keep','keeps','keeping','let','lets','letting','need','needs','needed',
  'you','your','yours','me','my','mine','our','ours','us','we','he','she','they','them',
  'i','itself','yourself','myself','himself','herself','themselves','ourselves',
  'good','great','nice','fine','awesome','wonderful','amazing','fantastic','excellent',
  'perfect','super','best','better','proper','simple','easy','quick','fast',
  'such','same','own','quite','pretty','rather','really',
  'want','wants','wanted','get','gets','got','make','makes','made','use','uses',
  'used','take','takes','took','give','gives','gave','put','puts','find','finds',
  'found','show','shows','showed','come','comes','came','look','looks','looked',
  'go','goes','went','know','knows','knew','think','thinks','thought','say','says',
  'said','tell','tells','told','help','helps','helped',
  'always','often','usually','sometimes','rarely','seldom',
  'try','tries','tried','provide','provides','provided','allow','allows','allowed'
];
var EXTREME_RE = new RegExp('\\b(?:' + EXTREME_WORDS.join('|') + ')\\b', 'gi');

// ─── TokenSlimCore ───────────────────────────────────────────
/**
 * Prompt compression engine. Stateless — one instance can be reused
 * for any number of compress/analyze calls.
 * @constructor
 */
function TokenSlimCore() {
  if (!(this instanceof TokenSlimCore)) {
    return new TokenSlimCore();
  }
}

TokenSlimCore.VERSION = VERSION;

/**
 * Compress a prompt at the given level (1=Mild … 4=Extreme).
 * Code blocks, inline code, URLs and emails pass through unchanged;
 * output is never empty and never longer than the input.
 * @param {string} text prompt to compress
 * @param {number} [level=2] compression level, clamped to 1-4
 * @returns {{compressed: string, stats: {original: number, compressed: number, saved: number, percent: number}}}
 */
TokenSlimCore.prototype.compress = function (text, level) {
  if (text == null || typeof text !== 'string') return { compressed: text, stats: makeStats(0, 0) };
  if (!text.trim()) return { compressed: text, stats: makeStats(0, 0) };

  level = parseInt(level, 10);
  if (isNaN(level)) level = 2;
  if (level < 1) level = 1;
  if (level > 4) level = 4;

  var original = this._countTokens(text);
  var result = text;

  // ── Phase 1: Protect code blocks, inline code, URLs, emails ──
  var preserved = [];
  function protect(content, trail) {
    preserved.push(content);
    return '\x00P' + (preserved.length - 1) + '\x00' + (trail || '');
  }

  // Fenced code blocks first (may contain inline code / URLs)
  result = result.replace(/```[\s\S]*?```/g, function (m) { return protect(m); });
  // Inline code
  result = result.replace(/`[^`\n]+`/g, function (m) { return protect(m); });
  // URLs — keep trailing sentence punctuation outside the placeholder
  result = result.replace(/\bhttps?:\/\/[^\s]+/gi, function (m) {
    var trail = '';
    var clean = m.replace(/[.,;:!?)\]]+$/, function (t) { trail = t; return ''; });
    return protect(clean, trail);
  });
  // Emails
  result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, function (m) {
    return protect(m);
  });

  // ── Phase 2: Remove redundant phrases ──
  var phrases;
  if (level === 1) {
    phrases = [];
  } else if (level === 2) {
    phrases = REDUNDANT_PHRASES_LEVEL2;
  } else {
    phrases = REDUNDANT_PHRASES_LEVEL2.concat(REDUNDANT_PHRASES_AGGRESSIVE);
  }
  phrases.forEach(function (p) {
    result = result.replace(p.pattern, p.replacement);
  });

  // ── Phase 3: Shorthand substitution ──
  // Level 1 applies none (Mild preserves the original wording).
  if (level >= 2) {
    result = result.replace(SHORTHAND_SAFE_RULE.re, function (m) {
      return shorthandFor(m, SHORTHAND_SAFE_RULE.map);
    });
  }
  if (level >= 3) {
    result = result.replace(SHORTHAND_TIGHT_RULE.re, function (m) {
      return shorthandFor(m, SHORTHAND_TIGHT_RULE.map);
    });
  }

  // ── Phase 4 + 5: Per-line word filtering and level extras ──
  // Working line-by-line keeps lists, headings and paragraphs intact.
  var fillerSet = FILLER_SETS[level];
  var lines = result.split('\n');
  for (var li = 0; li < lines.length; li++) {
    lines[li] = compressLine(lines[li], level, fillerSet);
  }
  result = lines.join('\n');

  // ── Phase 6: Whitespace + punctuation cleanup (newline-safe) ──
  // Blank-line handling: mild/normal keep paragraph breaks, higher
  // levels collapse them for extra savings.
  if (level <= 2) {
    result = result.replace(/\n{3,}/g, '\n\n');
  } else {
    result = result.replace(/[ \t]*\n+/g, '\n');
  }
  result = result.replace(/[ \t]{2,}/g, ' ');
  result = result.replace(/[ \t]+([.,;:!?])/g, '$1');
  // Collapse repeats of the same punctuation mark left by removals
  result = result.replace(/([,;:!?])(?:[ \t]*\1)+/g, '$1');
  // Orphan hyphen fragments from partial phrase removal (level 3+),
  // e.g. "well-tested" losing "well" → "-tested" becomes "tested".
  if (level >= 3) {
    result = result.replace(/(^|[ \t])-+([A-Za-z])/gm, '$1$2');
    result = result.replace(/([A-Za-z])-+(?=[ \t]|$)/gm, '$1');
  }
  result = result.replace(/^[ \t]+|[ \t]+$/gm, '');
  result = result.trim();

  // ── Phase 7: Restore protected segments ──
  // Function replacement avoids `$&`-style patterns inside code
  // blocks being interpreted by String.replace.
  result = result.replace(/\x00P(\d+)\x00/g, function (_m, idx) {
    return preserved[parseInt(idx, 10)];
  });

  // ── Phase 8: Safety net ──
  var compressed = this._countTokens(result);
  if (!result.trim() || compressed >= original) {
    // Never hand back an empty prompt, and never make it worse.
    return { compressed: text, stats: makeStats(original, original) };
  }

  return {
    compressed: result,
    stats: makeStats(original, compressed)
  };
};

/**
 * Per-line word filtering + level 3/4 extras. Operates on a single
 * line, so it can never destroy list/paragraph structure.
 * @param {string} line single line of already-protected text
 * @param {number} level compression level 1-4
 * @param {Object.<string,boolean>} fillerSet filler words for this level
 * @returns {string} the compressed line
 */
function compressLine(line, level, fillerSet) {
  if (!line.trim()) return '';

  var words = line.split(/[ \t]+/);
  var filtered = [];

  for (var i = 0; i < words.length; i++) {
    var w = words[i].replace(/^[^a-zA-Z0-9_#@\x00]+/, '').replace(/[^a-zA-Z0-9_#@\x00]+$/, '').toLowerCase();
    if (fillerSet[w] === true) continue;
    filtered.push(words[i]);
  }

  var out = filtered.join(' ');

  if (level >= 3) {
    out = out.replace(/\b(?:also please|please also|and also|also and|of the|of a|in the|for the|to the|on the|at the)\b/gi, '');
    out = out.replace(/\b(?:make sure to|make sure that|be able to|give you|provide you|let you|help you)\b/gi, '');
    out = out.replace(/\b(?:a lot of|lots of|plenty of|kind of|sort of)\b/gi, '');
    out = out.replace(/\b(?:with|from|for|of|in|on|at|by|to|and|or|but) +(?:with|from|for|of|in|on|at|by|to|and|or|but)\b/g, '');
  }

  if (level >= 4) {
    out = out.replace(EXTREME_RE, '');
    // Drop isolated single letters left behind
    out = out.replace(/(?:^|[ \t])[A-Za-z](?=[ \t]|$)/g, ' ');
    out = out.replace(/[ \t]{2,}/g, ' ').trim();
    // Second pass: drop leftover 1-2 char fragments that are not
    // numbers, code-ish tokens, placeholders or known abbreviations.
    var finalWords = out.split(/[ \t]+/);
    var surviving = [];
    for (var fw = 0; fw < finalWords.length; fw++) {
      var stripped = finalWords[fw].replace(/^[^a-zA-Z0-9_#@\x00]+/, '').replace(/[^a-zA-Z0-9_#@\x00]+$/, '');
      if (stripped.length >= 3 ||
          /[0-9_#@\x00]/.test(stripped) ||
          SHORTHAND_VALUES[stripped.toLowerCase()] === true ||
          stripped.toLowerCase() === 'no' ||
          /^[A-Z]/.test(stripped)) {
        surviving.push(finalWords[fw]);
      }
    }
    out = surviving.join(' ');
  }

  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

// ─── Analyze ─────────────────────────────────────────────────
/**
 * Compress the text at all four levels and recommend one based on
 * the prompt's estimated length.
 * @param {string} text prompt to analyze
 * @returns {{levels: Array<{level: number, name: string, original: number, compressed: number, saved: number, percent: number}>, recommendation: number}}
 */
TokenSlimCore.prototype.analyze = function (text) {
  if (!text || typeof text !== 'string') {
    return { levels: [], recommendation: 2 };
  }

  var levelData = [
    { level: 1, name: 'Mild' },
    { level: 2, name: 'Normal ⭐' },
    { level: 3, name: 'Aggressive' },
    { level: 4, name: 'Extreme' }
  ];

  var origTokens = this._countTokens(text);
  var levels = levelData.map(function (ld) {
    var r = this.compress(text, ld.level);
    return {
      level: ld.level,
      name: ld.name,
      original: r.stats.original,
      compressed: r.stats.compressed,
      saved: r.stats.saved,
      percent: r.stats.percent
    };
  }, this);

  var rec = 2;
  if (origTokens > 300) rec = 3;
  if (origTokens > 500) rec = 4;
  if (origTokens < 50) rec = 1;

  return {
    levels: levels,
    recommendation: rec
  };
};

// ─── Summarize (quick stats) ────────────────────────────────
/**
 * Compress and return only the token statistics.
 * @param {string} text prompt to compress
 * @param {number} [level=2] compression level 1-4
 * @returns {{original: number, compressed: number, percent: number, saved: number}}
 */
TokenSlimCore.prototype.summarize = function (text, level) {
  var result = this.compress(text, level || 2);
  return {
    original: result.stats.original,
    compressed: result.stats.compressed,
    percent: result.stats.percent,
    saved: result.stats.saved
  };
};

// ─── Token Count Estimation ─────────────────────────────────
/**
 * Rough BPE-style token estimate: max(word count, chars / 4). Real
 * tokenizers differ per model; this is intentionally conservative.
 * @param {string} text
 * @returns {number} estimated token count
 */
TokenSlimCore.prototype._countTokens = function (text) {
  if (!text || !text.trim()) return 0;
  var words = text.trim().split(/\s+/).length;
  var charEstimate = Math.ceil(text.length / 4);
  return Math.max(words, charEstimate);
};

// ─── Helpers ────────────────────────────────────────────────
/**
 * Build the stats object returned alongside every compression.
 * @param {number} original estimated tokens before compression
 * @param {number} compressed estimated tokens after compression
 * @returns {{original: number, compressed: number, saved: number, percent: number}}
 */
function makeStats(original, compressed) {
  var saved = original - compressed;
  var percent = original > 0 ? Math.round((saved / original) * 100) : 0;
  return {
    original: original,
    compressed: compressed,
    saved: saved,
    percent: percent
  };
}

return { TokenSlimCore: TokenSlimCore };

}));
