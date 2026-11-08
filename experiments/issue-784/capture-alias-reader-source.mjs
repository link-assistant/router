// Fresh complete source DATA and native binding checks, never a saved verdict.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {prepareCompilerAliasHistory} from '../../tools/translation/prepare-compiler-alias-history.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from '../../tools/translation/concrete-sequential-phases.mjs';
import {verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
const base='95460607f9b286e0df754a1088295745b02c82ee',path='tools/translation/prepare-compiler-alias-history.mjs';
const before=execFileSync('git',['--no-replace-objects','show',base+':'+path],{encoding:'utf8',maxBuffer:1048576});
const after=readFileSync(path,'utf8'),files=[{path,before,after},...[
 'tools/translation/compiler-alias-receiving-reader.mjs',
 'tools/translation/test/compiler-alias-receiving-reader.test.mjs',
 'tools/translation/test/current-proof-cost-source-history.mjs',
 'tools/translation/test/private-native-proof-cost-scope.test.mjs',
].map((path,index)=>{const source=readFileSync(path,'utf8');return {path,before:index<2?'':source,after:source};})];
const equations=transportConcreteNamedSourcePhases(files.map(row=>({before:row.before,middle:row.before,after:row.after,language:'JavaScript',rules:[
 'language:retain-complete-original-producer','repository:compose-native-selected-receiving-reader',
 'language:restore-complete-original-producer','repository:restore-complete-reader-source'],
})));
for(let at=0;at<files.length;at++)assert.equal(equations[at].inverse,files[at].before);
const ts=ownershipCompiler(),nativeBindings=verifyNativeCopiedModuleBindings(ts,[
 {path:resolve('tools/translation/.historical-compiler-alias-history.mjs'),source:before},
 ...files.map(row=>({path:resolve(row.path),source:row.after})),
]);
assert.equal(nativeBindings.length,6);assert.ok(nativeBindings.every(row=>row.nativeSemanticScopeChecked));
const plan=prepareCompilerAliasHistory();assert.equal(plan.files.length,1);assert.equal(plan.records.length,6);assert.equal(plan.receivingReaders.length,1);
for(const row of plan.files){assert.equal(row.before,row.after);assert.equal(row.after,readFileSync(row.path,'utf8'));assert.equal(row.inverse,row.before);}
for(const row of files)assert.equal(readFileSync(row.path,'utf8'),row.after);
assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);
const raw=Buffer.from(JSON.stringify({schema:'complete-alias-reader-source-evidence-v1',base,engine:process.versions,typescriptVersion:ts.version,
 files,equations,nativeBindings,plan,fullGateQualified:false})+'\n');
const sha=value=>createHash('sha256').update(value).digest('hex'),packed=gzipSync(raw,{level:9,mtime:0});
function bytes(path){return readdirSync(path,{withFileTypes:true}).reduce((sum,entry)=>{
 const file=path+'/'+entry.name;if(entry.isSymbolicLink()||file==='experiments/issue-784/toolchain')return sum;
 return sum+(entry.isDirectory()?bytes(file):lstatSync(file).size);
},0);}
const census=['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines'].reduce((sum,path)=>sum+bytes(path),0);
const target='docs/case-studies/issue-784/evidence/current-alias-reader-source.json.gz';
console.log(JSON.stringify({path:target,bytes:packed.length,sha256:sha(packed),decodedBytes:raw.length,decodedSha256:sha(raw),censusBeforeBytes:census}));
assert.ok(census+packed.length<500000000,'complete evidence allocation remains mandatory');
writeFileSync(target,packed,{flag:'wx'});assert.deepEqual(readFileSync(target),packed);assert.deepEqual(gunzipSync(readFileSync(target)),raw);
assert.deepEqual(JSON.parse(gunzipSync(readFileSync(target))).plan,plan);
