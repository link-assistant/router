// Independent full physical-input and complete actual producer-output review.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readCompleteEvidenceJson} from './complete-evidence-json.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const profiles={
 'current-fixed-record':{proposal:'92a5f700fb63b94f4d32efbad60590b3227b5bfde1c094756260bdce919935a8',before:'ff483c8976c976d8019a6ded9adaf5a3cc179588',after:'462a202c9f213cd01e3a219a1e3314ca72c21729',bytes:58006958},
 'current-static-cold':{proposal:'9019e7f1c9338b246e29ebfe623d9e084349a38f7d20868b2af6051899d8befc',before:'462a202c9f213cd01e3a219a1e3314ca72c21729',after:'92bc32d436c0d13e0fa44e858768bdf98314dec8',bytes:58006766},
};
const label=process.argv[2]??'current-fixed-record';
if(process.argv.length>3||!Object.hasOwn(profiles,label))throw Error('One pinned complete proposal label required');
const expected=profiles[label];
const raw=readCompleteEvidenceJson('ci-logs/issue-784-restart-2/'+label+'-registry-proposal.json');
if(hash(raw)!==expected.proposal)throw Error('Whole reviewed proposal differs');
const proposal=JSON.parse(raw),files=new Map();
for(const row of proposal.files){
 const bytes=Buffer.from(row.base64,'base64');
 if(files.has(row.path)||bytes.length!==row.bytes||hash(bytes)!==row.sha256)throw Error('Whole producer output differs');
 files.set(row.path,bytes);
}
if(files.size!==7||!gunzipSync(files.get('manifest.json.gz')).equals(files.get('manifest.json')))throw Error('Complete registry transport differs');
const before=JSON.parse(gunzipSync(readFileSync('tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz'))),after=JSON.parse(files.get('manifest.json'));
if(before.sourceHead!==expected.before||after.sourceHead!==expected.after||before.files!==1833||after.files!==1833)throw Error('Actual source head or census differs');
const previous=new Map(before.sources.map(row=>[row.path,row])),changed=[],added=[];let total=0;
for(const row of after.sources){
 const bytes=readFileSync(row.path),state=statSync(row.path),old=previous.get(row.path);
 if(bytes.length!==row.bytes||hash(bytes)!==row.sha256||(state.mode&0o111?'100755':'100644')!==row.mode)throw Error('Current complete physical input differs: '+row.path);
 previous.delete(row.path);total+=bytes.length;
 if(!old)added.push(row);else if(JSON.stringify(old)!==JSON.stringify(row))changed.push({before:old,after:row});
}
if(previous.size||total!==after.totalBytes||total!==expected.bytes||added.length)throw Error('Complete physical totals differ');
if(JSON.stringify(changed.map(row=>row.after.path))!==JSON.stringify(['tools/translation/static-source-items.mjs']))throw Error('Unexpected changed source');
const record={schema:'complete-fixed-record-registry-input-review-v1',proposalSha256:hash(raw),beforeHead:before.sourceHead,afterHead:after.sourceHead,files:after.files,totalSourceBytes:total,changed,added,removed:[],allCompleteOutputsVerified:true,allCurrentSelectedPhysicalInputsVerified:true,receivingTestsPassed:false,semanticAuthority:false,runtimeParity:false};
const encoded=Buffer.from(JSON.stringify(record)),target='ci-logs/issue-784-restart-2/'+label+'-registry-review.json.gz';
writeFileSync(target,gzipSync(encoded),{flag:'wx'});
if(!gunzipSync(readFileSync(target)).equals(encoded))throw Error('Complete review receipt differs');
console.log(JSON.stringify({...record,changed:changed.map(row=>row.after.path),target}));
