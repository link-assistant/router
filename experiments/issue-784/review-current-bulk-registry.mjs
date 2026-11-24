// Independent whole-input review of the actual complete canonical-custody proposal.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readCompleteEvidenceJson} from './complete-evidence-json.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const raw=readCompleteEvidenceJson('ci-logs/issue-784-restart-2/current-bulk-registry-proposal.json');
if(hash(raw)!=='74fc9a877857cfbb5218f29071715bb82c796e756fe45713e8f7a91d85e9e708')throw Error('Complete reviewed proposal differs');
const proposal=JSON.parse(raw),files=new Map();
for(const row of proposal.files){
 const bytes=Buffer.from(row.base64,'base64');
 if(files.has(row.path)||bytes.length!==row.bytes||hash(bytes)!==row.sha256)throw Error('Complete proposal output differs');
 files.set(row.path,bytes);
}
if(files.size!==7||!gunzipSync(files.get('manifest.json.gz')).equals(files.get('manifest.json')))throw Error('Whole registry transport differs');
const before=JSON.parse(gunzipSync(readFileSync('tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz'))),after=JSON.parse(files.get('manifest.json'));
if(after.sourceHead!=='11aca637da6ba73c021ddc60e81badc7cb26e4a7'||before.sourceHead!=='5050cb0091ebde984cf79b9914090646ffde57c8'||before.files!==1826||after.files!==1832)throw Error('Actual head or complete census differs');
const previous=new Map(before.sources.map(row=>[row.path,row])),changed=[],added=[];
let total=0;
for(const row of after.sources){
 const bytes=readFileSync(row.path),state=statSync(row.path),old=previous.get(row.path);
 if(bytes.length!==row.bytes||hash(bytes)!==row.sha256||(state.mode&0o111?'100755':'100644')!==row.mode)throw Error('Current complete input differs: '+row.path);
 previous.delete(row.path);total+=bytes.length;
 if(!old)added.push(row);else if(JSON.stringify(old)!==JSON.stringify(row))changed.push({before:old,after:row});
}
if(previous.size||total!==after.totalBytes||total!==57980131)throw Error('Complete source totals differ');
if(JSON.stringify(changed.map(row=>row.after.path).sort())!==JSON.stringify(['scripts/translate-router.mjs','tools/translation/bulk.mjs','tools/translation/owned-definitions-bulk.mjs','tools/translation/retained-bulk.mjs','tools/translation/retained-owned-definitions-bulk.mjs']))throw Error('Unexpected changed source');
if(JSON.stringify(added.map(row=>row.path).sort())!==JSON.stringify(['tools/translation/bulk-draft-custody.mjs','tools/translation/bulk-draft-inputs.mjs','tools/translation/prepare-bulk-draft-custody.mjs','tools/translation/source-profiles/bulk-draft-custody/bulk.mjs.gz','tools/translation/source-profiles/bulk-draft-custody/manifest.json','tools/translation/source-profiles/bulk-draft-custody/translate-router.mjs.gz']))throw Error('Unexpected added source');
const record={schema:'complete-current-bulk-registry-input-review-v1',proposalSha256:hash(raw),beforeHead:before.sourceHead,afterHead:after.sourceHead,files:after.files,totalSourceBytes:total,changed,added,removed:[],allCompleteOutputsVerified:true,allCurrentPhysicalInputsVerified:true,receivingTestsPassed:false,semanticAuthority:false,runtimeParity:false};
const encoded=Buffer.from(JSON.stringify(record)),target='ci-logs/issue-784-restart-2/current-bulk-registry-review.json.gz';
writeFileSync(target,gzipSync(encoded),{flag:'wx'});
if(!gunzipSync(readFileSync(target)).equals(encoded))throw Error('Complete review receipt differs');
console.log(JSON.stringify({...record,changed:changed.map(row=>row.after.path),added:added.map(row=>row.path),target}));
