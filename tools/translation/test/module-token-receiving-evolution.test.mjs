import test from 'node:test';
import assert from 'node:assert/strict';
import {readOrderingEffectsComparisonSource as readFileSync} from './fixtures/ordering-effects-comparison-history.mjs';
import {gunzipSync} from 'node:zlib';
import {deriveModuleTokenReceivingEvolution} from '../module-token-receiving-evolution.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const path='tools/translation/test/derive-output-effects.test.mjs';
const archive=JSON.parse(gunzipSync(readFileSync(new URL('../source-profiles/facade-ast-receiving-history/complete-inputs.json.gz',import.meta.url)),{maxOutputLength:1048576}));
const template=archive.templates.find(row=>row.path===path).source;
const original=template.replace("'./fixtures/native-proof-json-format.mjs'","'./fixtures/facade-ast-receiving-history.mjs'");
const current=readFileSync(new URL('./derive-output-effects.test.mjs',import.meta.url),'utf8');
function cases(source){
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),rows=[];
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='test'&&ts.isStringLiteral(node.arguments[0]))rows.push({name:node.arguments[0].text,arguments:node.arguments.length});ts.forEachChild(node,visit);}
 visit(file);return rows;
}
test('complete module-token receiving history derives actual source and retains both CST inverses',{timeout:60000},()=>{
 const row=deriveModuleTokenReceivingEvolution(original,current);
 assert.equal(row.after,current);assert.equal(row.inverse,original);assert.equal(row.originalSha256,'75faaa6f0f7e843149303901f9cd97abe73b01a1619fad4c11884c5df27f8efd');
 assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);assert.deepEqual(cases(current),cases(original));assert.ok(cases(current).length>5);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.deepEqual(stage.trace.map(item=>item.phase),['language','repository']);}
});
test('original facade history remains available and all original deadline and source assertions survive the successor',{timeout:60000},()=>{
 const row=deriveModuleTokenReceivingEvolution(original,original);assert.equal(row.current,original);assert.equal(row.after,current);
 for(const assertion of ["const test=(name,body)=>nodeTest(name,{timeout:60_000},body)",'assert.equal(Buffer.byteLength(source),pin.bytes)','assert.equal(digest(source),pin.sha256)','assert.equal(replay,logicalCurrentSource)']){
  assert.ok(original.includes(assertion));assert.ok(row.after.includes(assertion));
 }
 assert.equal(row.nativeSelections.length,2);
});
test('foreign receiving imports weakened history checks and unrelated source never gain a known successor',{timeout:60000},()=>{
 for(const changed of [current+'\n// foreign\n',current.replace("'../prepare-module-token-layout.mjs'","'../foreign.mjs'"),current.replace('assert.equal(history.originalSha256,pin.sha256);',''),current.replace('timeout:60_000','timeout:120_000')]){
  assert.notEqual(changed,current);assert.throws(()=>deriveModuleTokenReceivingEvolution(original,changed),/unregistered complete receiving successor/);
 }
 assert.throws(()=>deriveModuleTokenReceivingEvolution(original+' ',current),/complete original\/current source/);
});
