// Complete actual source plans precede installation; no generated body patches.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareOperationProofByteSources} from '../../tools/translation/prepare-operation-proof-byte-sources.mjs';
import {prepareWholeOwnerProofByteCandidate} from '../../tools/translation/current-whole-owner-proof-byte-provider.mjs';
import {prepareDefaultProofByteAdoption} from '../../tools/translation/prepare-default-proof-byte-adoption.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
function bytes(path){return readdirSync(path,{withFileTypes:true}).reduce((sum,entry)=>{
 const file=path+'/'+entry.name;if(entry.isSymbolicLink()||file==='experiments/issue-784/toolchain')return sum;
 return sum+(entry.isDirectory()?bytes(file):lstatSync(file).size);
},0);}
const mode=process.argv[2];assert.ok(['operation','consumer','default'].includes(mode));
const plan=({operation:prepareOperationProofByteSources,consumer:prepareWholeOwnerProofByteCandidate,
 default:prepareDefaultProofByteAdoption})[mode]();
const suffix=process.argv[3]??'';assert.ok(['','-v2'].includes(suffix));
const target='docs/case-studies/issue-784/evidence/current-operation-measurement-'+mode+'-source'+suffix+'.json.gz';
const raw=Buffer.from(JSON.stringify({schema:'complete-operation-measurement-source-evidence-v1',engine:process.versions,
 serialization:'JSON DATA; executable rule callbacks remain in retained source, not JSON.',plan,fullGateQualified:false})+'\n');
const packed=gzipSync(raw,{level:3,mtime:0});
const census=['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines'].reduce((sum,path)=>sum+bytes(path),0);
assert.ok(census+packed.length<500000000,'complete evidence allocation remains mandatory');
writeFileSync(target,packed,{flag:'wx'});assert.deepEqual(readFileSync(target),packed);
assert.deepEqual(gunzipSync(readFileSync(target)),raw);
assert.equal(JSON.stringify(JSON.parse(raw).plan),JSON.stringify(plan),'complete JSON DATA projection readback');
console.log(JSON.stringify({target,bytes:packed.length,sha256:sha(packed),decodedBytes:raw.length,
 decodedSha256:sha(raw),censusBeforeBytes:census,typescriptVersion:plan.typescriptVersion,
 changed:plan.files.filter(row=>row.current!==row.after).map(row=>row.path)}));
for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.current);
if(mode==='default')for(const row of plan.files)assert.equal(row.current,row.after);
else for(const row of plan.files){writeFileSync(row.path,row.after);assert.equal(readFileSync(row.path,'utf8'),row.after);}
