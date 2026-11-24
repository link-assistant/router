// One actual complete regeneration build. Sampling is diagnostic only.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {buildArtifacts} from '../../scripts/regenerate-js-first.mjs';
import {writeCompleteEvidenceJson,readCompleteEvidenceJson} from './complete-evidence-json.mjs';
assert.equal(process.argv.length,2);
const hash=value=>createHash('sha256').update(value).digest('hex');
const paths=execFileSync('git',['ls-files','-z','--','js/src','js/portable',
 'rust/src/translation_core','rust/src/translation_core.rs','rust/Cargo.toml',
 'rust/Cargo.lock','parity/fixtures/js-first'],{encoding:'utf8',maxBuffer:4194304})
 .split('\0').filter(Boolean);
const inputs=paths.map(path=>{const source=readFileSync(path,'utf8');return {path,source,sha256:hash(source)};});
const session=new Session();session.connect();
const call=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,
 (error,result)=>error?reject(error):resolve(result)));
await call('Profiler.enable');await call('Profiler.setSamplingInterval',{interval:10000});
await call('Profiler.start');const start=performance.now();
const artifacts=buildArtifacts(resolve('.')),milliseconds=performance.now()-start;
const {profile}=await call('Profiler.stop');session.disconnect();
assert.ok(artifacts.size>100);
const raw=Buffer.from(JSON.stringify([...artifacts]));
console.log(JSON.stringify({stage:'complete-build-finished',milliseconds,
 outputSha256:hash(raw),outputBytes:raw.length,outputs:artifacts.size,nodes:profile.nodes.length}));
const stem='ci-logs/issue-784-restart-2/reverse-build-complete-output.json';
assert.ok(readCompleteEvidenceJson(stem).equals(raw));
const output=stem+'.xz';
// V8 repeats entire dynamic source URLs in thousands of frame records. Retain
// every complete string once and rejoin every original frame independently.
const strings=[],lookup=new Map();
const intern=value=>{if(!lookup.has(value)){lookup.set(value,strings.length);strings.push(value);}return lookup.get(value);};
const stored={...profile,nodes:profile.nodes.map(node=>({...node,callFrame:{...node.callFrame,
 functionName:intern(node.callFrame.functionName),url:intern(node.callFrame.url)}}))};
const restored={...stored,nodes:stored.nodes.map(node=>({...node,callFrame:{...node.callFrame,
 functionName:strings[node.callFrame.functionName],url:strings[node.callFrame.url]}}))};
assert.deepEqual(restored,profile);
const packet={schema:'complete-reverse-build-cpu-diagnostic-v3',samplingIntervalMicroseconds:10000,profile:stored,
 profileCallFrameStringTable:strings,completeOriginalProfileRejoinVerified:true,milliseconds,
 inputs,output,outputSha256:hash(raw),outputBytes:raw.length,outputs:artifacts.size,
 typescriptVersion:JSON.parse(readFileSync('js/node_modules/typescript/package.json')).version,
 engine:process.version,sourceHead:execFileSync('git',['rev-parse','HEAD']).toString().trim(),
 originalDeadlinesQualified:false,semanticAuthority:false,runtimeParity:false,rustExecuted:false};
const receipt=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/reverse-build-complete-cpu-v3.json',Buffer.from(JSON.stringify(packet)));
console.log(JSON.stringify({milliseconds,output,outputSha256:packet.outputSha256,
 outputBytes:raw.length,outputs:artifacts.size,receipt}));
