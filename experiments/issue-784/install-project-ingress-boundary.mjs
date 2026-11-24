// Install only the existing producer's complete checked source equation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareProjectFacadeRetention} from '../../tools/translation/prepare-project-facade-retention.mjs';
const output='ci-logs/issue-784-restart-2/project-ingress-complete-proposal.json.gz';
const started=performance.now(),plan=prepareProjectFacadeRetention();
assert.equal(plan.files.length,1);
for(const row of plan.files){
 assert.equal(readFileSync(row.path,'utf8'),row.current);
 assert.equal(row.selection.ingressBoundary.inverse,row.selection.namespaceObserver.after);
 assert.equal(row.inverse,row.before);
 assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
}
const raw=Buffer.from(JSON.stringify(plan)+'\n');
assert.ok(raw.length<64*1024*1024);
const packed=gzipSync(raw,{level:6});
writeFileSync(output,packed,{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}),raw);
for(const row of plan.files){
 assert.equal(readFileSync(row.path,'utf8'),row.current);
 writeFileSync(row.path,row.after);
 assert.equal(readFileSync(row.path,'utf8'),row.after);
}
console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,
 output,rawBytes:raw.length,packedBytes:packed.length,
 rawSha256:createHash('sha256').update(raw).digest('hex'),
 elapsedMilliseconds:performance.now()-started,
 files:plan.files.map(row=>({path:row.path,afterSha256:row.afterSha256,
  nativeBindings:row.nativeBindings,phases:row.trace.map(stage=>stage.phase)})),
 receivingQualified:false,performanceQualified:false,productionExecutableGain:0}));
