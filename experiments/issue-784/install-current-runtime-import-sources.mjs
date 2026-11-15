// Install the reviewed full producer proposal; keep every historical API exact.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {readCompleteEvidenceJson} from './complete-evidence-json.mjs';
const input='ci-logs/issue-784-restart-2/current-runtime-import-composition-proposal.json';
const plan=JSON.parse(readCompleteEvidenceJson(input));
assert.equal(plan.schema,'current-runtime-import-source-composition-v1');assert.equal(plan.files.length,12);
assert.equal(plan.originalPublicPreparationUnchanged,true);assert.equal(plan.originalRuntimeIssuersUnchanged,true);
const physical=path=>existsSync(path)?readFileSync(path,'utf8'):null;
for(const row of plan.files){
 assert.equal(physical(row.path),row.current);assert.equal(row.equation.inverse,row.before);
 assert.equal(row.equation.after,row.after);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
 assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);
 }
}
assert.equal(physical(plan.originalProducer.path),plan.originalProducer.after);
assert.equal(physical(plan.originalNodeHelper.path),plan.originalNodeHelper.source);
for(const row of plan.files){assert.equal(physical(row.path),row.current);writeFileSync(row.path,row.after);}
const receipt={schema:'current-runtime-import-composition-installation-v1',input,files:plan.files.map(row=>row.path),
 completeNativeAndConcreteReview:true,originalProducerUnchanged:true,receivingTestsExecuted:false,runtimeParity:false};
const path='ci-logs/issue-784-restart-2/current-runtime-import-composition-install.json.gz',raw=Buffer.from(JSON.stringify(receipt));
writeFileSync(path,gzipSync(raw),{flag:'wx'});assert.ok(gunzipSync(readFileSync(path)).equals(raw));
console.log(JSON.stringify(receipt));
