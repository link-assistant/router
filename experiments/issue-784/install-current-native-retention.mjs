// Install only the reviewed actual current producer's two changed outputs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {assertCurrentNativeOutputTextInputsFresh} from '../../tools/translation/prepare-current-native-output-text-retention.mjs';
const input='ci-logs/issue-784-restart-2/current-native-retention-history-proposal.json.gz';
const packed=readFileSync(input),hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(hash(packed),'fcd1e604d36bf2d10e3a7e96a93d98d6de59e87f932d98fc040a741b8e2a3f83');
const plan=JSON.parse(gunzipSync(packed,{maxOutputLength:64*1024*1024})),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');assert.equal(plan.schema,'complete-current-native-output-retention-v1');
assert.equal(plan.files.length,7);assert.equal(plan.semanticAuthority,false);
const changed=plan.files.filter(row=>row.current!==row.after);
assert.deepEqual(changed.map(row=>row.path),['tools/translation/isolated-native-retained-owned-field-matrix-bulk.mjs','tools/translation/native-owned-field-isolated-matrix-session.mjs']);
for(const row of plan.files){
 assert.equal(readFileSync(row.path,'utf8'),row.current);assert.equal(row.current,row.historical.after);
 assert.equal(row.inverse,row.before);assert.equal(hash(row.after),row.afterSha256);
 assert.equal(row.sourceHistory.before,row.historical.after);assert.equal(row.sourceHistory.after,row.after);
 assert.equal(row.sourceHistory.inverse,row.historical.after);
 for(const candidate of [row,row.historical,row.sourceHistory]){
  assert.deepEqual(candidate.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of candidate.stages){
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);
  }
 }
 for(const source of [row.current,row.after]){
  assert.deepEqual(ts.createSourceFile(row.path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS).parseDiagnostics,[]);
  assert.ok(source.split('\n').length<1000);
 }
}
assert.deepEqual(verifyNativeCopiedModuleBindings(ts,plan.files.map(({path,after})=>({path,source:after}))),plan.files.map(row=>row.nativeBindings));
assertCurrentNativeOutputTextInputsFresh(plan);
const receipt={schema:'reviewed-current-native-retention-installation-v1',input,proposalSha256:hash(packed),
 installed:changed.map(({path,current,afterSha256})=>({path,before:current,afterSha256})),
 completeNativeAndConcreteInverses:true,receivingTestsExecuted:false,runtimeParity:false,rustExecuted:false};
const output='ci-logs/issue-784-restart-2/current-native-retention-history-install.json.gz';
const raw=Buffer.from(JSON.stringify(receipt));writeFileSync(output,gzipSync(raw),{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output)),raw);
assertCurrentNativeOutputTextInputsFresh(plan);
for(const row of changed){assert.equal(readFileSync(row.path,'utf8'),row.current);writeFileSync(row.path,row.after);}
for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.after);
console.log(JSON.stringify({input,output,installed:changed.map(row=>row.path),allSevenOutputsVerified:true,semanticAuthority:false}));
