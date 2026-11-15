// Bounded diagnostic over the complete production graph; no output is installed.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {createDeriveFootprintContext} from '../../tools/translation/derive-footprints.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';
import {trackedSource} from '../../tools/translation/source-corpus.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';

assert.equal(process.argv.length,2);
const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{encoding:'utf8',maxBuffer:4194304}).split('\0').filter(Boolean);
const cargo={manifest:readFileSync(rustPackageSourcePath(root,'Cargo.toml'),'utf8'),lock:readFileSync(rustPackageSourcePath(root,'Cargo.lock'),'utf8')};
const dependencies=loadDeriveDependencyProof(cargo),inputs=[];
const session=new Session();session.connect();
const call=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,result)=>error?reject(error):resolve(result)));
await call('Profiler.enable');
await call('Profiler.setSamplingInterval',{interval:1000});
await call('Profiler.start');
const started=performance.now();
const graph=resolveModuleGraph({entry:rustPackageSourcePath(root,'src/lib.rs'),paths,
 readSource:path=>{const source=trackedSource(root,path);inputs.push({path,source,sha256:hash(source)});return source;},
 compilationProfile:PRODUCTION_PROFILE});
const graphMilliseconds=performance.now()-started;
const context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
const totalMilliseconds=performance.now()-started;
const {profile}=await call('Profiler.stop');session.disconnect();
assert.equal(graph.modules.length,397);assert.equal(context.certificates.length,419);
const contextBytes=Buffer.from(JSON.stringify({context}));
assert.equal(hash(contextBytes),'2d37a69b9373a78fb1f40bfba3051e84699daf381f3efa584a8589aa612ad6a3');
const packet={schema:'complete-production-derive-cpu-diagnostic-v1',profile,
 graphMilliseconds,totalMilliseconds,inputs,cargo,paths,
 contextSha256:hash(contextBytes),contextBytes:contextBytes.length,
 compilerSources:['source-module-views.mjs','derive-footprints.mjs'].map(name=>{
  const path='tools/translation/'+name,source=readFileSync(path,'utf8');return {path,source,sha256:hash(source)};
 }),typescriptVersion:JSON.parse(readFileSync('js/node_modules/typescript/package.json')).version,
 engine:process.version,sourceHead:execFileSync('git',['rev-parse','HEAD']).toString().trim(),
 productionExecutableGain:0,originalDeadlinesQualified:false,runtimeParity:false,rustExecuted:false};
const raw=Buffer.from(JSON.stringify(packet)+'\n'),packed=gzipSync(raw);
assert.ok(packed.length<16*1024*1024);
const target='ci-logs/issue-784-restart-2/production-derive-cpu.json.gz';
writeFileSync(target,packed,{flag:'wx'});
assert.ok(gunzipSync(readFileSync(target)).equals(raw));
console.log(JSON.stringify({target,bytes:packed.length,sha256:hash(packed),graphMilliseconds,totalMilliseconds,contextSha256:packet.contextSha256}));
