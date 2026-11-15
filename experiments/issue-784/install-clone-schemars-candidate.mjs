// Install only the actual producer's complete, reviewed Clone receiving copy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareSchemarsWithOutputProposal} from '../../tools/translation/prepare-schemars-with-output.mjs';
import {assertSchemarsEnclosingHistoryFresh} from '../../tools/translation/schemars-enclosing-history.mjs';
import {assertSchemarsCurrentEnclosingHistoryFresh} from '../../tools/translation/schemars-current-enclosing-history.mjs';
import {assertCloneEnclosingSourceInputsFresh} from '../../tools/translation/prepare-clone-enclosing-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const root=process.cwd(),prefix='ci-logs/issue-784-restart-2/current-clone-schemars';
const hash=value=>createHash('sha256').update(value).digest('hex');
const started=performance.now(),plan=prepareSchemarsWithOutputProposal({root});
assert.equal(plan.typescriptVersion,'5.9.3');
assert.equal(plan.files.length,3);assert.equal(plan.sourceAuthority,false);
const changed=plan.files.filter(row=>row.current!==row.after);
assert.deepEqual(changed.map(row=>row.path),['tools/translation/schemars-with-context-candidate.mjs']);
for(const row of plan.files){
 assert.equal(readFileSync(row.path,'utf8'),row.current);
 assert.equal(hash(row.after),row.afterSha256);assert.equal(row.inverse,row.before);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  assert.equal(stage.inverse,stage.before);
 }
 assert.equal(row.nativeInverse.before,row.before);
 assert.equal(row.nativeInverse.language,row.language);
}
const clone=changed[0].changes.byteScope;
assert.equal(clone.cloneSourceHistory.after,plan.enclosingHistory.current);
assert.equal(clone.cloneSourceComposition.inverse,clone.cloneSourceComposition.before);
assertCloneEnclosingSourceInputsFresh(clone.cloneSourceHistory);
assertCloneEnclosingSourceInputsFresh(clone.cloneSourceComposition);
const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
const copied=verifyNativeCopiedModuleBindings(ts,plan.files.map(row=>({path:resolve(root,row.path),source:row.after})));
assert.deepEqual(copied,plan.files.map(row=>row.nativeBindings));
function fresh(){
 for(const row of plan.inputs)assert.equal(readFileSync(row.path,'utf8'),row.source);
 for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.current);
 assertSchemarsEnclosingHistoryFresh({root,history:plan.history});
 assertSchemarsCurrentEnclosingHistoryFresh({root,history:plan.enclosingHistory});
 assertCloneEnclosingSourceInputsFresh(clone.cloneSourceComposition);
}
fresh();
const proposalRaw=Buffer.from(JSON.stringify(plan));
assert.ok(proposalRaw.length<64*1024*1024);
const output=prefix+'-proposal.json.gz',packed=gzipSync(proposalRaw);
writeFileSync(output,packed,{flag:'wx'});
assert.ok(gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(proposalRaw));
fresh();for(const row of changed)writeFileSync(row.path,row.after);
for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.after);
const receipt={schema:'actual-clone-Schemars-source-installation-v1',output,
 proposalSha256:hash(proposalRaw),proposalBytes:proposalRaw.length,
 files:plan.files.map(row=>({path:row.path,before:row.current,afterSha256:row.afterSha256})),
 copiedBindings:copied,elapsedMs:performance.now()-started,
 sourceInstalled:true,receivingQualified:false,runtimeParity:false,rustExecuted:false};
const raw=Buffer.from(JSON.stringify(receipt));
writeFileSync(prefix+'-installation.json.gz',gzipSync(raw),{flag:'wx'});
console.log(JSON.stringify({output,changed:changed.map(row=>row.path),elapsedMs:receipt.elapsedMs,
 receivingQualified:false,runtimeParity:false}));
