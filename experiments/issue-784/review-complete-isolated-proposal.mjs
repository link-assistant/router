// Independently census complete proposal bytes; no semantic admission.
import {readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readCompleteEvidenceJson} from './complete-evidence-json.mjs';
const [label,expected]=process.argv.slice(2),hash=value=>createHash('sha256').update(value).digest('hex');
if(process.argv.length!==4||!/^[-a-z0-9]{1,64}$/.test(label)||!/^[a-f0-9]{64}$/.test(expected))throw Error('Finite label and independently reviewed digest required');
const raw=readCompleteEvidenceJson('ci-logs/issue-784-restart-2/'+label+'-registry-proposal.json');
if(hash(raw)!==expected)throw Error('Complete proposal digest differs');
const proposal=JSON.parse(raw),files=new Map();
for(const row of proposal.files){const bytes=Buffer.from(row.base64,'base64');if(files.has(row.path)||bytes.length!==row.bytes||hash(bytes)!==row.sha256)throw Error('Complete proposal member differs');files.set(row.path,bytes);}
if(files.size!==7||!gunzipSync(files.get('manifest.json.gz')).equals(files.get('manifest.json')))throw Error('Complete registry transport differs');
const packed=readFileSync('tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz');
if(hash(packed)!==proposal.originalRegistrySha256)throw Error('Complete original registry differs');
const before=JSON.parse(gunzipSync(packed)),after=JSON.parse(files.get('manifest.json')),previous=new Map(before.sources.map(row=>[row.path,row])),changed=[],added=[];
let total=0;
for(const row of after.sources){
 const state=lstatSync(row.path),bytes=readFileSync(row.path),old=previous.get(row.path);
 if(!state.isFile()||state.isSymbolicLink()||bytes.length!==row.bytes||hash(bytes)!==row.sha256||(state.mode&0o111?'100755':'100644')!==row.mode)throw Error('Complete current source differs: '+row.path);
 previous.delete(row.path);total+=bytes.length;if(!old)added.push(row);else if(JSON.stringify(old)!==JSON.stringify(row))changed.push({before:old,after:row});
}
if(previous.size||after.sources.length!==after.files||total!==after.totalBytes||after.sourceHead!==proposal.revision||JSON.stringify(before.authority)!==JSON.stringify(after.authority))throw Error('Complete census or authority differs');
const record={schema:'complete-current-isolated-proposal-review-v1',proposalSha256:hash(raw),beforeHead:before.sourceHead,afterHead:after.sourceHead,files:after.files,totalSourceBytes:total,changed,added,removed:[],allCompleteOutputsVerified:true,allCurrentPhysicalInputsVerified:true,receivingTestsPassed:false,semanticAuthority:false,runtimeParity:false};
const encoded=Buffer.from(JSON.stringify(record)),target='ci-logs/issue-784-restart-2/'+label+'-proposal-review.json.gz';
writeFileSync(target,gzipSync(encoded,{mtime:0}),{flag:'wx'});if(!gunzipSync(readFileSync(target)).equals(encoded))throw Error('Complete review readback differs');
console.log(JSON.stringify({...record,changed:changed.map(row=>row.after.path),added:added.map(row=>row.path),target}));
