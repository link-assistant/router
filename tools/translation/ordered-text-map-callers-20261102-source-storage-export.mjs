// Explicit read-only SOURCE-PROFILE storage export domain. Old exporter unchanged.
// Code/native/SDK retain original physical FD reads; no synthetic NodeStats.
import {execFileSync} from 'node:child_process';import {withReadonlySourceProfiles,readReadonlySourceProfileBytes,recloseReadonlySourceProfiles} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {createHash} from 'node:crypto';
import {constants,lstatSync,openSync,fstatSync,readSync,closeSync,realpathSync} from 'node:fs';
import {join,resolve,sep,dirname,basename} from 'node:path';
import {createCompactSourceVault,COMPACT_SOURCE_VAULT_LIMITS as L} from './compact-source-vault-20261102.mjs';
import {writeCompactSourceVaultDirectory} from './compact-source-vault-store-20261102.mjs';
import {isCompilerSourceInputPath} from './compiler-source-inputs.mjs';
import {TRANSLATOR_ENTRYPOINTS} from './translator-entrypoints.mjs';
import {PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS} from './paired-core-export-bundle.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
const fail=message=>{throw TypeError('Compact committed source export DATA: '+message);};
const keys=['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs'];
const same=(a,b)=>keys.every(key=>a[key]===b[key]);
const sha=raw=>createHash('sha256').update(raw).digest('hex');
function safe(name){if(typeof name!=='string'||!name||name.length>4096||/[\x00-\x1f\x7f\\:]/u.test(name)||/\p{Surrogate}/u.test(name)||name.startsWith('/')||name.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative source path required');return name;}
function git(root,args){const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')));env.GIT_CONFIG_NOSYSTEM='1';env.GIT_CONFIG_GLOBAL='/dev/null';return execFileSync('git',args,{cwd:root,env,encoding:'utf8',timeout:10000,maxBuffer:8388608,stdio:['ignore','pipe','pipe']});}
const defaultSelected=name=>name==='LICENSE'||TRANSLATOR_ENTRYPOINTS.includes(name)||PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS.includes(name)||isCompilerSourceInputPath(name)||name.startsWith('tools/translation/source-profiles/')||name.startsWith('tools/translation/extensions/')||name.startsWith('tools/translation/vendor/')||name.startsWith('tools/translation/js-to-rust/vendor/');
function capture(root,extra){
 const head=git(root,['rev-parse','--verify','HEAD']).trim();if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(head))fail('complete committed HEAD required');
 const select=name=>defaultSelected(name)||extra.has(name),tree=[];
 for(const record of git(root,['ls-tree','-r','-z',head]).split('\0').filter(Boolean)){const match=/^(\d{6}) (\S+) ([a-f0-9]+)\t(.+)$/u.exec(record);if(!match)fail('complete original tree entry required');const[,mode,type,gitBlob,path]=match;if(!select(path))continue;safe(path);if(type!=='blob'||!['100644','100755'].includes(mode)||gitBlob.length!==head.length)fail('committed ordinary source required');tree.push({path,mode,gitBlob});if(tree.length>L.files)fail('complete logical source census exceeded');}
 const index=[];for(const record of git(root,['ls-files','--stage','-z']).split('\0').filter(Boolean)){const match=/^(\d{6}) ([a-f0-9]+) (\d+)\t(.+)$/u.exec(record);if(!match)fail('complete original index entry required');const[,mode,gitBlob,stage,path]=match;if(!select(path))continue;if(stage!=='0')fail('unmerged source input refused');index.push({path,mode,gitBlob});}
 const sort=rows=>rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);sort(tree);sort(index);if(JSON.stringify(tree)!==JSON.stringify(index))fail('complete selected source index differs from HEAD');
 const names=new Set(tree.map(row=>row.path));for(const name of [...TRANSLATOR_ENTRYPOINTS,...PAIRED_CORE_TRANSLATOR_NATIVE_INPUTS,'LICENSE','tools/translation/bulk.mjs','tools/translation/vendor/meta-language/package.json',...extra])if(!names.has(name))fail('complete required committed source closure is missing '+name);
 if(!tree.some(row=>row.path.startsWith('tools/translation/source-profiles/')))fail('complete original profiles required');return {head,rows:tree};
}
function physical(root,row,consume){
 const parents=[];let directory=root;for(const part of row.path.split('/').slice(0,-1)){directory=join(directory,part);const stat=lstatSync(directory,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('source directory links refused');parents.push({path:directory,stat});}
 const file=join(root,row.path),before=lstatSync(file,{bigint:true});if(!before.isFile()||before.isSymbolicLink()||before.size<0n||before.size>BigInt(L.fileBytes)||!Number.isInteger(constants.O_NOFOLLOW)||constants.O_NOFOLLOW<=0||!Number.isInteger(constants.O_NONBLOCK)||constants.O_NONBLOCK<=0)fail('bounded ordinary no-follow committed source required');const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);let failed=false;
 try{const first=fstatSync(fd,{bigint:true});if(!first.isFile()||!same(first,before))fail('source identity changed before complete read');const raw=Buffer.alloc(Number(first.size)+1);let at=0;while(at<raw.length){const count=readSync(fd,raw,at,Math.min(65536,raw.length-at),null);if(!count)break;at+=count;}if(at!==Number(first.size))fail('source grew or truncated during complete read');const bytes=raw.subarray(0,at),hash=createHash(row.gitBlob.length===40?'sha1':'sha256').update(Buffer.from('blob '+at+'\0')).update(bytes).digest('hex');if(hash!==row.gitBlob||((first.mode&0o111n)?'100755':'100644')!==row.mode)fail('complete physical source bytes/mode differ from committed blob');
 return withCompleteSourceClosingFence(()=>consume(bytes,first),[()=>{const last=fstatSync(fd,{bigint:true}),current=lstatSync(file,{bigint:true});if(!current.isFile()||current.isSymbolicLink()||!same(first,last)||!same(last,current))fail('source identity changed during complete read');},()=>{let failed=false,primary;for(const parent of parents)try{const stat=lstatSync(parent.path,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink()||!same(parent.stat,stat))fail('original source directory changed');}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;}]);
 }catch(error){failed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!failed)throw error;}}
}
/** Every extra path must be named explicitly, committed, physically re-read and
 * retained in the vault. Default production selection does NOT claim complete
 * fixture/test/SDK closure. A receiving collector must supply and qualify it.
 * No compression trial or this exporter has been executed during drafting.
 */
