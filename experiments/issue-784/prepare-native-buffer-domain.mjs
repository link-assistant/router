// Install only the genuine producer's complete checked proposal, with custody.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {prepareNativeBufferJsonDag} from '../../tools/translation/prepare-native-buffer-json-dag.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const base='ci-logs/issue-784-restart-2/';
const old=readFileSync('tools/translation/test/fixtures/complete-native-buffer-json-dag-hook-wire.mjs','utf8');
assert.equal(hash(old),'16fb355b26edf6bc267148b705d71f7579d20da3a43e006045a83d75c2149c0d');
const profileSource=readFileSync('tools/translation/source-profiles/native-buffer-json-dag/source-rules.json','utf8');
const profile=JSON.parse(profileSource),plan=prepareNativeBufferJsonDag();
assert.equal(plan.typescript,'5.9.3');
assert.equal(plan.before,plan.inverse);
assert.equal(hash(plan.before),profile.beforeSha256);
assert.equal(hash(plan.after),profile.afterSha256);
assert.equal(plan.nativeBindings.nativeSemanticScopeChecked,true);
let independentlyReplayed=plan.before;
for(const [before,after]of [...profile.languageEdits,...profile.repositoryEdits]){
 assert.equal(independentlyReplayed.split(before).length,2);
 independentlyReplayed=independentlyReplayed.replace(before,()=>after);
}
assert.equal(independentlyReplayed,plan.after);
const syntax=[];
for(const [engine,args]of [[process.execPath,['--input-type=module','--check']],
 ['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]]]){
 const result=spawnSync(engine,args,{input:plan.after,encoding:'utf8',maxBuffer:1048576});
 assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);
 assert.equal(result.signal,null);
 syntax.push({engine,args,status:result.status,stdout:result.stdout,stderr:result.stderr});
}
const record={schema:'complete-native-Buffer-domain-producer-review-v1',plan,
 completeInstalledPredecessor:old,completeProfileSource:profileSource,syntax,
 originalBoundsChanged:false,receivingQualified:false,productionExecutableGain:0};
const raw=Buffer.from(JSON.stringify(record));assert.ok(raw.length<32*1024*1024);
const packed=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(packed),raw);
writeFileSync(base+'buffer-domain-complete-source.json.gz',packed,{flag:'wx'});
assert.equal(readFileSync(plan.path,'utf8'),old);
const result=spawnSync(process.execPath,['tools/translation/prepare-native-buffer-json-dag.mjs','--write'],
 {encoding:'utf8',maxBuffer:1048576});
writeFileSync(base+'buffer-domain-producer-write.json',JSON.stringify(result),{flag:'wx'});
assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);
assert.equal(result.signal,null);assert.equal(readFileSync(plan.path,'utf8'),plan.after);
console.log(JSON.stringify({sourceProposalSha256:hash(raw),rawBytes:raw.length,
 packedBytes:packed.length,afterSha256:profile.afterSha256,typescript:plan.typescript,
 originalBoundsChanged:false,receivingQualified:false,productionExecutableGain:0}));
