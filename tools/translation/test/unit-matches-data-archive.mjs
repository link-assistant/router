// Receiving DATA only. Every leaf is reopened and compared before a decoded
// stage can be released. No archived object is reused as compiler authority.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {encodeCompleteIndexedHookWire as encode,decodeCompleteIndexedHookWire as decode} from './fixtures/complete-indexed-hook-wire.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const LIMIT=384*1024*1024,PACKET=64*1024*1024,RESERVE=16384,LOGICAL=1024*1024*1024,MAX_PACKETS=20000;
export function createUnitMatchesDataArchive(){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-unit-matches-data-')),packets=[],stages=[];let storedBytes=0,logicalBytes=0,closed=false;
 function leaf(value,label){
  assert.equal(closed,false);const wire=encode({label,value}),bytes=Buffer.byteLength(wire),cost=JSON.parse(wire).rawBytes;
  assert.ok(bytes<=PACKET&&cost<=PACKET&&storedBytes+bytes<=LIMIT-RESERVE&&logicalBytes+cost<=LOGICAL-RESERVE&&packets.length<MAX_PACKETS,'complete receiving DATA archive bound');
  const file=String(packets.length).padStart(6,'0')+'.json',path=join(directory,file);writeFileSync(path,wire,{flag:'wx'});
  const actual=readFileSync(path,'utf8');assert.equal(actual,wire);decode(actual);
  packets.push({file,label,bytes,sha256:hash(wire),logicalBytes:cost});storedBytes+=bytes;logicalBytes+=cost;return {packet:packets.length-1};
 }
 // Preserve every root field/order. Large complete source, graph, inspection
 // and proposal arrays are emitted one row at a time, never one giant JSON.
 function record(value,label){return {record:Object.entries(value).map(([key,part])=>{
  let wire;
  if(Array.isArray(part))wire={array:part.map((row,at)=>leaf(row,label+'.'+key+':'+at))};
  else if(['before','after'].includes(key)&&part&&typeof part==='object')wire={record:Object.entries(part).map(([path,source])=>[path,leaf(source,label+'.'+key+':'+path)])};
  else if(['moduleGraph','producerEffects'].includes(key)&&part&&typeof part==='object')wire=record(part,label+'.'+key);
  else wire=leaf(part,label+'.'+key);
  return [key,wire];
 })};}
 function verify(){
  assert.deepEqual(readdirSync(directory).sort(),packets.map(row=>row.file).sort());
  for(const row of packets){const path=join(directory,row.file),stat=lstatSync(path);assert.equal(stat.isSymbolicLink(),false);assert.equal(stat.isFile(),true);assert.equal(stat.size,row.bytes);const wire=readFileSync(path,'utf8');assert.equal(hash(wire),row.sha256);decode(wire);}
 }
 return {directory,retain(label,value){const wire=record(value,label);stages.push({label,wire});return wire;},complete(){
  verify();const index={schema:'owned-unit-matches-complete-receiving-DATA-v1',complete:true,stages,packets,storedBytes,logicalBytes,semanticAuthority:false,executableCoverageGain:null};
  const text=JSON.stringify(index)+'\n';assert.ok(Buffer.byteLength(text)<=PACKET&&storedBytes+Buffer.byteLength(text)<=LIMIT-RESERVE&&logicalBytes+Buffer.byteLength(text)<=LOGICAL-RESERVE);writeFileSync(join(directory,'index.json'),text,{flag:'wx'});assert.equal(readFileSync(join(directory,'index.json'),'utf8'),text);assert.deepEqual(readdirSync(directory).sort(),[...packets.map(row=>row.file),'index.json'].sort());closed=true;
 },failure(error){
  if(closed)return;closed=true;
  // Every retained packet contains its own complete label/value. Retain them;
  // the bounded error itself never creates a successful or partial index.
  const receipt=JSON.stringify({schema:'owned-unit-matches-complete-receiving-DATA-v1',complete:false,semanticAuthority:false,executableCoverageGain:null,packets:packets.length,storedBytes,logicalBytes,message:String(error?.message??error).slice(0,4096)})+'\n';assert.ok(Buffer.byteLength(receipt)<=RESERVE);writeFileSync(join(directory,'failure.json'),receipt,{flag:'wx'});
 }};
}
