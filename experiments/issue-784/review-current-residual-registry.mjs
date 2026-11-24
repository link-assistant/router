// Review every actual captured input and all seven complete producer outputs.
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {readCompleteEvidenceJson} from './complete-evidence-json.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const raw=readCompleteEvidenceJson('ci-logs/issue-784-restart-2/current-residual-registry-proposal.json');
if(hash(raw)!=='45341a454f5a2308b6830d3064a1fa3e096c110d72f4124c7d6c6b90c16b7f4b')throw Error('Complete proposal differs');
const proposal=JSON.parse(raw),files=new Map();
for(const row of proposal.files){
 const bytes=Buffer.from(row.base64,'base64');
 if(files.has(row.path)||bytes.length!==row.bytes||hash(bytes)!==row.sha256)throw Error('Complete proposal output differs');
 files.set(row.path,bytes);
}
if(files.size!==7||!gunzipSync(files.get('manifest.json.gz')).equals(files.get('manifest.json')))throw Error('Whole registry transport differs');
const before=JSON.parse(gunzipSync(readFileSync('tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz'))),after=JSON.parse(files.get('manifest.json'));
if(after.sourceHead!==execFileSync('git',['rev-parse','6de907547'],{encoding:'utf8'}).trim()||before.files!==after.files||after.files!==1824)throw Error('Actual source head or complete census differs');
const previous=new Map(before.sources.map(row=>[row.path,row])),changed=[];
let total=0;
for(const row of after.sources){
 const bytes=readFileSync(row.path),state=statSync(row.path),old=previous.get(row.path);
 if(!old||bytes.length!==row.bytes||hash(bytes)!==row.sha256||(state.mode&0o111?'100755':'100644')!==row.mode)throw Error('Current complete input differs: '+row.path);
 previous.delete(row.path);total+=bytes.length;
 if(JSON.stringify(old)!==JSON.stringify(row))changed.push({before:old,after:row});
}
if(previous.size||total!==after.totalBytes||total!==57923560)throw Error('Complete source totals differ');
if(JSON.stringify(changed.map(row=>row.after.path).sort())!==JSON.stringify(['tools/translation/extensions/source-lifetimes.mjs','tools/translation/extensions/standard-body-checker.mjs']))throw Error('Unexpected complete source change');
const record={schema:'complete-current-residual-registry-input-review-v1',proposalSha256:hash(raw),beforeHead:before.sourceHead,afterHead:after.sourceHead,files:after.files,totalSourceBytes:total,changed,added:[],removed:[],allCompleteOutputsVerified:true,allCurrentPhysicalInputsVerified:true,receivingTestsPassed:false,semanticAuthority:false,runtimeParity:false};
const encoded=gzipSync(Buffer.from(JSON.stringify(record))),target='ci-logs/issue-784-restart-2/current-residual-registry-review.json.gz';writeFileSync(target,encoded,{flag:'wx'});
if(!gunzipSync(readFileSync(target)).equals(Buffer.from(JSON.stringify(record))))throw Error('Complete review receipt differs');
console.log(JSON.stringify({...record,changed:changed.map(row=>row.after.path),target}));
