// Finite diagnostic of complete source-item reads; not a receiving deadline pass.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createStaticSourceItemReader as current} from '../../tools/translation/static-source-items.mjs';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
const root=new URL('../../',import.meta.url),path='tools/translation/static-source-items.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const original=execFileSync('git',['show','3b19785353c0a004efc62ab675a97b99c8a2e5a1:'+path],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});
const relocated=original.replace(/from '(\.\/[^']+)'/gu,(_whole,target)=>'from '+JSON.stringify(new URL(target,new URL(path,root)).href));
const {createStaticSourceItemReader:before}=await import('data:text/javascript;base64,'+Buffer.from(relocated).toString('base64'));
const inputs=['rust/src/account_routing_policy.rs','rust/src/subscription_usage_normalize.rs','rust/src/config.rs'].map(path=>{const bytes=readFileSync(new URL(path,root));return {path,bytes:bytes.length,sha256:sha(bytes),pin:Object.freeze({source:bytes.toString('utf8')})};});
const observations=[];
for(const input of inputs){
 const expected=sourceItems(input.pin.source),readers={before:before(),current:current()};
 for(const read of Object.values(readers))assert.deepEqual(read(input.pin),expected);
 const rounds=[];
 for(let round=0;round<4;round++){
  const durations={};
  for(const kind of round%2?['current','before']:['before','current']){
   const read=readers[kind],started=performance.now();let tokens=0;
   for(let iteration=0;iteration<24;iteration++){
    const items=read(input.pin);for(let at=0;at<items.length;at++)tokens+=items[at].tokens.length;
   }
   durations[kind]={elapsedMs:performance.now()-started,tokens};
   assert.equal(tokens,expected.reduce((sum,item)=>sum+item.tokens.length,0)*24);
  }
  rounds.push(durations);
 }
 for(const read of Object.values(readers))assert.deepEqual(read(input.pin),expected);
 observations.push({path:input.path,bytes:input.bytes,sha256:input.sha256,items:expected.length,rounds});
}
const result={schema:'fixed-record-source-item-diagnostic-v1',original:{commit:'3b19785353c0a004efc62ab675a97b99c8a2e5a1',path,source:original,sha256:sha(original),relocated},current:{source:readFileSync(new URL(path,root),'utf8')},node:process.versions,iterationsPerRound:24,rounds:4,observations,wholeReceivingDeadlineQualified:false,runtimeParity:false};
const output=process.argv[2];assert.ok(output,'Explicit fresh result path required');
writeFileSync(output,JSON.stringify(result)+'\n',{flag:'wx'});
assert.deepEqual(JSON.parse(readFileSync(output,'utf8')),result);
for(const row of observations)process.stdout.write(JSON.stringify({path:row.path,rounds:row.rounds})+'\n');
