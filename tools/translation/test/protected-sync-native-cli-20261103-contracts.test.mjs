// SOURCE ONLY case drafts. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const base='tools/translation/source-profiles/protected-sync-native-cli-20261103/',read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
function declarations(ts,source){const file=ts.createSourceFile('source.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);return new Map(file.statements.filter(ts.isFunctionDeclaration).map(node=>[node.name.text,node.getText(file)]));}

test('all complete original builtin producer and Bun generator functions remain exact with original CLI domains',{timeout:60000},()=>{const ts=ownershipCompiler();for(const role of ['builtin-cli','bun-cli']){const before=read(base+role+'.before.txt'),after=read(base+role+'.after.txt'),old=declarations(ts,before),next=declarations(ts,after);for(const [name,source]of old)if(name!=='main')assert.equal(next.get(name),source,name);if(role==='bun-cli'){assert.ok(after.startsWith('#!/usr/bin/env node\n'));assert.ok(after.includes("if(actual!==output.source){changed.push(output.path);if(args[0]==='--emit')mutateProtectedNativeAbsoluteDirectWriter"));assert.ok(after.includes("if(args[0]==='--emit')withProtectedNativeWriter(root,operation);else operation();"));assert.ok(after.includes("if(args[0]==='--check'&&changed.length)process.exitCode=1;"));}else{assert.ok(after.includes("allowProtectedNativeAbsoluteDirectWrites(root,[resolve(root,path),resolve(root,productionPath)])"));assert.ok(after.includes('createProtectedRawCliDirectory(root,args[1])'));assert.ok(after.includes("encoded,{flag:'wx'}"));assert.ok(after.includes("return args[0]==='--write'&&args.length===1||args[0]==='--emit'&&args.length===2?withProtectedNativeWriter(root,operation):operation();"));}}});
