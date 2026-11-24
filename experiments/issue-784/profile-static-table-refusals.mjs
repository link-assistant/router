// Finite diagnostic: execute the exact original refusal callback once.
// This selection is not a complete-file test or deadline qualification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {analyzeJavaScript,translateJavaScript,TranslationError} from '../../tools/translation/js-to-rust/translator.mjs';

const path='tools/translation/js-to-rust/test/static-tables.test.mjs';
const source=readFileSync(path,'utf8'),ts=createRequire(resolve('js/package.json'))('typescript');
assert.equal(ts.version,'5.9.3');
const file=ts.createSourceFile(path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
assert.deepEqual(file.parseDiagnostics,[]);
const tests=file.statements.filter(ts.isExpressionStatement).map(row=>row.expression)
 .filter(row=>ts.isCallExpression(row)&&row.expression.getText(file)==='test');
assert.equal(tests.length,3);
assert.equal(tests[2].arguments[0].text,'whole-module proof refuses table writes, escape paths, shadowing, getter/prototype changes and dynamic constructors');
const callback=tests[2].arguments.at(-1);
assert.ok(ts.isArrowFunction(callback));
const run=Function('assert','analyzeJavaScript','translateJavaScript','TranslationError',
 '"use strict";return ('+callback.getText(file)+');')(assert,analyzeJavaScript,translateJavaScript,TranslationError);
const started=performance.now();
run();
assert.equal(readFileSync(path,'utf8'),source);
console.log(JSON.stringify({schema:'finite-original-static-table-callback-profile-v1',path,
 sourceSha256:createHash('sha256').update(source).digest('hex'),callbackSpan:[callback.getStart(file),callback.end],
 callbackUnchanged:true,invocations:1,elapsedMs:performance.now()-started,
 completeFileQualified:false,deadlineQualified:false,semanticAuthority:false}));
