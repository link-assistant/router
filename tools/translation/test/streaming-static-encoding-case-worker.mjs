// Complete DATA comparison worker. The parent case includes both cold lifetimes
// within its original deadline; every source/CST and encoder operation remains.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {serializeSourceMapJson} from '../source-map-json.mjs';
import {encodeStaticSourceStorage,encodeStaticSourceStorageIncremental,decodeStaticSourceStorage} from '../static-source-storage-codec.mjs';
import {encodeStaticSourceStorage as encodeLayout,encodeStaticSourceStorageIncremental as encodeLayoutIncremental,decodeStaticSourceStorage as decodeLayout} from '../static-source-layout-storage.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const archiveURL=new URL('../source-profiles/static-source-lifecycle/originals.json.gz',import.meta.url),runtime=()=>({node:process.versions.node,bun:process.versions.bun??null});
export async function readWholeActualEncodingData(output){
 const {readStaticSourceLifecycle}=await import('./real-source-fixtures.mjs'),archive=readFileSync(archiveURL),{index,bundle}=readStaticSourceLifecycle();assert.equal(bundle.profiles.length,2);assert.ok(Object.keys(bundle.sources).length>800);
 const raw=serializeSourceMapJson(bundle),logical=index.storage??{logicalRawBytes:index.rawBytes,logicalRawSha256:index.rawSha256};assert.ok(raw.length>10000000);assert.equal(raw.length,logical.logicalRawBytes);assert.equal(hash(raw),logical.logicalRawSha256);
 const packed=gzipSync(raw);writeFileSync(join(output,'complete-logical-source-bank.json.gz'),packed,{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(join(output,'complete-logical-source-bank.json.gz'))),raw);
 writeFileSync(join(output,'complete-input-originals.json.gz'),archive,{flag:'wx'});assert.deepEqual(readFileSync(join(output,'complete-input-originals.json.gz')),archive);assert.deepEqual(readFileSync(archiveURL),archive);
 const receipt={which:'read',runtime:runtime(),profiles:bundle.profiles.length,sourceRows:Object.keys(bundle.sources).length,canonicalRows:Object.values(bundle.sources).filter(row=>Object.hasOwn(row,'canonical')).length,logicalBytes:raw.length,logicalSha256:hash(raw),packedLogicalBytes:packed.length,packedLogicalSha256:hash(packed),inputArchiveBytes:archive.length,inputArchiveSha256:hash(archive),index,sourceAuthority:false,runtimeParity:false,rustExecuted:false};writeFileSync(join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return receipt;
}
export function compareWholeActualEncodingStage(which,output,root){
 assert.ok(['old-core','current-core','old-layout','current-layout','decode-core','decode-layout'].includes(which));const input=join(root,'read'),original=JSON.parse(readFileSync(join(input,'receipt.json')));assert.equal(original.which,'read');assert.equal(original.sourceAuthority,false);
 const packedInput=readFileSync(join(input,'complete-logical-source-bank.json.gz'));assert.equal(packedInput.length,original.packedLogicalBytes);assert.equal(hash(packedInput),original.packedLogicalSha256);const raw=gunzipSync(packedInput,{maxOutputLength:256*1024*1024});assert.equal(raw.length,original.logicalBytes);assert.equal(hash(raw),original.logicalSha256);const bundle=JSON.parse(raw),archive=readFileSync(archiveURL);assert.equal(hash(archive),original.inputArchiveSha256);assert.equal(bundle.profiles.length,2);assert.equal(Object.keys(bundle.sources).length,original.sourceRows);
 const core=which.endsWith('-core');let fields;
 if(which.startsWith('decode-')){
  const inputFolder=join(root,core?'current-core':'current-layout'),descriptor=JSON.parse(readFileSync(join(inputFolder,'receipt.json'))),encoded=gunzipSync(readFileSync(join(inputFolder,'complete-encoded-raw.json.gz')),{maxOutputLength:256*1024*1024});assert.equal(encoded.length,descriptor.completeEncodedBytes);assert.equal(hash(encoded),descriptor.completeEncodedSha256);
  const decode=core?decodeStaticSourceStorage:decodeLayout;assert.deepEqual(decode(encoded,{schema:bundle.schema,...(descriptor.storage?{storage:descriptor.storage}:{})}),bundle);fields={completeOriginalDecoderInverse:true,completeEncodedBytes:encoded.length,completeEncodedSha256:hash(encoded),storage:descriptor.storage};
 }else{
  const encode=core?(which.startsWith('old-')?encodeStaticSourceStorage:encodeStaticSourceStorageIncremental):(which.startsWith('old-')?encodeLayout:encodeLayoutIncremental),actual=encode(bundle,raw),packed=gzipSync(actual.raw);writeFileSync(join(output,'complete-encoded-raw.json.gz'),packed,{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(join(output,'complete-encoded-raw.json.gz'))),actual.raw);fields={completeEncodedBytes:actual.raw.length,completeEncodedSha256:hash(actual.raw),storage:actual.storage??null};
 }
 assert.deepEqual(readFileSync(archiveURL),archive);const receipt={which,runtime:runtime(),profiles:bundle.profiles.length,sourceRows:Object.keys(bundle.sources).length,canonicalRows:Object.values(bundle.sources).filter(row=>Object.hasOwn(row,'canonical')).length,logicalBytes:raw.length,logicalSha256:hash(raw),inputArchiveBytes:archive.length,inputArchiveSha256:hash(archive),index:original.index,...fields,sourceAuthority:false,runtimeParity:false,rustExecuted:false};writeFileSync(join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return receipt;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv[2]==='read'){assert.equal(process.argv.length,4);await readWholeActualEncodingData(process.argv[3]);}else{assert.equal(process.argv.length,5);compareWholeActualEncodingStage(process.argv[2],process.argv[3],process.argv[4]);}}
