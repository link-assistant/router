// Complete source DATA; no cached semantic or ownership decision is reused.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {preparePairedProjectAccessorFixture} from '../../tools/translation/test/paired-project-accessor-fixture.mjs';
const target='docs/case-studies/issue-784/evidence/current-paired-project-source.json.gz';
const sha=value=>createHash('sha256').update(value).digest('hex');
const plan=preparePairedProjectAccessorFixture();
assert.equal(plan.equation.inverse,plan.before);assert.equal(plan.relocated.inverse,plan.equation.after);
assert.equal(plan.source,plan.relocated.text);assert.equal(plan.nativeBindings.length,2);
assert.ok(plan.nativeBindings.every(row=>row.nativeSemanticScopeChecked));
assert.equal(plan.semanticAuthority,false);assert.equal(plan.runtimeParity,false);
const raw=Buffer.from(JSON.stringify({schema:'complete-paired-project-source-evidence-v1',
 engine:process.versions,fullGateQualified:false,plan})+'\n'),packed=gzipSync(raw,{level:9,mtime:0});
function bytes(path){return readdirSync(path,{withFileTypes:true}).reduce((sum,entry)=>{
 const file=path+'/'+entry.name;if(entry.isSymbolicLink()||file==='experiments/issue-784/toolchain')return sum;
 return sum+(entry.isDirectory()?bytes(file):lstatSync(file).size);
},0);}
const before=['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines'].reduce((sum,path)=>sum+bytes(path),0);
assert.ok(before+packed.length<500000000,'complete evidence allocation remains mandatory');
writeFileSync(target,packed,{flag:'wx'});assert.deepEqual(readFileSync(target),packed);
assert.deepEqual(gunzipSync(readFileSync(target)),raw);
const recovered=JSON.parse(gunzipSync(readFileSync(target)));
assert.deepEqual(recovered.plan,plan);
console.log(JSON.stringify({path:target,bytes:packed.length,sha256:sha(packed),decodedBytes:raw.length,
 decodedSha256:sha(raw),censusAfterBytes:before+packed.length,typescriptVersion:plan.typescriptVersion,
 completeOriginalAndCurrentSources:true,completeCstAndInverses:true,fullGateQualified:false}));
