// Restore only this task's first generated candidate through its full inverse.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
const proposal=JSON.parse(gunzipSync(readFileSync('ci-logs/issue-784-restart-2/runtime-binding-batch-source-proposal.json.gz'),{maxOutputLength:96*1024*1024}));
const selected=[['tools/translation/prepare-owned-runtime-import-current.mjs','bindingPreviousEquation'],['tools/translation/test/runtime-import-phased-data.test.mjs','runtimePreviousEquation']];
const rows=selected.map(([path,key])=>{
 const row=proposal.files.find(value=>value.path===path),equation=row[key];
 assert.equal(readFileSync(path,'utf8'),row.after);assert.equal(equation.after,row.after);
 assert.equal(equation.inverse,equation.before);
 for(const stage of equation.stages){
  assert.equal(stage.inverse,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
 }
 return {path,after:row.after,before:equation.inverse};
});
for(const row of rows){assert.equal(readFileSync(row.path,'utf8'),row.after);writeFileSync(row.path,row.before);assert.equal(readFileSync(row.path,'utf8'),row.before);}
console.log(JSON.stringify({restored:rows.map(row=>row.path),reason:'Qualify paths against the explicit repository root before comparison',fullGatePassed:false}));
