import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {prepareGuardedBuiltinPlanHistory} from '../prepare-guarded-builtin-plan-history.mjs';
import {restoreCompilerDataAliasHistory} from './fixtures/compiler-data-alias-history.mjs';
import {restoreReceivingSourceHistory,restoreGuardedProofReceivingHistory,readOriginalBuiltinPlanReceivingHistory} from './fixtures/current-receiving-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
function cases(source){const ts=ownershipCompiler(),file=ts.createSourceFile('whole.test.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),rows=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='test'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))rows.push(node.getText(file));ts.forEachChild(node,visit);}visit(file);return rows;}
test('full known guarded/default-byte/alias history preserves every original private-frozen case and inverse',{timeout:60000},()=>{
 const plan=prepareGuardedBuiltinPlanHistory(),row=plan.files[0];assert.equal(plan.files.length,1);assert.equal(plan.history.files.length,5);assert.equal(plan.history.guarded.files.length,3);assert.equal(plan.runtimeImportsUnchanged,true);assert.equal(plan.receivingExecuted,false);assert.deepEqual(cases(row.after),cases(row.before));assert.equal(row.nativeInverse,row.before);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
});
test('exact current source joins retain the original alias hashes and all guarded runtime import bytes',{timeout:60000},()=>{
 for(const name of ['private-frozen-json.mjs','builtin-derive-bang-footprints.mjs','derive-bang-context.mjs']){const url=new URL('../'+name,import.meta.url),current=readFileSync(url,'utf8');let historical=current;if(name==='private-frozen-json.mjs'){const tape=[];historical=restoreGuardedProofReceivingHistory(current,(kind,value)=>tape.push({kind,value}));assert.equal(tape.length,1);assert.equal(tape[0].value.current,current);assert.equal(tape[0].value.inverse,current);assert.ok(current.includes("from './guarded-proof-lexing-intrinsics.mjs'"));assert.ok(historical.includes("from './original-lexing-intrinsics.mjs'"));}if(name==='builtin-derive-bang-footprints.mjs')historical=restoreReceivingSourceHistory(current,'proof-consumer');assert.equal(readOriginalBuiltinPlanReceivingHistory(url,'utf8'),restoreCompilerDataAliasHistory(historical,name));assert.equal(readFileSync(url,'utf8'),current,'actual runtime module is never changed');}
});
test('changed full guarded bodies refuse and unrelated native text/binary reads retain every byte',{timeout:60000},t=>{
 const source=readFileSync(new URL('../private-frozen-json.mjs',import.meta.url),'utf8');assert.throws(()=>restoreGuardedProofReceivingHistory(source+'\n// foreign extension\n'),/unregistered complete guarded consumer/);assert.throws(()=>restoreGuardedProofReceivingHistory(source.replace('function','functioN')),/unregistered complete guarded consumer/);
 const directory=mkdtempSync(join(tmpdir(),'router-guarded-reader-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path=join(directory,'complete.bin'),bytes=Buffer.from([0,1,127,128,255,13,10]);writeFileSync(path,bytes);assert.deepEqual(readOriginalBuiltinPlanReceivingHistory(path),readFileSync(path));const textPath=join(directory,'complete.mjs'),text=source+'\n// unrelated physical source\n';writeFileSync(textPath,text);assert.equal(readOriginalBuiltinPlanReceivingHistory(textPath,'utf8'),text);
});
