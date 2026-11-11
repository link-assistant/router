// Install only the two trace-worker copies reproduced by their original full
// source producers. Preserve complete proposals, beforeimages and CST inverses.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareOwnedFieldBulkSources,assertOwnedFieldBulkInputsFresh} from '../../tools/translation/prepare-owned-field-bulk.mjs';
import {deriveCurrentNativeOutputTextSourceSet} from '../../tools/translation/prepare-native-output-text-retention.mjs';
const directory='ci-logs/issue-784-restart-2/',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=path=>({path,source:readFileSync(path,'utf8')});
const resume=process.argv.length===3&&process.argv[2]==='--complete-native';
assert.ok(process.argv.length===2||resume,'only the exact retained owned phase can be resumed');
function retain(label,value){
 const raw=Buffer.from(JSON.stringify(value));assert.ok(raw.length<=64*1024*1024);
 const path=directory+'current-124-matrix-trace-'+label+'-proposal.json.gz';
 writeFileSync(path,gzipSync(raw,{mtime:0}),{flag:'wx'});
 assert.deepEqual(gunzipSync(readFileSync(path)),raw);
 return {path,bytes:readFileSync(path).length,rawBytes:raw.length,rawSha256:hash(raw)};
}
const owned=prepareOwnedFieldBulkSources();assert.equal(owned.files.length,9);
const ownedChanged=owned.files.filter(row=>readFileSync(row.path,'utf8')!==row.text);
let ownedPacket;
if(resume){
 assert.deepEqual(ownedChanged,[]);
 const path=directory+'current-124-matrix-trace-owned-proposal.json.gz',packed=readFileSync(path),raw=gunzipSync(packed),old=JSON.parse(raw);
 assert.equal(old.before.length,1);
 for(const row of old.proposal.files)assert.equal(owned.files.find(current=>current.path===row.path)?.text,row.text);
 assert.equal(old.helper.source,source(old.helper.path).source);
 ownedPacket={path,bytes:packed.length,rawBytes:raw.length,rawSha256:hash(raw)};
}else{
 assert.deepEqual(ownedChanged.map(row=>row.path),['tools/translation/owned-field-isolated-matrix-profile.mjs']);
 ownedPacket=retain('owned',{proposal:owned,before:ownedChanged.map(row=>source(row.path)),
  helper:source('tools/translation/matrix-trace-writer.mjs')});
}
assertOwnedFieldBulkInputsFresh(owned);
for(const row of ownedChanged)writeFileSync(row.path,row.text);
for(const row of owned.files)assert.equal(readFileSync(row.path,'utf8'),row.text);
// The installation API derives both complete cohorts before accepting a changed
// output. Check mode alone intentionally refuses an older current afterimage.
const baseline='da5792a1e',inputs=['private-output-text.mjs','retained-owned-field-bulk.mjs',
 'retained-owned-field-matrix-bulk.mjs','isolated-retained-owned-field-matrix-bulk.mjs',
 'owned-field-isolated-matrix-session.mjs','owned-field-isolated-matrix-profile.mjs']
 .map(name=>'tools/translation/'+name).concat('scripts/translate-router-owned-field-meta.mjs');
const beforeInputs=inputs.map(path=>({path,source:execFileSync('git',['show',baseline+':'+path],
 {encoding:'utf8',maxBuffer:1048576})}));
const previous=deriveCurrentNativeOutputTextSourceSet(beforeInputs);
assert.equal(previous.length,7);
for(const row of previous)assert.equal(readFileSync(row.path,'utf8'),row.after,'complete previous native equation: '+row.path);
const currentInputs=inputs.map(source),files=deriveCurrentNativeOutputTextSourceSet(currentInputs);
assert.equal(files.length,7);
const nativeChanged=files.filter(row=>readFileSync(row.path,'utf8')!==row.after);
assert.deepEqual(nativeChanged.map(row=>row.path),['tools/translation/native-owned-field-isolated-matrix-profile.mjs']);
const nativePacket=retain('native',{baseline,beforeInputs,previous,currentInputs,files,
 before:nativeChanged.map(row=>source(row.path)),semanticAuthority:false,runtimeParity:false});
for(const row of currentInputs)assert.equal(readFileSync(row.path,'utf8'),row.source);
for(const row of previous)assert.equal(readFileSync(row.path,'utf8'),row.after);
for(const row of nativeChanged)writeFileSync(row.path,row.after);
for(const row of files)assert.equal(readFileSync(row.path,'utf8'),row.after);
console.log(JSON.stringify({ownedPacket,nativePacket,ownedOutputs:owned.files.length,
 nativeOutputs:files.length,changed:[...ownedChanged,...nativeChanged].map(row=>row.path),
 completeReadback:true,fullGatePassed:false,runtimeParity:false,productionExecutableGain:0}));
