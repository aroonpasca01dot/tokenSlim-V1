/**
 * TokenSlim Core — Test Suite
 * Run: node test.js
 */

const { TokenSlimCore } = require('./index.js');
const core = new TokenSlimCore();

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

// ─── Basic API ───────────────────────────────────────────────
console.log('\n📦 TokenSlim Core Test Suite\n');

test('compress empty string returns empty', () => {
  const r = core.compress('');
  assert(r.compressed === '', 'Should return empty string');
  assert(r.stats.original === 0, 'Stats should be 0');
});

test('compress null returns null', () => {
  const r = core.compress(null);
  assert(r.compressed === null, 'Should return null');
});

test('compress undefined returns undefined', () => {
  const r = core.compress(undefined);
  assert(r.compressed === undefined, 'Should return undefined');
});

test('default level is 2 (normal)', () => {
  const r = core.compress('hello world test');
  assert(r.stats.original >= 3, 'Should count >=3 tokens');
});

test('invalid level values are clamped', () => {
  const r0 = core.compress('Please generate the code now, thanks a lot!', 0);
  const r9 = core.compress('Please generate the code now, thanks a lot!', 9);
  const rx = core.compress('Please generate the code now, thanks a lot!', 'x');
  assert(typeof r0.compressed === 'string', 'Level 0 should clamp to 1');
  assert(typeof r9.compressed === 'string', 'Level 9 should clamp to 4');
  assert(typeof rx.compressed === 'string', 'Non-numeric level should default');
});

// ─── Level semantics ─────────────────────────────────────────

test('level 1 removes "basically" but keeps pleases', () => {
  const r = core.compress('Basically, please generate a function for me today', 1);
  assert(!r.compressed.toLowerCase().includes('basically'), 'Should remove basically');
  assert(r.compressed.toLowerCase().includes('please'), 'Mild should keep please');
});

test('level 1 (Mild) applies NO shorthand rewriting', () => {
  const r = core.compress('Basically return the value of the document configuration', 1);
  assert(r.compressed.includes('return'), 'Mild should keep "return"');
  assert(r.compressed.includes('value'), 'Mild should keep "value"');
  assert(r.compressed.includes('configuration'), 'Mild should keep "configuration"');
});

test('level 2 applies safe shorthand only', () => {
  const r = core.compress('initialize repository configuration with authentication values', 2);
  assert(r.compressed.includes('init'), 'Should have init');
  assert(r.compressed.includes('repo'), 'Should have repo');
  assert(r.compressed.includes('config'), 'Should have config');
  assert(r.compressed.includes('auth'), 'Should have auth');
  assert(r.compressed.includes('values'), 'Short words untouched at level 2');
});

test('level 2 never rewrites more than level 1', () => {
  const t = 'return the value of the document';
  const r1 = core.compress(t, 1);
  const r2 = core.compress(t, 2);
  assert(r1.compressed.includes('return') && r2.compressed.includes('return'),
    'Neither level should mangle "return"');
});

test('level 2 removes pleasantries', () => {
  const r = core.compress('I want a function for the user. Please help. Thank you!', 2);
  assert(r.stats.saved > 0, 'Should save some tokens');
  assert(!r.compressed.toLowerCase().includes('please'), 'Should remove please');
  assert(!r.compressed.toLowerCase().includes('thank'), 'Should remove thank');
});

test('level 3 aggressively compresses', () => {
  const t = 'I would like you to implement a Python function that takes a list of numbers';
  const r = core.compress(t, 3);
  assert(r.stats.percent >= 25, `Level 3 should save >=25%, got ${r.stats.percent}%`);
});

test('level 4 extreme gives >= level 3 savings', () => {
  const t = 'I would like you to implement a Python function that takes a list of numbers and returns the sum. Please also add documentation.';
  const r3 = core.compress(t, 3);
  const r4 = core.compress(t, 4);
  assert(r4.stats.percent >= r3.stats.percent, `L4(${r4.stats.percent}%) should >= L3(${r3.stats.percent}%)`);
});

