// Finite complete-profile analysis; no deadline or semantic qualification.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readCompleteEvidenceJson,writeCompleteEvidenceJson,currentEvidenceBytes} from './complete-evidence-json.mjs';
const [label]=process.argv.slice(2);assert.match(label??'',/^[a-z0-9-]{1,70}$/u);assert.equal(process.argv.length,3);
const path='ci-logs/issue-784-restart-2/'+label,raw=readCompleteEvidenceJson(path+'-cpu.json');
const profile=JSON.parse(raw),nodes=new Map(profile.nodes.map(row=>[row.id,row])),parents=new Map(),costs=new Map();
for(const row of nodes.values())for(const child of row.children??[]){assert.ok(nodes.has(child));assert.equal(parents.has(child),false);parents.set(child,row.id);}
assert.equal(parents.size,nodes.size-1);assert.equal(profile.samples.length,profile.timeDeltas.length);
for(let at=0;at<profile.samples.length;at++){
 const id=profile.samples[at],micros=profile.timeDeltas[at];assert.ok(nodes.has(id));assert.ok(Number.isSafeInteger(micros));
 let cursor=id;const seen=new Set(),frames=new Set();
 while(cursor!==undefined){assert.equal(seen.has(cursor),false);seen.add(cursor);
  const frame=nodes.get(cursor).callFrame,key=JSON.stringify(frame);let cost=costs.get(key);
  if(!cost){cost={frame,selfMicros:0,inclusiveMicros:0};costs.set(key,cost);}
  if(cursor===id)cost.selfMicros+=micros;if(!frames.has(key)){cost.inclusiveMicros+=micros;frames.add(key);}cursor=parents.get(cursor);
 }
}
const frames=[...costs.values()],result={source:path+'-cpu.json',bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),sampleCount:profile.samples.length,
 signedSampleMicros:profile.timeDeltas.reduce((a,b)=>a+b,0),negativeDeltas:profile.timeDeltas.filter(x=>x<0),frames,deadlineQualified:false,fullGatePassed:false};
const output=writeCompleteEvidenceJson(path+'-profile-summary.json',Buffer.from(JSON.stringify(result)));
console.log(JSON.stringify({output,evidenceBytes:currentEvidenceBytes(),sampleCount:result.sampleCount,topSelf:frames.sort((a,b)=>b.selfMicros-a.selfMicros).slice(0,16)},null,2));
