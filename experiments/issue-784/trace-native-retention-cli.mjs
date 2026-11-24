// One finite original fixture and one complete CLI invocation. Diagnostic only.
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const [variant,selection,output]=process.argv.slice(2);
if(!['original','native'].includes(variant)||!['canonical','matrix','missing-option','unsupported-option'].includes(selection)||!output||variant!=='native'&&selection.includes('option'))throw TypeError('use original|native canonical|matrix|missing-option|unsupported-option FRESH_GZIP');
const fixture=mkdtempSync(join(tmpdir(),'router-native-output-trace-'));
const source='\ufeff// complete Ω😀\r\npub fn answer()->u8{7} pub fn blocked()->u8{unknown!(9)}\r\n';
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));
const git=['-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false'];
try{
 mkdirSync(join(fixture,'src'));writeFileSync(join(fixture,'src/lib.rs'),source);
 execFileSync('git',[...git,'init','--quiet'],{cwd:fixture,env,timeout:10000});
 execFileSync('git',[...git,'add','.'],{cwd:fixture,env,timeout:10000});
 const cli=resolve('scripts/'+(variant==='native'?'translate-router-native-owned-field-meta.mjs':'translate-router-owned-field-meta.mjs'));
 const args=[cli,'--root',fixture,...(selection==='missing-option'?[]:['--retain-output-text']),...(selection==='unsupported-option'?['--owned-core-definitions']:[]),'--progress',...(selection==='matrix'?['--profile-matrix']:[])];
 const start=performance.now(),result=spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:20000,maxBuffer:8388608}),elapsedMilliseconds=performance.now()-start;
 const rows=[];function tree(path,base=''){for(const entry of readdirSync(path,{withFileTypes:true})){if(!base&&entry.name==='.git')continue;const name=base+entry.name,full=join(path,entry.name);if(entry.isDirectory())tree(full,name+'/');else rows.push({path:name,base64:readFileSync(full).toString('base64')});}}tree(fixture);
 const events=result.stderr.split('\n').filter(Boolean).map(line=>{try{return JSON.parse(line);}catch{return {unparsed:line};}});
 const expectedExit=selection.includes('option')?1:0;
 const packet={schema:'native-retention-cli-progress-diagnostic-v1',variant,selection,node:process.version,args,source,cliSource:readFileSync(cli,'utf8'),elapsedMilliseconds,status:result.status,expectedExit,signal:result.signal,error:result.error?{name:result.error.name,code:result.error.code,message:result.error.message}:null,stdout:result.stdout,stderr:result.stderr,events,completeArtifacts:rows,performanceQualified:false,fullGateQualified:false};
 const raw=Buffer.from(JSON.stringify(packet)+'\n');if(raw.length>64*1024*1024)throw RangeError('complete diagnostic byte bound');
 const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
 console.log(JSON.stringify({output,bytes:packed.length,sha256:createHash('sha256').update(packed).digest('hex'),variant,selection,elapsedMilliseconds,status:result.status,signal:result.signal,error:packet.error,events:events.length,performanceQualified:false}));
 if(result.error||result.signal||result.status!==expectedExit)process.exitCode=1;
}finally{rmSync(fixture,{recursive:true,force:true});}
