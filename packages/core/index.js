/**
 * TokenSlim Core v1.0.0
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
 * Phase 1: Extract + preserve code blocks & inline code
 * Phase 2: Remove filler words + pleasantries
 * Phase 3: Apply instruction shorthand (implement → impl:, etc.)
 * Phase 4: Remove redundant phrases + common patterns
 * Phase 5: Word-set removal based on level
 * Phase 6: Orphan single-char word removal (aggressive+)
 * Phase 7: Restore preserved code blocks
 * Phase 8: Whitespace cleanup
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

// ─── Shorthand Map ───────────────────────────────────────────
const SHORTHAND_MAP = {
  'implement': 'impl:',
  'generate': 'gen:',
  'create': 'make',
  'function': 'fn',
  'application': 'app',
  'functionality': 'fn',
  'functionalities': 'fn',
  'functionality': 'fn',
  'functionality': 'fn',
  'configuration': 'config',
  'configure': 'config',
  'authentication': 'auth',
  'authorization': 'auth',
  'authenticate': 'auth',
  'documentation': 'docs',
  'document': 'doc',
  'repository': 'repo',
  'initialize': 'init',
  'initialization': 'init',
  'implementation': 'impl',
  'return': '→',
  'returns': '→',
  'argument': 'arg',
  'arguments': 'args',
  'parameter': 'param',
  'parameters': 'params',
  'variable': 'var',
  'value': 'val',
  'values': 'vals',
  'object': 'obj',
  'string': 'str',
  'number': 'num',
  'array': 'arr',
  'boolean': 'bool',
  'callback': 'cb',
  'handler': 'hdlr',
  'message': 'msg',
  'error': 'err',
  'exception': 'exc',
  'response': 'res',
  'request': 'req',
  'database': 'db',
  'server': 'srv',
  'client': 'clt',
  'environment': 'env',
  'development': 'dev',
  'production': 'prod',
  'testing': 'test',
  'utility': 'util',
  'helper': 'hlpr',
  'property': 'prop',
  'properties': 'props',
  'attribute': 'attr',
  'information': 'info',
  'reference': 'ref',
  'identifier': 'id',
  'identification': 'id',
  'additional': 'extra',
  'previous': 'prev',
  'current': 'curr',
  'maximum': 'max',
  'minimum': 'min',
  'optimization': 'opt',
  'optimize': 'opt',
  'optimizations': 'opt',
  'optimized': 'opt',
};

// ─── Filler Words ────────────────────────────────────────────
const FILLER_WORDS_MILD = new Set([
  'basically', 'actually', 'literally', 'honestly', 'essentially',
  'virtually', 'practically', 'frankly', 'truly', 'simply',
  'just', 'very', 'really', 'quite', 'pretty', 'rather',
  'totally', 'absolutely', 'completely', 'entirely',
]);

const FILLER_WORDS_NORMAL = new Set([
  'please', 'thanks', 'thank', 'kindly', 'grateful',
  'appreciate', 'appreciated', 'welcome',
  'basically', 'actually', 'literally', 'honestly', 'essentially',
  'virtually', 'practically', 'frankly', 'just', 'very', 'really',
  'quite', 'pretty', 'rather', 'totally', 'absolutely', 'completely',
  'entirely', 'simply',
  
  // Hedging
  'maybe', 'perhaps', 'possibly', 'probably',
  'hopefully', 'ideally', 'potentially',
  'somewhat', 'somehow', 'slightly',
  'think', 'guess', 'suppose', 'believe',
  'wondering', 'curious',
  
  // Redundant context
  'basically', 'essentially', 'like',
]);

const FILLER_WORDS_AGGRESSIVE = new Set([
  'please', 'thanks', 'thank', 'kindly', 'grateful',
  'appreciate', 'appreciated', 'welcome',
  'basically', 'actually', 'literally', 'honestly', 'essentially',
  'virtually', 'practically', 'frankly', 'just', 'very', 'really',
  'quite', 'pretty', 'rather', 'totally', 'absolutely', 'completely',
  'entirely', 'simply',
  'maybe', 'perhaps', 'possibly', 'probably', 'hopefully',
  'ideally', 'potentially', 'somewhat', 'somehow', 'slightly',
  'think', 'guess', 'suppose', 'believe', 'wondering', 'curious',
  
  // Conjunctions & articles
  'the', 'a', 'an',
  'that', 'these', 'those', 'this',
  
  // Common fillers
  'also', 'well', 'then', 'now', 'so',
  'thus', 'hence', 'therefore',
  'however', 'moreover', 'furthermore', 'nevertheless',
  'nonetheless', 'meanwhile',
  
  // Verbose pronouns
  'your', 'you', 'me', 'my', 'our',
  'would', 'could', 'should', 'might', 'shall',
  
  // Intensifiers (weak)
  'good', 'great', 'awesome', 'nice', 'fine',
  'important', 'necessary', 'relevant',
]);

const FILLER_WORDS_EXTREME = new Set([
  'please', 'thanks', 'thank', 'kindly', 'grateful',
  'appreciate', 'appreciated', 'welcome',
  'basically', 'actually', 'literally', 'honestly', 'essentially',
  'virtually', 'practically', 'frankly', 'just', 'very', 'really',
  'quite', 'pretty', 'rather', 'totally', 'absolutely', 'completely',
  'entirely', 'simply',
  'maybe', 'perhaps', 'possibly', 'probably', 'hopefully',
  'ideally', 'potentially', 'somewhat', 'somehow', 'slightly',
  'think', 'guess', 'suppose', 'believe', 'wondering', 'curious',
  'the', 'a', 'an', 'that', 'these', 'those', 'this',
  'also', 'well', 'then', 'now', 'so',
  'thus', 'hence', 'therefore', 'however', 'moreover',
  'furthermore', 'nevertheless', 'nonetheless', 'meanwhile',
  'your', 'you', 'me', 'my', 'our',
  'would', 'could', 'should', 'might', 'shall',
  'good', 'great', 'awesome', 'nice', 'fine',
  'important', 'necessary', 'relevant',
  
  // All verbs of low value
  'i', 'we', 'he', 'she', 'it', 'they', 'them',
  'is', 'are', 'was', 'were', 'be', 'been', 'am',
  'has', 'have', 'had',
  'do', 'does', 'did',
  'will', 'can', 'may', 'need',
  'want', 'like', 'need',
  'get', 'got', 'make', 'made',
  'use', 'used', 'using',
  'take', 'took', 'taken',
  'give', 'gave', 'given',
  'put', 'let',
  'every', 'each', 'any', 'all', 'some', 'both',
]);

// ─── REDUNDANT PHRASES ───────────────────────────────────────
const REDUNDANT_PHRASES_LEVEL2 = [
  { pattern: /\bas an? (AI assistant|AI|LLM|language model)\b/gi, replacement: '' },
  { pattern: /\bI (?:am|'m) (?:here to|happy to|glad to|ready to|willing to)\b/gi, replacement: '' },
  { pattern: /\bI would (?:like you to|love you to|appreciate it if you)\b/gi, replacement: '' },
  { pattern: /\bcould you please\b/gi, replacement: '' },
  { pattern: /\bplease (make sure|ensure|do)\b/gi, replacement: '' },
  { pattern: /\bthank you (?:for|so much|very much)\b/gi, replacement: '' },
  { pattern: /\byou can (?:also|just|simply)\b/gi, replacement: '' },
  { pattern: /\bif you (?:want|need|would like)\b/gi, replacement: '' },
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
  { pattern: /\ba number of\b/gi, replacement: '' },
  { pattern: /\bthe majority of\b/gi, replacement: 'most' },
  { pattern: /\bis able to\b/gi, replacement: 'can' },
  { pattern: /\bhas the ability to\b/gi, replacement: 'can' },
  { pattern: /\bit is (?:worth noting|important to note) that\b/gi, replacement: '' },
  { pattern: /\bas you (?:can see|may know|might know)\b/gi, replacement: '' },
  { pattern: /\bI'll go ahead and\b/gi, replacement: '' },
  { pattern: /\bgoing to\b/gi, replacement: 'will' },
  { pattern: /\bwants to\b/gi, replacement: 'will' },
];

const REDUNDANT_PHRASES_AGGRESSIVE = [
  { pattern: /\bi (?:would (?:like|love|want)|need|wants?)\b/gi, replacement: '' },
  { pattern: /\bcan you (?:please |)(?:help|assist|check|look at)\b/gi, replacement: '' },
  { pattern: /\bthis is (?:a |an |)(?:great |good |)(?:example|sample) of\b/gi, replacement: '' },
  { pattern: /\bwhat I (?:am trying|mean|want) (?:to say|to do|is)\b/gi, replacement: '' },
  { pattern: /\bplease (?:take a look|check|review|help)\b/gi, replacement: '' },
  { pattern: /\bI (?:was )?(?:wondering|curious|hoping) (?:if|that)\b/gi, replacement: '' },
  { pattern: /\b(?:let me|allow me to|permit me to)\b/gi, replacement: '' },
  { pattern: /\bI have (?:been working on|been trying|been looking at)\b/gi, replacement: '' },
  { pattern: /\bas a (?:matter of fact|result)\b/gi, replacement: '' },
  { pattern: /\bnot only (?:that|this) but\b/gi, replacement: '' },
  { pattern: /\bon the (?:other hand|contrary)\b/gi, replacement: '' },
  { pattern: /\bin (?:order|an effort|an attempt) to\b/gi, replacement: 'to' },
  { pattern: /\bthe (?:aforementioned|abovementioned)\b/gi, replacement: '' },
  { pattern: /\byou (?:should|can|could|might|may) (?:also|then|now)\b/gi, replacement: '' },
  { pattern: /\bI (?:don't|do not) (?:know|think|understand)\b/gi, replacement: '' },
  { pattern: /\bwith that (?:being said|said|in mind)\b/gi, replacement: '' },
  { pattern: /\bin this (?:case|scenario|situation|context)\b/gi, replacement: '' },
];

// ─── TokenSlimCore ───────────────────────────────────────────
function TokenSlimCore() {
  if (!(this instanceof TokenSlimCore)) {
    return new TokenSlimCore();
  }
}

TokenSlimCore.prototype.compress = function (text, level) {
  if (text == null || typeof text !== 'string') return { compressed: text, stats: makeStats(0, 0) };
  if (!text.trim()) return { compressed: text, stats: makeStats(0, 0) };

  level = level || 2;
  if (level < 1) level = 1;
  if (level > 4) level = 4;

  const original = this._countTokens(text);
  const start = performance ? performance.now() : 0;

  // Process
  var result = text;
  
  // Phase 1: Extract code blocks (store, replace, restore later)
  var blocks = [];
  var inlineCodes = [];
  
  // Extract markdown code blocks
  result = result.replace(/```[\s\S]*?```/g, function (match) {
    blocks.push(match);
    return '\x00BLOCK' + (blocks.length - 1) + '\x00';
  });
  
  // Extract inline code
  result = result.replace(/`[^`\n]+`/g, function (match) {
    inlineCodes.push(match);
    return '\x00INLINE' + (inlineCodes.length - 1) + '\x00';
  });
  
  // Phase 2: Remove redundant phrases
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
  
  // Phase 3: Shorthand substitution (no swap: skip words inside placeholders)
  Object.keys(SHORTHAND_MAP).forEach(function (word) {
    var levelCutoff = 0;
    if (level === 1) levelCutoff = 0;
    else if (level === 2) levelCutoff = 10;
    else if (level === 3) levelCutoff = 7;
    else levelCutoff = 5;
    
    if (word.length >= levelCutoff) {
      var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('\\b' + escaped + '\\b', 'gi');
      result = result.replace(re, SHORTHAND_MAP[word]);
    }
  });
  
  // Phase 4: Word-set removal
  var fillerSet;
  if (level === 1) fillerSet = FILLER_WORDS_MILD;
  else if (level === 2) fillerSet = FILLER_WORDS_NORMAL;
  else if (level === 3) fillerSet = FILLER_WORDS_AGGRESSIVE;
  else fillerSet = FILLER_WORDS_EXTREME;
  
  var words = result.split(/\s+/);
  var filtered = [];
  
  for (var i = 0; i < words.length; i++) {
    var w = words[i].replace(/^[^a-zA-Z0-9_#@]+/, '').replace(/[^a-zA-Z0-9_#@]+$/, '').toLowerCase();
    var isFiller = fillerSet.has(w);
    
    // Also remove single-letter tokens (aggressive/extreme)
    if (level >= 3 && w.length === 1 && /^[a-z]$/.test(w) && !/^[a-zA-Z]$/.test(words[i])) {
      continue;
    }
    
    // Skip very short fragments that come from partial word deletion (aggressive+)
    if (level >= 3 && w.length <= 2 && /^[a-zA-Z]+$/.test(w) && words[i].replace(/^[^a-zA-Z0-9_#@]+/, '').length > w.length + 1) {
      // Keep it — it's likely a punctuation-attached real word
    }
    
    if (!isFiller) {
      filtered.push(words[i]);
    }
  }
  
  result = filtered.join(' ');
  
  // Phase 5: Extra cleanup for aggressive+
  if (level >= 3) {
    // Remove "also please", "please also", "and also" patterns
    result = result.replace(/\b(?:also please|please also|and also|also and|of the|of a|in the|for the|to the|on the|at the)\b/gi, '');
    // Remove "make sure to", "be able to", "give you", "provide you"
    result = result.replace(/\b(?:make sure to|make sure that|be able to|give you|provide you|let you|help you)\b/gi, '');
    result = result.replace(/\b(?:a lot of|lots of|plenty of|kind of|sort of|type of)\b/gi, '');
    // Remove "with", "from", "for", "of" when isolated
    result = result.replace(/\b(?:with|from|for|of|in|on|at|by|to|and|or|but|not|nor)\s+(?:with|from|for|of|in|on|at|by|to|and|or|but|not|nor)\b/g, '');
    // Multiple spaces
    result = result.replace(/\s{2,}/g, ' ');
  }
  
  // Level 4 extra — aggressive stripping for extreme savings
  if (level >= 4) {
    // Remove ALL short filler / stop words aggressively
    var extremeWords = [
      'the','a','an','in','on','at','to','for','of','by','with','and','or','but','not','nor',
      'as','be','is','was','do','it','its','this','that','these','those','are','has','have',
      'had','did','does','can','may','will','would','could','should','might','shall','all',
      'any','some','each','every','very','just','also','too','now','then','here','there',
      'so','yet','if','than','no','yes','oh','ah','well','up','down','out','off','over',
      'under','into','upon','about','after','before','between','through','during','without',
      'within','along','among','across','behind','above','below','beneath','beside',
      'am','been','being','having','doing','getting','making','using','taking','giving',
      'keep','keeps','keeping','let','lets','letting','need','needs','needed',
      'you','your','yours','me','my','mine','our','ours','us','we','he','she','they','them',
      'i','itself','yourself','myself','himself','herself','themselves','ourselves',
      'good','great','nice','fine','awesome','wonderful','amazing','fantastic','excellent',
      'perfect','super','best','better','proper','simple','easy','quick','fast','correct',
      'right','wrong','bad','old','new','big','small','large','high','low','long','short',
      'normal','common','usual','special','specific','particular','various','different',
      'multiple','many','much','little','few','lot','lots','plenty','several',
      'such','same','own','very','too','quite','pretty','rather','really','just',
      'want','wants','wanted','get','gets','got','make','makes','made','use','uses',
      'used','take','takes','took','give','gives','gave','put','puts','find','finds',
      'found','show','shows','showed','come','comes','came','look','looks','looked',
      'go','goes','went','know','knows','knew','think','thinks','thought','say','says',
      'said','tell','tells','told','help','helps','helped',
      'also','always','never','often','usually','sometimes','rarely','seldom',
      'try','tries','tried','work','works','worked','run','runs','ran','set','sets',
      'provide','provides','provided','include','includes','included','contain','contains',
      'contained','support','supports','supported','allow','allows','allowed'
    ];
    var extremeRe = new RegExp('\\b(?:' + extremeWords.join('|') + ')\\b', 'gi');
    result = result.replace(extremeRe, '');
    // Start cleanup — remove leading to/a/the
    result = result.replace(/^(?:to|a|the|in|on|at|for|of|by|with|and|or|so)\s+/i, '');
    // Remove isolated single-character tokens
    result = result.replace(/(?:^|\s)[a-zA-Z](?:\s|$)/g, ' ');
    // Remove orphaned punctuation
    result = result.replace(/\s+([.,;:!?])/g, '$1');
    result = result.replace(/([.,;:!?])\s+/g, '$1 ');
    // Squash
    result = result.replace(/\s{2,}/g, ' ');
    // Remove leading/trailing punctuation and whitespace
    result = result.replace(/^[\s.,;:!?]+/, '');
    result = result.replace(/[\s.,;:!?]+$/, '');
    // Second pass: remove any remaining very short words (1-2 chars) that are not code or numbers
    var finalWords = result.split(/\s+/);
    var surviving = [];
    for (var fw = 0; fw < finalWords.length; fw++) {
      var stripped = finalWords[fw].replace(/^[^a-zA-Z0-9_#@]+/, '').replace(/[^a-zA-Z0-9_#@]+$/, '');
      // Always keep code-looking tokens, numbers, and long words
      if (stripped.length >= 3 || /[0-9_#@]/.test(stripped) || stripped === 'fn' || stripped === 'db' || stripped === 'id' || /^[A-Z]/.test(stripped)) {
        surviving.push(finalWords[fw]);
      }
    }
    result = surviving.join(' ');
    // Final cleanup
    result = result.replace(/\s{2,}/g, ' ');
  }
  
  // Phase 6: Restore code blocks
  for (var j = 0; j < blocks.length; j++) {
    result = result.replace('\x00BLOCK' + j + '\x00', blocks[j]);
  }
  
  for (var k = 0; k < inlineCodes.length; k++) {
    result = result.replace('\x00INLINE' + k + '\x00', inlineCodes[k]);
  }
  
  // Phase 7: Final trim + basic punctuation cleanup
  result = result.trim();
  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/\s+([.,:;!?])/g, '$1');
  
  // Clean up hyphen fragments left after word removal (e.g. well-tested → -tested)
  result = result.replace(/(^|\s)-[a-zA-Z]+/g, '$1');
  result = result.replace(/[a-zA-Z]+-(\s|$)/g, '');
  
  // Phase 8: Ensure no double punctuation or awkward spacing
  result = result.replace(/\.\,/g, ',');
  result = result.replace(/\.\./g, '.');
  result = result.replace(/\s*,\s*/g, ', ');
  result = result.replace(/\s*\.\s*/g, '. ');
  result = result.trim();
  
  const compressed = this._countTokens(result);
  const saved = original - compressed;
  const percent = original > 0 ? Math.round((saved / original) * 100) : 0;

  return {
    compressed: result,
    stats: makeStats(original, compressed, saved, percent)
  };
};

