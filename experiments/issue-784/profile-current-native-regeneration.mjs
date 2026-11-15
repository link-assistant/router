// Profile one actual complete current check; no generated output is installed.
import {Session} from 'node:inspector';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {regenerateNativeTypeScript} from '../../tools/translation/js-to-rust/native-typescript.mjs';

const label=process.argv[2];
if(!/^[a-z0-9-]{1,70}$/u.test(label??''))throw Error('A unique finite task label is required');
const prefix='ci-logs/issue-784-restart-2/'+label;
const path='tools/translation/js-to-rust/native-typescript.mjs';
const before=readFileSync(path),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=value=>createHash('sha256').update(value).digest('hex');
const session=new Session();session.connect();
const post=(name,args={})=>new Promise((resolve,reject)=>session.post(name,args,(error,value)=>error?reject(error):resolve(value)));
try{
  await post('Profiler.enable');
  await post('Profiler.setSamplingInterval',{interval:1000});
  await post('Profiler.start');
  const start=performance.now();
  const result=regenerateNativeTypeScript(process.cwd(),{sourceRoot:process.cwd(),check:true});
  const elapsedMs=performance.now()-start;
  const {profile}=await post('Profiler.stop');
  if(!before.equals(readFileSync(path)))throw Error('Complete producer changed during observation');
  const raw=Buffer.from(JSON.stringify(profile));
  if(raw.length>64*1024*1024)throw Error('Complete finite CPU evidence bound exceeded');
  const profilePath=prefix+'-cpu.json.gz';
  writeFileSync(profilePath,gzipSync(raw),{flag:'wx'});
  if(!gunzipSync(readFileSync(profilePath),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('CPU evidence readback differs');
  const receipt={head,path,sourceSha256:hash(before),elapsedMs,result,profilePath,
    completeProfileBytes:raw.length,profileSha256:hash(raw),node:process.versions.node,
    diagnosticOnly:true,fullGatePassed:false,runtimeParity:false};
  writeFileSync(prefix+'-result.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(receipt));
}finally{session.disconnect();}
