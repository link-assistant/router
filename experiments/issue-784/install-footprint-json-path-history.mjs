// Review complete source equations and native scope before installing authors.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-sequential-equations.mjs';
import {verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const prefix='ci-logs/issue-784-restart-2/footprint-json-path-history-';
const hash=value=>createHash('sha256').update(value).digest('hex');
const raw=gunzipSync(readFileSync(prefix+'source-draft.json.gz'));
assert.equal(hash(raw),process.argv[2]);if(process.argv.length!==3||!/^[a-f0-9]{64}$/.test(process.argv[2]))throw Error('Exact complete reviewed draft SHA256 required');
const draft=JSON.parse(raw),ts=ownershipCompiler();
assert.equal(ts.version,'5.9.3');assert.equal(draft.files.length,1);
for(const row of draft.files){
 assert.equal(readFileSync(row.path,'utf8'),row.before);
 assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);
 assert.ok(row.after.split('\n').length<1000);
}
const equations=transportConcreteSourcePhases(draft.files.map(row=>({
 before:row.before,middle:row.before,after:row.after,language:'JavaScript'})));
const bindings=verifyNativeCopiedModuleBindings(ts,draft.files.map(row=>({path:resolve(row.path),source:row.after})));
const syntax=[];
for(const [at,row]of draft.files.entries()){
 const equation=equations[at];assert.equal(equation.before,row.before);
 assert.equal(equation.after,row.after);assert.equal(equation.inverse,row.before);
 assert.deepEqual(equation.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(bindings[at].nativeSemanticScopeChecked,true);
 for(const [engine,args]of [[process.execPath,['--input-type=module','--check']],
  ['bun',['-e',"new Bun.Transpiler({loader:'js',target:'bun'}).scan(await Bun.stdin.text())"]]]){
  const result=spawnSync(engine,args,{input:row.after,encoding:'utf8',maxBuffer:1048576});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);
  assert.equal(result.signal,null);syntax.push({path:row.path,engine,args,...result});
 }
}
const record={schema:'footprint-json-path-history-complete-review-v1',draft,
 equations,bindings,syntax,typescriptVersion:ts.version,receivingQualified:false,
 originalBoundsChanged:false,productionExecutableGain:0};
const review=Buffer.from(JSON.stringify(record));
const output=writeCompleteEvidenceJson(prefix+'complete-author-review.json',review);
for(const row of draft.files)assert.equal(readFileSync(row.path,'utf8'),row.before);
for(const row of draft.files)writeFileSync(row.path,row.after);
console.log(JSON.stringify({output,completeReviewSha256:hash(review),
 completeReviewBytes:review.length,authors:draft.files.map(row=>({path:row.path,
 afterSha256:row.afterSha256})),receivingQualified:false,productionExecutableGain:0}));
