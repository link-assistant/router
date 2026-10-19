import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { checkProgram } from '../src/translation/check.js';
import { emitJavaScript } from '../src/translation/emit-javascript.js';
import { parseJavaScript } from '../src/translation/javascript.js';
import { translateProgram } from '../src/program-translation.js';
import { readStringTestOperation } from '../src/translation/frontend-rules.js';

const source = `/** @param {string} value @returns {boolean} */
function allTests(value) { return value.startsWith('👋') && value.endsWith('.js') && value.includes('é'); }
/** @param {string} value @returns {boolean} */
function emptySearch(value) { return value.startsWith('') && value.endsWith('') && value.includes(''); }
console.log(allTests('👋 café.js'), emptySearch(''), emptySearch('你好'), allTests('cafe.js'));
`;

test('string predicates preserve Unicode, empty searches and negative results', () => {
  const expected = 'true true true false\n';
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', source], { encoding: 'utf8' }), expected);
  assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', emitJavaScript(checkProgram(parseJavaScript(source))).text], { encoding: 'utf8' }), expected);
  for (const target of ['Rust', 'Lean', 'Rocq']) assert.equal(translateProgram(source, 'JavaScript', target).diagnostic, null, target);
});

test('string predicate decisions distinguish source language spellings', () => {
  for (const [js, rust] of [['startsWith', 'starts_with'], ['endsWith', 'ends_with'], ['includes', 'contains']]) {
    assert.equal(readStringTestOperation('JavaScript', js), js);
    assert.equal(readStringTestOperation('Rust', rust), js);
    assert.equal(readStringTestOperation('JavaScript', rust), '');
    assert.equal(readStringTestOperation('Rust', js), '');
  }
});
