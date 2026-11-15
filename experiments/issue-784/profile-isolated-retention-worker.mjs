// Profile one genuine finite profile request, independently of session timing.
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createCompilationMatrix,compilationMatrixDescription,DECLARED_FAMILY_PROFILES} from '../../tools/translation/compilation-matrix.mjs';
import {captureSourceCorpus} from '../../tools/translation/source-corpus.mjs';
const [variant,output]=process.argv.slice(2);
if(!['original','native'].includes(variant)||!output)throw TypeError('use original|native FRESH_GZIP');
const fixture=mkdtempSync(join(tmpdir(),'router-native-worker-profile-'));
const source='\ufeff// complete Ω😀\r\npub fn answer()->u8{7} pub fn blocked()->u8{unknown!(9)}\r\n';
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
try{
 mkdirSync(join(fixture,'src'));writeFileSync(join(fixture,'src/lib.rs'),source);
 execFileSync('git',['-c','core.hooksPath=/dev/null','init','--quiet'],{cwd:fixture,env});
 execFileSync('git',['-c','core.hooksPath=/dev/null','add','.'],{cwd:fixture,env});
 const matrix=createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES}),description=compilationMatrixDescription(matrix),member=description.profiles[0],paths=['src/lib.rs'];
 const request={schema:'router-isolated-profile-request-v1',root:fixture,plannerModule:variant==='native'?'native-retained-owned-field-bulk.mjs':'retained-owned-field-bulk.mjs',selection:{profiles:description.profiles.map(({name,compilationProfile})=>({name,compilationProfile})),requiredProfiles:description.requiredProfiles},matrixSha256:matrix.sha256,name:member.name,directory:member.directory,paths,entries:paths,corpus:captureSourceCorpus({root:fixture,paths}),progress:true};
 const worker=resolve('tools/translation/'+(variant==='native'?'native-owned-field-isolated-matrix-profile.mjs':'owned-field-isolated-matrix-profile.mjs'));
 const profileDirectory=join(fixture,'.cpu-profile');mkdirSync(profileDirectory);
 const args=['--max-old-space-size=2048','--cpu-prof','--cpu-prof-dir='+profileDirectory,worker],started=performance.now();
 const result=spawnSync(process.execPath,args,{cwd:fixture,env,input:JSON.stringify(request)+'\n',encoding:'utf8',maxBuffer:16777216}),elapsedMilliseconds=performance.now()-started;
 const profiles=readdirSync(profileDirectory).map(name=>({name,source:readFileSync(join(profileDirectory,name),'utf8')}));
 if(profiles.length!==1||!JSON.parse(profiles[0].source).nodes.length)throw Error('complete worker CPU profile required');
 const packet={schema:'isolated-native-worker-profile-diagnostic-v1',node:process.version,variant,args,source,workerSource:readFileSync(worker,'utf8'),request,elapsedMilliseconds,status:result.status,signal:result.signal,error:result.error?{message:result.error.message,code:result.error.code}:null,stdout:result.stdout,stderr:result.stderr,profiles,completeOutputPayloadsCaptured:false,performanceQualified:false,fullGateQualified:false};
 const raw=Buffer.from(JSON.stringify(packet)+'\n');if(raw.length>64*1024*1024)throw RangeError('complete profile packet byte bound');
 writeFileSync(output,gzipSync(raw),{flag:'wx'});if(!gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('complete profile packet readback differs');
 console.log(JSON.stringify({output,bytes:readFileSync(output).length,sha256:createHash('sha256').update(readFileSync(output)).digest('hex'),variant,elapsedMilliseconds,status:result.status,signal:result.signal,error:packet.error,performanceQualified:false}));
 if(result.error||result.signal||result.status!==0)process.exitCode=1;
}finally{rmSync(fixture,{recursive:true,force:true});}
