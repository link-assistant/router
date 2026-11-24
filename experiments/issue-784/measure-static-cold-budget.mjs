// Finite complete cold reads; preserves sources and every diagnostic round.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createStaticSourceItemReader as current} from '../../tools/translation/static-source-items.mjs';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
const root=new URL('../../',import.meta.url),path='tools/translation/static-source-items.mjs';
const commit='815527efb3db40ca7e650ba9aaae47bfa1529dab';
const hash=value=>createHash('sha256').update(value).digest('hex');
const original=execFileSync('git',['show',commit+':'+path],{encoding:'utf8',maxBuffer:1024*1024});
const relocated=original.replace(/from '(\.\/[^']+)'/gu,(_whole,target)=>'from '+JSON.stringify(new URL(target,new URL(path,root)).href));
const {createStaticSourceItemReader:before}=await import('data:text/javascript;base64,'+Buffer.from(relocated).toString('base64'));
const inputs=['account_routing_policy.rs','subscription_usage_normalize.rs','config.rs'].map(name=>{
 const path='rust/src/'+name,source=readFileSync(new URL(path,root),'utf8');
 return {path,source,sha256:hash(source),pin:Object.freeze({source})};
});
const observations=[];
for(const input of inputs){
 const expected=sourceItems(input.source),rounds=[];
 for(let round=0;round<4;round++){
  const durations={};
  for(const kind of round%2?['current','before']:['before','current']){
   const construct=kind==='before'?before:current,started=performance.now();let tokens=0,last;
   for(let iteration=0;iteration<16;iteration++){
    last=construct()(input.pin);
    for(let at=0;at<last.length;at++)tokens+=last[at].tokens.length;
   }
   durations[kind]={elapsedMs:performance.now()-started,tokens};
   assert.equal(tokens,expected.reduce((sum,item)=>sum+item.tokens.length,0)*16);
   assert.deepEqual(last,expected);
  }
  rounds.push(durations);
 }
 observations.push({path:input.path,rounds});
}
const result={schema:'complete-static-cold-budget-diagnostic-v1',
 original:{commit,path,source:original,sha256:hash(original),relocated},
 current:{path,source:readFileSync(new URL(path,root),'utf8')},inputs,
 rounds:4,coldReadsPerRound:16,observations,node:process.versions,
 wholeReceivingDeadlineQualified:false,runtimeParity:false,executableGain:0};
const output=process.argv[2];assert.ok(output?.endsWith('.json.gz'));
const raw=Buffer.from(JSON.stringify(result)+'\n');
writeFileSync(output,gzipSync(raw),{flag:'wx'});
assert.ok(gunzipSync(readFileSync(output)).equals(raw));
for(const row of observations)console.log(JSON.stringify(row));
