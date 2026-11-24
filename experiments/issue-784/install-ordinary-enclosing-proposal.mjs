// Review the complete real source proposal before installing its afterimage.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareProjectFacadeRetention} from '../../tools/translation/prepare-project-facade-retention.mjs';

const target='ci-logs/issue-784-restart-2/ordinary-parser-enclosing-complete-proposal.json.gz';
const hash=source=>createHash('sha256').update(source).digest('hex');
const plan=prepareProjectFacadeRetention();
assert.equal(plan.files.length,1);
assert.equal(plan.typescriptVersion,'5.9.3');
assert.equal(plan.sourceAuthority,false);
assert.equal(plan.semanticAuthority,false);
for(const row of plan.files){
 assert.equal(row.inverse,row.before);
 assert.equal(hash(row.before),row.beforeSha256);
 assert.equal(hash(row.after),row.afterSha256);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){
  assert.equal(stage.completeInverse,true);
  assert.equal(JSON.parse(stage.beforeMeta).source,stage.before);
  assert.equal(JSON.parse(stage.afterMeta).source,stage.after);
 }
 assert.equal(row.selection.ordinaryParserEnclosing.inverse,row.selection.ingressBoundary.after);
 assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));
 assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
 assert.equal(readFileSync(row.path,'utf8'),row.current);
}
const raw=Buffer.from(JSON.stringify(plan)+'\n');
assert.ok(raw.length<64*1024*1024);
const packed=gzipSync(raw,{level:9});
assert.deepEqual(gunzipSync(packed),raw);
writeFileSync(target,packed,{flag:'wx'});
assert.deepEqual(readFileSync(target),packed);
for(const row of plan.files){
 assert.equal(readFileSync(row.path,'utf8'),row.current);
 writeFileSync(row.path,row.after);
 assert.equal(readFileSync(row.path,'utf8'),row.after);
}
console.log(JSON.stringify({target,bytes:packed.length,sha256:hash(packed),
 proposalBytes:raw.length,proposalSha256:hash(raw),
 files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),
 sourceAuthority:false,semanticAuthority:false,newExecutableApplicationFunctions:0}));
