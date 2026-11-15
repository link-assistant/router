// Restore only the task's exact archived candidate; retain module binding sharing.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readCompleteEvidenceJson,writeCompleteEvidenceJson} from './complete-evidence-json.mjs';
const stem='ci-logs/issue-784-restart-2/runtime-common-withdrawn';
const hash=value=>createHash('sha256').update(value).digest('hex');
function read(label){
 const packet=JSON.parse(readCompleteEvidenceJson(stem+'-'+label+'.json'));
 const decode=item=>{
  if(typeof item==='string'){assert.equal(item[0],'\0');return packet.strings[Number(item.slice(1))];}
  if(Array.isArray(item))return item.map(decode);
  if(item!==null&&typeof item==='object')return Object.fromEntries(Object.entries(item).map(([key,child])=>[key,decode(child)]));
  return item;
 };
 return decode(packet.value);
}
const index=read('index'),sources=read('sources');
assert.equal(index.completeRows,12);assert.equal(index.declined,true);
for(const row of index.records)assert.equal(hash(readCompleteEvidenceJson(row.path.slice(0,-3))),row.sha256);
for(const row of sources.files)assert.equal(hash(readFileSync(row.path)),row.sha256,row.path);
const retained='tools/translation/prepare-runtime-import-current-sources.mjs';
const changes=[];
for(const row of sources.files){
 if(row.original===null){unlinkSync(row.path);changes.push({path:row.path,removedCandidateSha256:row.sha256});continue;}
 let bytes=Buffer.from(row.original.bytes,'base64');assert.equal(hash(bytes),row.original.sha256);
 if(row.path===retained){
  let source=bytes.toString('utf8');
  const once=(before,after)=>{assert.equal(source.split(before).length,2);source=source.replace(before,()=>after);};
  once("import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';",
   "import {verifyNativeCopiedModuleBindings} from './source-copy-native-bindings.mjs';");
  once(' for(const [at,row]of files.entries()){',
   " // Every candidate has its own external-module scope. Share only this fresh\n"+
   " // program's standard-library parse; each complete candidate is still checked.\n"+
   " const nativeBindings=verifyNativeCopiedModuleBindings(ts,files.map(row=>({path:resolve(root,row.path),source:row.after})));\n"+
   ' for(const [at,row]of files.entries()){');
  once('  row.nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,row.path),row.after);',
   '  row.nativeBindings=nativeBindings[at];');
  bytes=Buffer.from(source);
 }
 writeFileSync(row.path,bytes);assert.ok(readFileSync(row.path).equals(bytes));
 changes.push({path:row.path,declinedCandidateSha256:row.sha256,originalSha256:row.original.sha256,
  finalSha256:hash(bytes),restoredExactOriginal:row.path!==retained});
}
rmdirSync('tools/translation/source-profiles/runtime-import-common-guard');
const receipt={schema:'complete-runtime-common-candidate-withdrawal-v1',sourceHead:sources.head,
 completeCandidateArchive:stem+'-index.json.xz',changes,retainedChange:retained,
 generatedProductionSourcesRestoredExactly:true,originalReceivingTestRestoredExactly:true,
 currentReceivingChecksPassed:false,wholeBuildSpeedGainQualified:false,
 semanticAuthority:false,runtimeParity:false,rustExecuted:false};
const path=writeCompleteEvidenceJson(stem+'-restoration.json',Buffer.from(JSON.stringify(receipt)));
console.log(JSON.stringify({path,...receipt}));
