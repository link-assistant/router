// Review and retain the actual complete producer before installing its outputs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareRuntimeImportCurrentSources} from '../../tools/translation/prepare-runtime-import-current-sources.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
const target='ci-logs/issue-784-restart-2/runtime-binding-batch-source-proposal-v3.json.gz';
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(existsSync(target),false);
const proposal=prepareRuntimeImportCurrentSources();
const changed=proposal.files.filter(row=>row.current!==row.after);
assert.deepEqual(changed.map(row=>row.path),['tools/translation/prepare-owned-runtime-import-current.mjs','tools/translation/test/runtime-import-phased-data.test.mjs']);
const row=changed[0];assert.equal(row.current,row.bindingPreviousAfter);
const receiving=changed[1];assert.equal(receiving.current,receiving.runtimePreviousAfter);
assert.equal(receiving.runtimePreviousEquation.inverse,receiving.current);
assert.equal(receiving.runtimePreviousEquation.after,receiving.after);
assert.equal(row.bindingBatch.before,row.current);assert.equal(row.bindingBatch.after,row.after);
assert.equal(row.bindingBatch.inverse,row.current);
for(const equation of [row.equation,row.bindingPreviousEquation]){
 assert.equal(equation.inverse,equation.before);assert.equal(equation.after,row.after);
 for(const stage of equation.stages){
  assert.equal(stage.inverse,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
 }
}
for(const row of proposal.files)assert.equal(readFileSync(row.path,'utf8'),row.current);
const raw=Buffer.from(JSON.stringify(proposal)+'\n'),packed=gzipSync(raw,{level:9,mtime:0});
assert.deepEqual(gunzipSync(packed),raw);writeFileSync(target,packed,{flag:'wx'});
assert.deepEqual(readFileSync(target),packed);
for(const row of changed){assert.equal(readFileSync(row.path,'utf8'),row.current);writeFileSync(row.path,row.after);}
for(const row of proposal.files)assert.equal(readFileSync(row.path,'utf8'),row.after);
console.log(JSON.stringify({target,bytes:packed.length,sha256:hash(packed),rawBytes:raw.length,
 rawSha256:hash(raw),files:changed.map(row=>({path:row.path,sha256:hash(row.after)})),
 fullGatePassed:false,rustExecuted:false,runtimeParity:false}));
