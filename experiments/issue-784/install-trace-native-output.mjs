// Install only the complete current producer afterimage, after independent review.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {assertCurrentNativeOutputTextInputsFresh} from '../../tools/translation/prepare-current-native-output-text-retention.mjs';
const input='ci-logs/issue-784-restart-2/current-trace-native-history-proposal.json.gz';
const packed=readFileSync(input),hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(hash(packed),'9b8cf57b6a535af4339f378f84f7e9bcae4f0be7360ae67c09b27317d103359f');
const plan=JSON.parse(gunzipSync(packed,{maxOutputLength:64*1024*1024}));
assert.equal(plan.schema,'complete-current-native-output-retention-v1');assert.equal(plan.root,process.cwd());
assert.equal(plan.files.length,7);assert.equal(plan.traceFiles.length,7);
const current=plan.files.map(row=>({path:row.path,source:readFileSync(row.path,'utf8')}));
const changes=plan.files.filter(row=>row.current!==row.after).map(row=>row.path);
assert.deepEqual(changes,['tools/translation/native-owned-field-isolated-matrix-session.mjs','tools/translation/native-owned-field-isolated-matrix-profile.mjs']);
function review(candidate){
 assert.equal(candidate.inverse,candidate.before);
 assert.deepEqual(candidate.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(candidate.stages[0].before,candidate.before);
 assert.equal(candidate.stages[1].before,candidate.stages[0].after);
 assert.equal(candidate.stages[1].after,candidate.after);
 for(const stage of candidate.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  let text=stage.before;
  for(const edit of [...stage.edits].reverse()){
   assert.equal(text.slice(...edit.span),edit.expected);
   text=text.slice(0,edit.span[0])+edit.replacement+text.slice(edit.span[1]);
  }
  assert.equal(text,stage.after);
  for(const edit of [...stage.edits].reverse()){
   assert.equal(text.slice(...edit.afterSpan),edit.replacement);
   text=text.slice(0,edit.afterSpan[0])+edit.expected+text.slice(edit.afterSpan[1]);
  }
  assert.equal(text,stage.before);assert.equal(stage.inverse,stage.before);
 }
}
const grammar=[];
for(const [at,row]of plan.files.entries()){
 assert.equal(row.current,current[at].source);assert.equal(row.current,plan.traceFiles[at].after);
 for(const candidate of [row,row.historical,plan.traceFiles[at]]){
  assert.equal(candidate.path,row.path);review(candidate);
  assert.equal(candidate.nativeBindings.nativeSemanticScopeChecked,true);
  assert.equal(candidate.nativeBindings.semanticAuthority,false);
 }
 for(const source of new Set([row.current,row.after])){
  assert.ok(source.split('\n').length<1000);
  for(const [engine,args]of [[process.execPath,['--input-type=module','--check']],
   ['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]]]){
   const result=spawnSync(engine,args,{input:source,encoding:'utf8',maxBuffer:1048576});
   grammar.push({path:row.path,sha256:hash(source),engine,args,status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr});
   assert.equal(result.status,0,row.path+' '+engine);
  }
 }
}
assertCurrentNativeOutputTextInputsFresh(plan);
for(const row of current)assert.equal(readFileSync(row.path,'utf8'),row.source);
const output='ci-logs/issue-784-restart-2/current-trace-native-install.json.gz';
const raw=Buffer.from(JSON.stringify({schema:'complete-trace-native-installation-v1',input,proposalSha256:hash(packed),current,changes,grammar,
 completeConcreteInverses:true,nativeSyntaxBeforeInstallation:true,receivingTestsPassed:false,runtimeParity:false,rustExecuted:false}));
writeFileSync(output,gzipSync(raw),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(output)),raw);
assertCurrentNativeOutputTextInputsFresh(plan);
for(const row of plan.files)if(row.current!==row.after){assert.equal(readFileSync(row.path,'utf8'),row.current);writeFileSync(row.path,row.after);}
for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.after);
console.log(JSON.stringify({output,changes,allSevenOutputsVerified:true,semanticAuthority:false}));
