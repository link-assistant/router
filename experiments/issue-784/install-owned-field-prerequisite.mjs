// Install only the actual nine-file producer output after complete review.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,renameSync,rmdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {assertOwnedFieldBulkInputsFresh} from '../../tools/translation/prepare-owned-field-bulk.mjs';
const folder='/tmp/issue-784-owned-field-prerequisite-a7bcf9526';
const external=folder+'/complete-owned-field-source-proposal.json.gz';
const input='ci-logs/issue-784-restart-2/current-owned-field-prerequisite-proposal.json.gz';
const packed=readFileSync(external),plan=JSON.parse(gunzipSync(packed,{maxOutputLength:64*1024*1024}));
const hash=value=>createHash('sha256').update(value).digest('hex'),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');assert.equal(plan.schema,'complete-owned-field-bulk-source-proposal-v1');
assert.equal(plan.root,process.cwd());assert.equal(plan.files.length,9);
const stale=new Map([
 ['tools/translation/isolated-owned-field-matrix-bulk.mjs','5bbedbd8145425a707a73cf8d6926220433c994e26cc16c96d7ae31c1ea3f03d'],
 ['tools/translation/isolated-retained-owned-field-matrix-bulk.mjs','67c254c153abeece82bccf51b93156dce10485b4a47dbb6c9aea013a8cc523b5'],
 ['tools/translation/owned-field-isolated-matrix-session.mjs','5a731ff9f924930f45c58cd8fc463c63486a9ae430a8558acd9af8cb2b76502c'],
]);
const current=plan.files.map(row=>({path:row.path,source:readFileSync(row.path,'utf8')}));
for(const [at,row]of plan.files.entries()){
 assert.equal(hash(row.source),row.sourceSha256);assert.equal(hash(row.text),row.sha256);
 assert.equal(row.inverse,row.source);assert.equal(row.sourceAuthority,false);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(row.stages[0].source,row.source);assert.equal(row.stages[1].source,row.stages[0].text);
 assert.equal(row.stages[1].text,row.text);
 for(const stage of row.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);
  let next=stage.source;for(const edit of [...stage.edits].reverse()){
   assert.equal(next.slice(edit.start,edit.end),edit.before);
   next=next.slice(0,edit.start)+edit.after+next.slice(edit.end);
  }
  assert.equal(next,stage.text);
  for(const edit of [...stage.edits].reverse()){
   assert.equal(next.slice(edit.afterStart,edit.afterEnd),edit.after);
   next=next.slice(0,edit.afterStart)+edit.before+next.slice(edit.afterEnd);
  }
  assert.equal(next,stage.source);assert.equal(stage.inverse,stage.source);
 }
 for(const source of [current[at].source,row.source,row.text]){
  assert.deepEqual(ts.createSourceFile(row.path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS).parseDiagnostics,[]);
  assert.ok(source.split('\n').length<1000);
 }
 if(stale.has(row.path))assert.equal(hash(current[at].source),stale.get(row.path));
 else assert.equal(current[at].source,row.text);
}
assert.equal(new Set(plan.files.map(row=>row.path)).size,9);
assertOwnedFieldBulkInputsFresh(plan);
for(const row of current)assert.equal(readFileSync(row.path,'utf8'),row.source);
const receipt={schema:'complete-owned-field-prerequisite-installation-v1',input,
 proposalSha256:hash(packed),current,changed:[...stale.keys()],typescriptVersion:ts.version,
 completeNativeGrammarAndConcreteInverses:true,receivingExecuted:false,runtimeParity:false,rustExecuted:false};
const output='ci-logs/issue-784-restart-2/current-owned-field-prerequisite-install.json.gz';
const raw=Buffer.from(JSON.stringify(receipt));writeFileSync(output,gzipSync(raw),{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output)),raw);
renameSync(external,input);assert.deepEqual(readFileSync(input),packed);rmdirSync(folder);
assertOwnedFieldBulkInputsFresh(plan);
for(const [at,row]of plan.files.entries())if(stale.has(row.path)){
 assert.equal(readFileSync(row.path,'utf8'),current[at].source);writeFileSync(row.path,row.text);
}
for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.text);
console.log(JSON.stringify({input,output,installed:[...stale.keys()],allNineOutputsVerified:true,semanticAuthority:false}));