test('heavily verbose prompt gets >50% at extreme', () => {
  const t = 'I would really appreciate it if you could please take a look at this code and tell me what you think about it. Basically, I am trying to implement a sorting algorithm but I think maybe there is something wrong with it. Could you please help me debug this issue? Thank you so much for your time and assistance.';
  const r = core.compress(t, 4);
  assert(r.stats.percent >= 50, `Expected >=50% for verbose, got ${r.stats.percent}%`);
});

// ─── Code preservation (regression tests) ───────────────────

test('code blocks are preserved byte-for-byte', () => {
  const block = '```python\nresult = obj.method(3.14)\nprint("hello")\n```';
  const r = core.compress('Here is the code please:\n' + block + '\nThat is all, thanks.', 4);
  assert(r.compressed.includes(block), 'Block must survive unchanged, got: ' + r.compressed);
});

test('inline code with dots is not mangled', () => {
  const r = core.compress('Use `Promise.all()` and check the result please', 2);
  assert(r.compressed.includes('`Promise.all()`'), 'Inline code must keep dots: ' + r.compressed);
});

test('inline code with CLI flags is not mangled', () => {
  const r = core.compress('Run `npm install -g tokenslim` first please', 3);
  assert(r.compressed.includes('`npm install -g tokenslim`'), 'Flags must survive: ' + r.compressed);
});

test('code block containing $& is restored correctly', () => {
  const block = '```js\ns.replace(/x/, "$& matched $1");\n```';
  const r = core.compress('Fix this please:\n' + block, 3);
  assert(r.compressed.includes('$& matched $1'), 'Dollar patterns must survive restore: ' + r.compressed);
});

test('multiple code blocks restored in order', () => {
  const r = core.compress('First:\n```\naaa.bbb\n```\nthen second:\n```\nccc.ddd\n```\nthanks', 3);
  const iA = r.compressed.indexOf('aaa.bbb');
  const iC = r.compressed.indexOf('ccc.ddd');
  assert(iA >= 0 && iC > iA, 'Both blocks in order: ' + r.compressed);
});

// ─── Content protection (regression tests) ──────────────────

test('URLs survive extreme compression', () => {
  const r = core.compress('Fetch https://example.com/the-docs/all-of-it for details please', 4);
  assert(r.compressed.includes('https://example.com/the-docs/all-of-it'),
    'URL must be intact: ' + r.compressed);
});

test('emails survive compression', () => {
  const r = core.compress('Please contact the-admin@example.com about this issue', 3);
  assert(r.compressed.includes('the-admin@example.com'), 'Email must be intact: ' + r.compressed);
});

test('decimal numbers are not split', () => {
  const r = core.compress('Please set the timeout to 3.14 seconds exactly', 2);
  assert(r.compressed.includes('3.14'), 'Decimal must stay intact: ' + r.compressed);
});

test('technical terms preserved at extreme', () => {
  const r = core.compress('Implement async/await pattern with Promise.all()', 4);
  assert(r.compressed.includes('async'), 'Should keep async');
  assert(r.compressed.includes('await'), 'Should keep await');
  assert(r.compressed.includes('Promise'), 'Should keep Promise');
});

// ─── Structure preservation ─────────────────────────────────

test('line structure preserved at level 2', () => {
  const r = core.compress('Steps to follow:\n1. install the deps\n2. configure the app\n3. run the tests', 2);
  const lines = r.compressed.split('\n');
  assert(lines.length === 4, `Expected 4 lines, got ${lines.length}: ` + JSON.stringify(r.compressed));
});

test('paragraph breaks kept at level 2', () => {
  const r = core.compress('First paragraph about the app.\n\nSecond paragraph about the tests.', 2);
  assert(r.compressed.includes('\n\n'), 'Blank line must survive: ' + JSON.stringify(r.compressed));
});

// ─── Safety guarantees ──────────────────────────────────────

