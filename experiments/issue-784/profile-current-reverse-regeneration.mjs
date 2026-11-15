// One unchanged complete reverse build. Telemetry grants no compiler authority.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildArtifacts} from '../../scripts/regenerate-js-first.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const label=process.argv[2];
assert.match(label??'',/^[a-z0-9-]{1,70}$/u);
const hash=value=>createHash('sha256').update(value).digest('hex');
const inputs=execFileSync('git',['ls-files','-z','--','js/src','js/portable',
 'rust/src/translation_core','rust/src/translation_core.rs','rust/Cargo.toml',
 'rust/Cargo.lock','parity/fixtures/js-first'],{encoding:'utf8',maxBuffer:4194304})
 .split('\0').filter(Boolean).map(path=>({path,source:readFileSync(path,'utf8')}));
assert.ok(inputs.length<=512&&inputs.reduce((n,row)=>n+row.source.length,0)<=8388608);
const session=new Session();session.connect();
const call=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,
 (error,result)=>error?reject(error):resolve(result)));
try{
 await call('Profiler.enable');await call('Profiler.setSamplingInterval',{interval:10000});
 await call('Profiler.start');const started=performance.now();
 const artifacts=buildArtifacts(resolve('.')),elapsedMs=performance.now()-started;
 const {profile}=await call('Profiler.stop');
 assert.ok(profile.nodes.length<=100000&&profile.samples.length<=1000000);
 const strings=[],indices=new Map();
 const intern=value=>{if(!indices.has(value)){indices.set(value,strings.length);strings.push(value);}return indices.get(value);};
 const compact={...profile,nodes:profile.nodes.map(node=>({...node,callFrame:{...node.callFrame,
  functionName:intern(node.callFrame.functionName),url:intern(node.callFrame.url)}}))};
 for(let at=0;at<profile.nodes.length;at++){
  const frame=compact.nodes[at].callFrame;
  assert.deepEqual({...frame,functionName:strings[frame.functionName],url:strings[frame.url]},profile.nodes[at].callFrame);
 }
 for(const row of inputs)assert.equal(readFileSync(row.path,'utf8'),row.source);
 const outputs=[...artifacts].map(([path,value])=>({path,bytes:Buffer.byteLength(value),sha256:hash(value)}));
 const packet={schema:'complete-current-reverse-cpu-diagnostic-v1',elapsedMs,
  samplingIntervalMicroseconds:10000,profile:compact,profileCallFrameStringTable:strings,
  completeOriginalProfileRejoinVerified:true,inputs,outputs,
  sourceHead:execFileSync('git',['rev-parse','HEAD']).toString().trim(),
  engine:process.version,typescriptVersion:JSON.parse(readFileSync('js/node_modules/typescript/package.json')).version,
  originalDeadlinesQualified:false,fullGatePassed:false,runtimeParity:false,rustExecuted:false};
 const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/'+label+'.json',Buffer.from(JSON.stringify(packet)));
 console.log(JSON.stringify({elapsedMs,output,outputs:outputs.length,nodes:profile.nodes.length}));
}finally{session.disconnect();}