export function exportReadonlyCommittedSourceVault({sourceRoot,output,extraPaths=[]}={}){
 return withSourceInputValidation(()=>{
 if(typeof sourceRoot!=='string'||typeof output!=='string'||!Array.isArray(extraPaths)||extraPaths.length>L.files)fail('explicit source root/output and bounded exact extra source paths required');
 const root=realpathSync(resolve(sourceRoot)),initial=lstatSync(root,{bigint:true}),destination=join(realpathSync(dirname(resolve(output))),basename(resolve(output)));if(!initial.isDirectory()||destination===root||destination.startsWith(root+sep)||root.startsWith(destination+sep))fail('separate destination and physical source root required');
 return withReadonlySourceProfiles(root,sourceToken=>{
 const extra=new Set(extraPaths.map(safe));if(extra.size!==extraPaths.length)fail('duplicate explicit source closure paths refused');const before=capture(root,extra),wire=JSON.stringify(before),author=createCompactSourceVault(),stamps=[],stored=[];let model;
 const close=()=>{let failed=false,primary;const check=run=>{try{run();}catch(error){if(!failed){failed=true;primary=error;}}};check(()=>{if(JSON.stringify(capture(root,extra))!==wire)fail('complete original HEAD/index changed');});for(const row of stamps)check(()=>physical(root,row,(raw,stat)=>{if(!same(row.stat,stat)||sha(raw)!==row.sha256)fail('complete original source changed across export');}));for(const row of stored)check(()=>{const raw=readReadonlySourceProfileBytes(sourceToken,row.path,{maximum:L.fileBytes});if(sha(raw)!==row.sha256)fail('complete original logical source bytes changed across export');});if(sourceToken!==null)check(()=>recloseReadonlySourceProfiles(sourceToken));check(()=>{if(!same(initial,lstatSync(root,{bigint:true})))fail('original repository directory changed');});if(failed)throw primary;};
 try{return withCompleteSourceClosingFence(()=>{for(const row of before.rows){if(sourceToken!==null&&row.path.startsWith('tools/translation/source-profiles/')&&row.path!=='tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json'){const raw=readReadonlySourceProfileBytes(sourceToken,row.path,{maximum:L.fileBytes}),blob=createHash(row.gitBlob.length===40?'sha1':'sha256').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');if(blob!==row.gitBlob)fail('complete original logical bytes differ from actual committed source blob');author.add({...row,domain:'profiles',bytes:raw});stored.push({...row,sha256:sha(raw)});}else physical(root,row,(raw,stat)=>{author.add({...row,domain:row.path.startsWith('tools/translation/source-profiles/')?'profiles':'compiler',bytes:raw});stamps.push({...row,stat,sha256:sha(raw)});});}const receipt=Buffer.from(JSON.stringify({schema:'compact-committed-source-inventory-data-v1',sourceHead:before.head,inputs:before.rows,completeReceivingClosure:false,typescriptDependencyIncluded:false,sourceAuthority:false,semanticAuthority:false,compilerQualified:false})+'\n');author.add({path:'translator-export/source-receipt.json',domain:'compiler',mode:'100644',bytes:receipt,gitBlob:null});model=author.finish();close();const result=writeCompactSourceVaultDirectory(destination,model);return {...result,sourceHead:before.head,sourceInventorySha256:sha(Buffer.from(JSON.stringify(before.rows))),schema:'readonly-committed-source-vault-export-20261103-v1',sourceProfilesPhysicallyHot:sourceToken===null,completeProductionSelection:true,completeReceivingClosure:false,typescriptDependencyIncluded:false,sourceAuthority:false,semanticAuthority:false,compilerQualified:false,runtimeParity:false};},[close]);}
 finally{author.abort();stamps.length=0;stored.length=0;if(model){model.volumes.length=0;model.metadata.files.length=0;model.metadata.objects.length=0;}}
 });
 });
}
