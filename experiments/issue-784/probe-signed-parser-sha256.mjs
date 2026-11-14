// Finite comparison of complete helpers; no production source or limit changes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';

const label=process.argv[2];
assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
const output='ci-logs/issue-784-restart-2/'+label+'.json.gz';
assert.equal(existsSync(output),false);
const hash=value=>createHash('sha256').update(value).digest('hex');
const path='tools/translation/private-parser-sha256.mjs',before=readFileSync(path,'utf8');
const start=before.indexOf('  function compress(){'),end=before.indexOf('  function emit(byte){');
assert.ok(start>0&&end>start);
const block=before.slice(start,end),signed=block.replaceAll('>>>0','|0').replace(
  'let a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],v=h[7];',
  'let a=h[0]|0,b=h[1]|0,c=h[2]|0,d=h[3]|0,e=h[4]|0,f=h[5]|0,g=h[6]|0,v=h[7]|0;');
assert.equal(block.split('>>>0').length-1,13);
assert.notEqual(signed,block);
const after=before.slice(0,start)+signed+before.slice(end);
const relocation=["from './original-json-intrinsics.mjs'",'from '+JSON.stringify(pathToFileURL(resolve('tools/translation/original-json-intrinsics.mjs')).href)];
async function load(source){
  assert.equal(source.split(relocation[0]).length,2);
  const relocated=source.replace(...relocation);
  assert.equal(relocated.replace(relocation[1],relocation[0]),source);
  return (await import('data:text/javascript;base64,'+Buffer.from(relocated).toString('base64'))).independentParserSha256;
}
const oldHash=await load(before),newHash=await load(after),vectors=[];
for(let offset=0;offset<64;offset++)for(const middle of ['', 'a', 'abcd'.repeat(16),'\0\x7f\x80\u07ff\u0800Ω😀\udbff\udfff']){
  const source='P'.repeat(offset)+middle,result=hash(source);
  assert.equal(oldHash(source),result);assert.equal(newHash(source),result);
  vectors.push({source,sha256:result});
}
for(const source of ['a'.repeat(262144),'😀'.repeat(131072)]){
  const result=hash(source);assert.equal(oldHash(source),result);assert.equal(newHash(source),result);
  vectors.push({source,sha256:result});
}
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'Uint32Array');
try{
  Object.defineProperty(globalThis,'Uint32Array',{get(){throw Error('must not invoke replaced optional constructor');},configurable:true});
  for(const row of vectors.slice(0,256)){assert.equal(oldHash(row.source),row.sha256);assert.equal(newHash(row.source),row.sha256);}
}finally{Object.defineProperty(globalThis,'Uint32Array',descriptor);}
const manifest=JSON.parse(readFileSync('tools/translation/source-profiles/private-parser-execution/manifest.json','utf8'));
const sources=manifest.sources.map(row=>{
  const bytes=readFileSync(resolve('tools/translation',row.path)),source=bytes.toString('utf8');
  assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);
  assert.equal(oldHash(source),row.sha256);assert.equal(newHash(source),row.sha256);
  return {...row,source};
});
const timings=[];
for(const round of [0,1])for(const label of ['before','after','after','before']){
  const run=label==='before'?oldHash:newHash,start=performance.now();let bytes=0;
  for(let loop=0;loop<2;loop++)for(const row of sources){assert.equal(run(row.source),row.sha256);bytes+=row.bytes;}
  timings.push({round,label,completePasses:2,bytes,elapsedMilliseconds:performance.now()-start});
}
assert.equal(readFileSync(path,'utf8'),before);
const receipt={schema:'signed-parser-sha256-diagnostic-v1',engine:process.versions,
  before,after,beforeSha256:hash(before),afterSha256:hash(after),relocation,
  vectors,sources,timings,productionInstalled:false,performanceQualified:false};
const raw=Buffer.from(JSON.stringify(receipt));assert.ok(raw.length<4*1024*1024);
writeFileSync(output,gzipSync(raw),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(output)),raw);
console.log(JSON.stringify({output,vectors:vectors.length,actualSources:sources.length,timings,
  productionInstalled:false,performanceQualified:false}));
