// Finite original CLI fixture. Sampling is diagnostic and changes no case limit.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

if(process.argv[2]==='--child'){
 const root=process.argv[3],label=process.argv[4],mode=process.argv[5];
 const args=['--root',root,'--retain-output-text',...(mode==='matrix'?['--profile-matrix']:[])];
 const cli=resolve('scripts/translate-router-owned-field-meta.mjs');
 const session=new Session();session.connect();
 const post=(method,parameters={})=>new Promise((resolve,reject)=>session.post(method,parameters,(error,value)=>error?reject(error):resolve(value)));
 await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
 const started=performance.now();
 process.once('beforeExit',async()=>{
  const result=await post('Profiler.stop');session.disconnect();
  const record={schema:'finite-retained-cli-startup-profile-v1',engine:process.versions,
   elapsedMs:performance.now()-started,fixture:readFileSync(join(root,'src/lib.rs'),'utf8'),
   completeCliSource:readFileSync(cli,'utf8'),completeDiagnosticSource:readFileSync(fileURLToPath(import.meta.url),'utf8'),
   args,...result,
   receivingQualified:false,originalLimitsChanged:false,productionExecutableGain:0};
  console.error(JSON.stringify(writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/'+label+'-profile.json',Buffer.from(JSON.stringify(record)))));
 });
 process.argv=[process.execPath,cli,...args];
 await import(pathToFileURL(cli));
}else{
 const root=mkdtempSync(join(tmpdir(),'router-retained-cli-profile-'));
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
 try{
  mkdirSync(join(root,'src'));writeFileSync(join(root,'src/lib.rs'),'\ufeff// complete Ω😀\r\npub fn answer()->u8{7} pub fn blocked()->u8{unknown!(9)}\r\n');
  const fixed=['-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false'];
  execFileSync('git',[...fixed,'init','--quiet'],{cwd:root,env});execFileSync('git',[...fixed,'add','.'],{cwd:root,env});
  const output=execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--child',root,process.argv[2],process.argv[3]??'canonical'],{env,encoding:'utf8',maxBuffer:8388608});
  assert.equal(JSON.parse(output).runtimeParity,false);process.stdout.write(output);
 }finally{rmSync(root,{recursive:true,force:true});}
}
