#!/usr/bin/env node

/**
 * Injects packages/core/index.js into demo/index.html between the
 * TOKENSLIM_CORE_START / TOKENSLIM_CORE_END markers, so the demo
 * always runs the exact same engine as the packages.
 *
 * Run from repo root: node scripts/build-demo.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CORE = path.join(ROOT, 'packages', 'core', 'index.js');
const DEMO = path.join(ROOT, 'demo', 'index.html');

const START = '/* TOKENSLIM_CORE_START */';
const END = '/* TOKENSLIM_CORE_END */';

const coreSource = fs.readFileSync(CORE, 'utf-8');

// A literal "</script>" inside inline JS would terminate the demo's
// <script> element and break the whole page (this happened once).
if (/<\/script/i.test(coreSource)) {
  console.error('❌ core/index.js contains "</script" — cannot embed it inline safely.');
  process.exit(1);
}

const demo = fs.readFileSync(DEMO, 'utf-8');
const startIdx = demo.indexOf(START);
const endIdx = demo.indexOf(END);

if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  console.error('❌ demo/index.html is missing the TOKENSLIM_CORE markers.');
  process.exit(1);
}

const updated =
  demo.slice(0, startIdx + START.length) +
  '\n' + coreSource.trimEnd() + '\n' +
  demo.slice(endIdx);

fs.writeFileSync(DEMO, updated);
console.log('✅ demo/index.html updated with core engine (' + coreSource.length + ' bytes)');
