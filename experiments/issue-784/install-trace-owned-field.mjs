// Review complete actual producer equations and both native grammars before writing.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,renameSync,rmdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {assertOwnedFieldBulkInputsFresh} from '../../tools/translation/prepare-owned-field-bulk.mjs';
const folder='/tmp/router-784-owned-trace-52e2c04';
const external=folder+'/complete-owned-field-source-proposal.json.gz';
const input='ci-logs/issue-784-restart-2/current-trace-owned-field-proposal.json.gz';
const packed=readFileSync(external),plan=JSON.parse(gunzipSync(packed,{maxOutputLength:64*1024*1024}));
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(plan.schema,'complete-owned-field-bulk-source-proposal-v1');
assert.equal(plan.root,process.cwd());assert.equal(plan.files.length,9);
const changed=new Map([
 ['tools/translation/owned-field-isolated-matrix-session.mjs','2d5e5aa0c17c344bed5bef09ebf679973bcd78a5a59bc45fee01c7a3e7c65690'],
 ['tools/translation/owned-field-isolated-matrix-profile.mjs','3d50cde876528a5b1c96ae443fed8fe0448b978fd359e0741567c1071fb7daf5'],
]);
const current=plan.files.map(row=>({path:row.path,source:readFileSync(row.path,'utf8')}));
const grammars=[];
for(const row of plan.files){
 assert.equal(hash(row.source),row.sourceSha256);assert.equal(hash(row.text),row.sha256);
 assert.equal(row.inverse,row.source);assert.equal(row.sourceAuthority,false);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(row.stages[0].source,row.source);assert.equal(row.stages[1].source,row.stages[0].text);
 assert.equal(row.stages[1].text,row.text);
 for(const stage of row.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);
  let next=stage.source;
  for(const edit of [...stage.edits].reverse()){
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
 const physical=current.find(entry=>entry.path===row.path).source;
 if(changed.has(row.path))assert.equal(hash(physical),changed.get(row.path));else assert.equal(physical,row.text);
 for(const source of new Set([physical,row.source,row.text])){
  assert.ok(source.split('\n').length<1000);
  for(const [engine,args]of [
   [process.execPath,['--input-type=module','--check']],
   ['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]],
  ]){
   const result=spawnSync(engine,args,{input:source,encoding:'utf8',maxBuffer:1048576});
   grammars.push({path:row.path,sha256:hash(source),engine,args,status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr});
   assert.equal(result.status,0,row.path+' '+engine);
  }
 }
}
assert.equal(new Set(plan.files.map(row=>row.path)).size,9);
assertOwnedFieldBulkInputsFresh(plan);
for(const row of current)assert.equal(readFileSync(row.path,'utf8'),row.source);
const receipt={schema:'complete-trace-owned-field-installation-v1',input,proposalSha256:hash(packed),current,changed:[...changed.keys()],grammars,
 completeConcreteInverses:true,nativeSyntaxBeforeInstallation:true,receivingExecuted:false,runtimeParity:false,rustExecuted:false};
const output='ci-logs/issue-784-restart-2/current-trace-owned-field-install.json.gz';
const raw=Buffer.from(JSON.stringify(receipt));writeFileSync(output,gzipSync(raw),{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output)),raw);
renameSync(external,input);assert.deepEqual(readFileSync(input),packed);rmdirSync(folder);
assertOwnedFieldBulkInputsFresh(plan);
for(const row of plan.files)if(changed.has(row.path)){
 assert.equal(readFileSync(row.path,'utf8'),current.find(entry=>entry.path===row.path).source);
 writeFileSync(row.path,row.text);
}
for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.text);
console.log(JSON.stringify({input,output,installed:[...changed.keys()],allNineOutputsVerified:true,semanticAuthority:false}));