test('never returns empty output for non-empty input', () => {
  const r = core.compress('Thanks so much, really appreciate it!', 4);
  assert(r.compressed.trim().length > 0, 'Must never return empty');
});

test('savings are never negative (any level)', () => {
  const samples = [
    'hi', 'ok thanks', 'Fix the bug now',
    'Please implement the authentication configuration for the application',
    'x '.repeat(100)
  ];
  for (const s of samples) {
    for (let lvl = 1; lvl <= 4; lvl++) {
      const r = core.compress(s, lvl);
      assert(r.stats.saved >= 0, `Negative savings for ${JSON.stringify(s)} L${lvl}`);
      assert(r.stats.compressed <= r.stats.original, 'Compressed must be <= original');
    }
  }
});

// ─── Analyze / summarize ────────────────────────────────────

test('analyze returns all 4 levels', () => {
  const a = core.analyze('Write a function that sorts numbers');
  assert(a.levels.length === 4, 'Should have 4 levels');
  assert(a.recommendation >= 1 && a.recommendation <= 4, 'Should have valid recommendation');
});

test('long text gets higher recommendation', () => {
  const short = core.analyze('hello world');
  const long = core.analyze('hello '.repeat(200));
  assert(long.recommendation >= short.recommendation, 'Long text should recommend higher');
});

test('summarize returns correct format', () => {
  const s = core.summarize('Write a function', 2);
  assert(typeof s.original === 'number', 'Should have original count');
  assert(typeof s.percent === 'number', 'Should have percent');
  assert(typeof s.compressed === 'number', 'Should have compressed count');
  assert(typeof s.saved === 'number', 'Should have saved count');
});

test('token counting works', () => {
  const t1 = core._countTokens('hello world');
  assert(t1 >= 2, 'Should count "hello world" as >=2');
  const t2 = core._countTokens('a b c d e f g h i j k l m n o p');
  assert(t2 >= 16, 'Should count 16 words');
});

test('redundant context patterns removed at level 2', () => {
  const r = core.compress('As an AI assistant, I am happy to help you with this. Here is the code:', 2);
  assert(r.stats.saved > 0, 'Should remove redundant intro');
});

// ─── Demo: Realistic savings ────────────────────────────────
console.log('\n📊 Real-world Demo Savings:\n');

const demos = [
  { name: '💻  Coding Request', level: 2, text: 'I would like you to generate a Python function that takes a list of numbers and returns the sum of all even numbers in that list. Please make sure to handle edge cases like empty lists gracefully. Also please add proper documentation with docstrings and type hints.' },
  { name: '🐛  Bug Report', level: 2, text: 'Hi there, I am encountering an issue with the login functionality in my application. Whenever I try to submit the form with valid credentials, it just refreshes the page and nothing happens. I have tried clearing my cache and cookies but that did not help at all. Could you please take a look at this and let me know what the problem might be? Thank you very much.' },
  { name: '💬  Verbose Chat', level: 3, text: 'I would really appreciate it if you could please take a look at this code and tell me what you think about it. Basically, I am trying to implement a sorting algorithm but I think maybe there is something wrong with it. Could you please help me debug this issue? Thank you so much for your time and assistance.' },
  { name: '🤖  Agent Context', level: 3, text: 'As an AI assistant, I am here to help you with your coding tasks. Please provide me with the details of what you would like me to implement and I will do my best to generate the optimal solution for you. I am a large language model trained on a diverse dataset and I can help with a wide variety of programming languages, frameworks, and tools.' },
];

demos.forEach(d => {
  const r = core.compress(d.text, d.level);
  const bar = '█'.repeat(Math.round(r.stats.percent / 5)) + '░'.repeat(20 - Math.round(r.stats.percent / 5));
  console.log(`  ${d.name} (Level ${d.level}):`);
  console.log(`    ${r.stats.original} → ${r.stats.compressed} tokens | Save ${r.stats.percent}% [${bar}]`);
});

// ─── Results ─────────────────────────────────────────────────
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);

if (failed > 0) process.exit(1);
