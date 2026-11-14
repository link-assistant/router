// A lossless repository storage repair. The complete native reader and layout
// encoder validate all old source/CST records before compressed bytes change.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readStaticSourceLifecycle} from '../../tools/translation/test/real-source-fixtures.mjs';
import {encodeStaticSourceStorage} from '../../tools/translation/static-source-layout-storage.mjs';
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {TRANSLATOR_EXPORT_LIMITS} from '../../tools/translation/export-bundle.mjs';
const prefix='tools/translation/source-profiles/static-source-lifecycle/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const originalIndexBytes=readFileSync(prefix+'manifest.json'),originalArchive=readFileSync(prefix+'originals.json.gz');
const pipeline=createRulePipeline([
 {phase:'language',rules:[{id:'storage.validate-complete-native-source-cst-and-layout',apply(){
  const data=readStaticSourceLifecycle(),logical=Buffer.from(JSON.stringify(data.bundle)+'\n');
  const stored=encodeStaticSourceStorage(data.bundle,logical);
  const raw=gunzipSync(originalArchive,{maxOutputLength:64*1024*1024});
  assert.deepEqual(stored.raw,raw);assert.deepEqual(stored.storage,data.index.storage);
  assert.equal(raw.length,data.index.rawBytes);assert.equal(sha(raw),data.index.rawSha256);
  return {raw,index:data.index,storage:stored.storage};
 }}]},
 {phase:'repository',rules:[{id:'storage.gzip-nine-with-original-export-limit',apply(data){
  const archive=gzipSync(data.raw,{level:9,mtime:0});
  assert.ok(archive.length<=TRANSLATOR_EXPORT_LIMITS.fileBytes);
  assert.deepEqual(gunzipSync(archive),data.raw);
  const index={...data.index,bytes:archive.length,sha256:sha(archive)};
  return {...data,archive,index};
 }}]},
]);
const result=pipeline.run(null),data=result.value;
const originalIndex=JSON.parse(originalIndexBytes);
assert.deepEqual({...data.index,bytes:originalIndex.bytes,sha256:originalIndex.sha256},originalIndex);
const record={schema:'lossless-static-source-archive-compression-v1',head,engine:process.versions,
 trace:result.trace,previous:{index:originalIndex,archiveBytes:originalArchive.length,
  archiveSha256:sha(originalArchive),completeArchiveGitReference:head+':'+prefix+'originals.json.gz'},
 next:{index:data.index,archiveBytes:data.archive.length,archiveSha256:sha(data.archive)},
 completeDecodedByteIdentity:true,rawBytes:data.raw.length,rawSha256:sha(data.raw),
 allOriginalNativeSourceAndCstChecksRun:true,originalExportLimit:TRANSLATOR_EXPORT_LIMITS.fileBytes,
 sourceAuthority:false,semanticAuthority:false,runtimeParity:false,fullGatePassed:false,rustExecuted:false};
const target='docs/case-studies/issue-784/evidence/current-static-archive-compression.json.gz';
const rawRecord=Buffer.from(JSON.stringify(record)+'\n'),packed=gzipSync(rawRecord,{level:9,mtime:0});
writeFileSync(target,packed,{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(target)),rawRecord);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),head);
assert.deepEqual(readFileSync(prefix+'manifest.json'),originalIndexBytes);
assert.deepEqual(readFileSync(prefix+'originals.json.gz'),originalArchive);
writeFileSync(prefix+'originals.json.gz',data.archive);
writeFileSync(prefix+'manifest.json',JSON.stringify(data.index,null,2)+'\n');
console.log(JSON.stringify(record));
