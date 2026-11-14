// One complete build with native CPU telemetry and every output byte retained.
import {Session} from 'node:inspector';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {buildNativeTypeScript,regenerateNativeTypeScript,sourceModules} from '../../tools/translation/js-to-rust/native-typescript.mjs';
const label=process.argv[2];
if(!/^(baseline|batch-candidate|batch-candidate-qualified)$/.test(label??''))throw Error('An explicit finite comparison label is required');
const base='ci-logs/issue-784-restart-2/native-typescript-'+label;
const hash=value=>createHash('sha256').update(value).digest('hex');
const sourcePath='tools/translation/js-to-rust/native-typescript.mjs';
const before=readFileSync(sourcePath),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const session=new Session();session.connect();
const post=(name,args={})=>new Promise((resolve,reject)=>session.post(name,args,(error,result)=>error?reject(error):resolve(result)));
await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});
await post('Profiler.start');
const started=performance.now();
let artifacts,profile,directory;
try{
 if(label==='baseline')artifacts=buildNativeTypeScript(process.cwd());
 else {
  directory=mkdtempSync(join(tmpdir(),'router-native-batch-measurement-'));
  regenerateNativeTypeScript(directory,{sourceRoot:process.cwd()});
 }
 const elapsedMs=performance.now()-started;
 ({profile}=await post('Profiler.stop'));
 if(directory){
  const original=JSON.parse(gunzipSync(readFileSync('ci-logs/issue-784-restart-2/native-typescript-baseline-outputs.json.gz'),{maxOutputLength:32*1024*1024}));
  const walk=folder=>readdirSync(folder,{withFileTypes:true}).flatMap(row=>row.isDirectory()?walk(join(folder,row.name)):[join(folder,row.name)]);
  assert.deepEqual(walk(directory).map(path=>path.slice(directory.length+1)).sort(),original.rows.map(row=>row.path).sort());
  artifacts=new Map(original.rows.map(row=>{
   const actual=readFileSync(join(directory,row.path));
   assert.ok(actual.equals(Buffer.from(row.value,row.kind==='utf8'?'utf8':'base64')),row.path);
   return [row.path,row.kind==='utf8'?actual.toString('utf8'):actual];
  }));
 }
 const rows=[...artifacts].map(([path,value])=>({path,kind:typeof value==='string'?'utf8':'base64',
  value:typeof value==='string'?value:Buffer.from(value).toString('base64'),
  bytes:Buffer.byteLength(value),sha256:hash(value)}));
 const originals=rows.reduce((sum,row)=>sum+row.bytes,0);
 if(originals>32*1024*1024||!before.equals(readFileSync(sourcePath)))throw Error('Complete bounded stable source/output required');
 const retain=(name,value)=>{
  const raw=Buffer.from(JSON.stringify(value)),path=base+name+'.json.gz';
  if(raw.length>64*1024*1024)throw Error('Finite complete evidence bound');
  writeFileSync(path,gzipSync(raw),{flag:'wx'});
  if(!gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('Full readback differs');
  return {path,bytes:raw.length,sha256:hash(raw)};
 };
 const cpu=retain('-cpu',profile),outputs=retain('-outputs',{rows});
 const result={label,head,sourcePath,sourceSha256:hash(before),elapsedMs,
  modules:sourceModules(process.cwd()).length,outputs:rows.length,completeOutputBytes:originals,
  cpu,completeOutputs:outputs,heapUsed:process.memoryUsage().heapUsed,
  scope:label==='baseline'?'One entire public native build with 1ms CPU sampling.':
   'One entire private regeneration including fresh output writes, with 1ms CPU sampling; all bytes compared with the standalone baseline. Not a matched speed comparison or the original four-build deadline case.',
  fullGatePassed:false,runtimeParity:false,productionExecutableGain:0};
 writeFileSync(base+'-result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(result));
}finally{session.disconnect();if(directory)rmSync(directory,{recursive:true,force:true});}