// ─── Analyze ─────────────────────────────────────────────────
TokenSlimCore.prototype.analyze = function (text) {
  if (!text || typeof text !== 'string') {
    return { levels: [], recommendation: 2 };
  }

  const levelData = [
    { level: 1, name: 'Mild' },
    { level: 2, name: 'Normal ⭐' },
    { level: 3, name: 'Aggressive' },
    { level: 4, name: 'Extreme' }
  ];

  const origTokens = this._countTokens(text);
  const levels = levelData.map(function (ld) {
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

  // Recommendation: pick level based on savings and length
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
TokenSlimCore.prototype.summarize = function (text, level) {
  const result = this.compress(text, level || 2);
  return {
    original: result.stats.original,
    compressed: result.stats.compressed,
    percent: result.stats.percent,
    saved: result.stats.saved
  };
};

// ─── Token Count Estimation ─────────────────────────────────
TokenSlimCore.prototype._countTokens = function (text) {
  if (!text) return 0;
  // Estimate: max(word_count, char_count/4)
  var words = text.trim().split(/\s+/).length;
  var chars = text.length;
  var charEstimate = Math.ceil(chars / 4);
  return Math.max(words, charEstimate);
};

// ─── Helpers ────────────────────────────────────────────────
function makeStats(original, compressed, saved, percent) {
  saved = saved || (original - compressed);
  percent = percent || (original > 0 ? Math.round((saved / original) * 100) : 0);
  return {
    original: original,
    compressed: compressed,
    saved: saved,
    percent: percent
  };
}

return { TokenSlimCore: TokenSlimCore };

}));
