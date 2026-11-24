// Finite before/after diagnostic; never installs the candidate compiler source.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
const output='ci-logs/issue-784-restart-2/'+label+'.json.gz';assert.ok(!existsSync(output));
const path='tools/translation/js-to-rust/vendor/module-syntax.mjs',before=readFileSync(path,'utf8');
const start=before.indexOf('function ownershipRuntimeSame('),end=before.indexOf('function ownershipRuntimeLoadersCurrent(');
assert.ok(start>0&&end>start);const original=before.slice(start,end);
const fields=['value','get','set','writable','enumerable','configurable'];
const candidate="function ownershipRuntimeSame(a,b){const o=ownershipRuntimeOps;if(!a||!b)return a===b;"
 +fields.map(key=>`if(o.own(a,'${key}')!==o.own(b,'${key}')||o.own(a,'${key}')&&a.${key}!==b.${key})return false;`).join('')
 +'return true;}\n';
const after=before.slice(0,start)+candidate+before.slice(end);
assert.equal(after.slice(0,start)+original+after.slice(start+candidate.length),before);
function compile(source,own){return new Function('ownershipRuntimeOps',source+'return ownershipRuntimeSame;')({own});}
const oldSame=compile(original,Object.hasOwn),newSame=compile(candidate,Object.hasOwn),observations=[];
const descriptors=[undefined,null,{},
 {value:undefined,writable:false,enumerable:false,configurable:false},
 {value:3,writable:true,enumerable:true,configurable:true},
 {get:undefined,set:undefined,enumerable:false,configurable:true},
 {value:3,get:undefined,set:undefined,writable:true,enumerable:true,configurable:true},
 ...Reflect.ownKeys(Map.prototype).map(key=>Object.getOwnPropertyDescriptor(Map.prototype,key)),
];
for(let a=0;a<descriptors.length;a++)for(let b=0;b<descriptors.length;b++){
 assert.equal(newSame(descriptors[a],descriptors[b]),oldSame(descriptors[a],descriptors[b]));
 observations.push({a,b,result:newSame(descriptors[a],descriptors[b])});
}
const hooked=[];
for(const field of fields)for(const throws of [false,true]){
 function observe(source){
  const tape=[],sentinel=new Error('sentinel');
  const a=new Proxy({value:3,writable:true,enumerable:true,configurable:true},{
   getOwnPropertyDescriptor(target,key){tape.push(['descriptor',key]);return Reflect.getOwnPropertyDescriptor(target,key);},
   get(target,key,receiver){tape.push(['read',key]);if(throws&&key===field)throw sentinel;return Reflect.get(target,key,receiver);},
  });
  const b={value:3,writable:true,enumerable:true,configurable:true};
  const run=compile(source,(value,key)=>{tape.push(['own',value===a?'a':'b',key]);return Object.hasOwn(value,key);});
  let result;try{result={value:run(a,b)};}catch(error){assert.equal(error,sentinel);result={thrown:'sentinel'};}
  return {tape,result};
 }
 const old=observe(original),current=observe(candidate);assert.deepEqual(current,old);hooked.push({field,throws,old,current});
}
const pair=[{value:3,writable:true,enumerable:true,configurable:true},{value:3,writable:true,enumerable:true,configurable:true}];
for(let n=0;n<5000;n++){assert.equal(oldSame(...pair),true);assert.equal(newSame(...pair),true);}
const timings=[];
for(const round of [0,1,2])for(const mode of ['before','after','after','before']){
 const same=mode==='before'?oldSame:newSame,start=performance.now();let success=0;
 for(let n=0;n<50000;n++)success+=same(pair[0],pair[1]);
 assert.equal(success,50000);timings.push({round,mode,calls:50000,elapsedMilliseconds:performance.now()-start});
}
assert.equal(readFileSync(path,'utf8'),before);
const record={schema:'loader-descriptor-comparison-diagnostic-v1',engine:process.versions,
 script:readFileSync(new URL(import.meta.url),'utf8'),before,after,original,candidate,
 beforeSha256:createHash('sha256').update(before).digest('hex'),afterSha256:createHash('sha256').update(after).digest('hex'),
 observations,hooked,timings,pairedWarmupCallsPerImplementation:5000,
 productionInstalled:false,completeOriginalTestsExecuted:false,performanceQualified:false};
const raw=Buffer.from(JSON.stringify(record));assert.ok(raw.length<1024*1024);
writeFileSync(output,gzipSync(raw),{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(output)),raw);
console.log(JSON.stringify({output,observations:observations.length,hooked:hooked.length,timings,
 productionInstalled:false,performanceQualified:false}));
