/**
 * TokenSlim CLI — Smoke Tests
 * Run: node test.js
 */

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

const CLI = path.join(__dirname, 'index.js');
let passed = 0;
let failed = 0;

function run(args, input) {
  return execFileSync(process.execPath, [CLI].concat(args), {
    input: input,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function runFull(args, input) {
  return spawnSync(process.execPath, [CLI].concat(args), {
    input: input,
    encoding: 'utf-8'
  });
}

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

console.log('\n📦 TokenSlim CLI Smoke Tests\n');

test('compresses a prompt from argv', () => {
  const out = run(['--raw', 'Please kindly generate a function for me, thank you so much!']);
  assert(out.trim().length > 0, 'Should print output');
  assert(!out.toLowerCase().includes('please'), 'Should remove please: ' + out);
});

test('--raw suppresses the stderr progress bar', () => {
  const res = runFull(['--raw', 'Please kindly generate a function for me, thank you so much!']);
  assert(res.status === 0, 'Should exit 0');
  assert(res.stdout.trim().length > 0, 'Should print compressed output');
  assert(res.stderr === '', 'stderr must be empty in raw mode, got: ' + JSON.stringify(res.stderr));
});

test('default mode prints savings bar to stderr', () => {
  const res = runFull(['Please kindly generate a function for me, thank you so much!']);
  assert(res.status === 0, 'Should exit 0');
  assert(res.stderr.includes('Saved'), 'stderr should show savings: ' + JSON.stringify(res.stderr));
});

test('reads from stdin pipe', () => {
  const out = run(['--raw'], 'Please kindly generate the configuration file, thanks!');
  assert(out.trim().length > 0, 'Should print output');
  assert(!out.toLowerCase().includes('thanks'), 'Should remove thanks: ' + out);
});

test('--analyze works with stdin (regression)', () => {
  const out = run(['--analyze'], 'Please kindly generate a long configuration for the application, thank you!');
  assert(out.includes('TokenSlim Analysis'), 'Should print analysis header: ' + out);
  assert(out.includes('Level 1'), 'Should list level 1');
  assert(out.includes('Level 4'), 'Should list level 4');
  assert(out.includes('Recommended'), 'Should print recommendation');
});

test('--level flag is honored via stdin', () => {
  const out = run(['--raw', '--level', '4'], 'I would really appreciate it if you could please help me with this');
  assert(out.trim().length > 0, 'Should print output');
});

test('--stats prints token stats', () => {
  const out = run(['--stats', 'Please generate the application configuration, thank you very much!']);
  assert(out.includes('Original:'), 'Should show original count');
  assert(out.includes('Compressed:'), 'Should show compressed count');
  assert(out.includes('Saved:'), 'Should show saved count');
});

test('--version prints version', () => {
  const out = run(['--version']);
  assert(/TokenSlim CLI v\d+\.\d+\.\d+/.test(out), 'Should print version: ' + out);
});

test('--help prints usage', () => {
  const out = run(['--help']);
  assert(out.includes('Usage:'), 'Should print usage');
  assert(out.includes('--level'), 'Should document --level');
});

test('rejects invalid level', () => {
  let threw = false;
  try {
    run(['--level', '9', 'some text']);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should exit non-zero for invalid level');
});

test('rejects unknown option', () => {
  let threw = false;
  try {
    run(['--bogus', 'some text']);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should exit non-zero for unknown option');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);
if (failed > 0) process.exit(1);
