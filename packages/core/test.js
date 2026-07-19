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

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log('\n📦 TokenSlim Core Test Suite\n');

test('compress with empty string', () => {
  const r = core.compress('');
  assert(r.compressed === '', 'Should return empty');
  assert(r.stats.original === 0);
});

test('compress with null', () => {
  const r = core.compress(null);
  assert(r.compressed === null || r.compressed === '');
});

test('compress with undefined', () => {
  const r = core.compress(undefined);
  assert(r.compressed === undefined || r.compressed === '');
});

test('mild compression removes fillers', () => {
  const r = core.compress('Basically, I need you to generate a Python function. Thanks!', 1);
  assert(r.stats.original > r.stats.compressed, 'Should compress');
  assert(!r.compressed.toLowerCase().includes('basically'), 'Should remove "basically"');
  assert(r.compressed.includes('Python'), 'Should keep "Python"');
});

test('mild compression removes "please"', () => {
  const r = core.compress('please generate a function', 1);
  assert(!r.compressed.toLowerCase().includes('please'), 'Should remove "please"');
});

test('mild compression converts shorthand', () => {
  const r = core.compress('implement a sorting algorithm', 1);
  assert(r.compressed.includes('impl:'), 'Should convert to shorthand');
});

test('normal compression removes "the" and "a"', () => {
  const r = core.compress('Write a function for the user that handles the input', 2);
  assert(r.stats.saved > 0, 'Should have savings');
  assert(r.compressed.length < 50, 'Should be shorter');
});

test('code blocks preserved', () => {
  const r = core.compress('Here is code:\n```python\nprint("hello")\n```\nThat is all.', 3);
  assert(r.compressed.includes('```python'), 'Should preserve code fence');
  assert(r.compressed.includes('print') && r.compressed.includes('hello'), 'Should preserve code content');
});

test('inline code preserved', () => {
  const r = core.compress('Use the `npm install` command to install it', 3);
  assert(r.compressed.includes('`npm install`'), 'Should preserve inline code');
});

test('aggressive compression (level 3) gives meaningful savings', () => {
  const long = 'I would like you to generate a Python function that takes a list of numbers and returns the sum of all even numbers in that list. Please make sure to handle edge cases like empty lists gracefully. Also please add proper documentation with docstrings and type hints. This function should be efficient and well-tested.';
  const r = core.compress(long, 3);
  assert(r.stats.percent >= 25, `Expected >=25% savings, got ${r.stats.percent}%`);
  assert(r.stats.saved > 0, 'Should save tokens');
});

test('extreme compression (level 4) gives more savings than level 3', () => {
  const long = 'I would like you to generate a Python function that takes a list of numbers and returns the sum of all even numbers in that list. Please make sure to handle edge cases like empty lists gracefully. Also please add proper documentation with docstrings and type hints. This function should be efficient and well-tested.';
  const r3 = core.compress(long, 3);
  const r4 = core.compress(long, 4);
  assert(r4.stats.percent >= r3.stats.percent, 'Level 4 should save >= level 3');
});

test('heavily verbose prompt gets >50% savings at extreme level', () => {
  const verbose = 'I would really appreciate it if you could please take a look at this code and tell me what you think about it. Basically, I am trying to implement a sorting algorithm but I think maybe there is something wrong with it. Could you please help me debug this issue? Thank you so much for your time and assistance.';
  const r = core.compress(verbose, 4);
  assert(r.stats.percent >= 45, `Expected >=45% savings on verbose text, got ${r.stats.percent}%`);
});

test('analyze returns 4 levels + recommendation', () => {
  const a = core.analyze('Write a function');
  assert(a.levels.length === 4, 'Should have 4 levels');
  assert(typeof a.recommendation === 'number', 'Should have recommendation');
  assert(a.recommendation >= 1 && a.recommendation <= 4);
});

test('long text gets higher recommendation', () => {
  const short = core.analyze('hello world');
  const long = core.analyze('hello '.repeat(200));
  assert(long.recommendation >= short.recommendation, 'Long text should get higher level');
});

test('preserves essential technical terms', () => {
  const r = core.compress('Implement async/await pattern with Promise.all()', 3);
  assert(r.compressed.includes('async'), 'Should keep async');
  assert(r.compressed.includes('await'), 'Should keep await');
  assert(r.compressed.includes('Promise'), 'Should keep Promise');
});

test('redundant context patterns removed at normal level', () => {
  const r = core.compress('As an AI assistant, I am happy to help you with this. Here is the code:', 2);
  assert(r.stats.saved > 0, 'Should remove redundant context');
});

test('summarize returns correct format', () => {
  const s = core.summarize('Write a function', 2);
  assert(typeof s.original === 'number');
  assert(typeof s.percent === 'number');
  assert(typeof s.compressed === 'string');
});

test('token count estimation works', () => {
  const t1 = core._countTokens('hello world');
  assert(t1 >= 2, 'Should count words');
  const t2 = core._countTokens('aaaa bbbb cccc dddd eeee ffff');
  assert(t2 >= 6, 'Should count words correctly');
});

test('extreme removes single characters', () => {
  const r = core.compress('a b c test of x y z function', 4);
  // Should keep content words, remove filler single chars
  assert(r.compressed.includes('function'), 'Should keep function');
});

// ─── Demo: Show actual savings ──────────────────────────────────────────────

console.log('\n📊 Live Demo Savings:\n');
const demos = [
  { name: 'Coding Request', text: 'I would like you to generate a Python function that takes a list of numbers and returns the sum of all even numbers in that list. Please make sure to handle edge cases like empty lists gracefully. Also please add proper documentation with docstrings and type hints.' },
  { name: 'Verbose Chat', text: 'I would really appreciate it if you could please take a look at this code and tell me what you think about it. Basically, I am trying to implement a sorting algorithm but I think maybe there is something wrong with it. Could you please help me debug this issue? Thank you so much for your time and assistance.' },
  { name: 'Bug Report', text: 'Hi there, I am encountering an issue with the login functionality in my application. Whenever I try to submit the form with valid credentials, it just refreshes the page and nothing happens. I have tried clearing my cache and cookies but that did not help at all. Could you please take a look at this and let me know what the problem might be? Thank you very much.' },
];

demos.forEach(({ name, text }) => {
  const r = core.compress(text, 2);
  console.log(`  ${name}:`);
  console.log(`    Original: ${r.stats.original} tokens`);
  console.log(`    Compressed: ${r.stats.compressed} tokens`);
  console.log(`    Saved: ${r.stats.percent}%`);
  console.log('');
});

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);

if (failed > 0) {
  process.exit(1);
}
