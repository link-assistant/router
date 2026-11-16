// Receiving-only real temporary Git cohort SOURCE. No command executed here.
// The real corpus API captures the installed index/HEAD; no explicit-files
// whitelist substitutes for complete native module/source discovery.
import {spawnSync} from 'node:child_process';
import {existsSync,lstatSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {SOURCE_CORPUS_LIMITS} from './source-corpus.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Policy receiving native cohort: '+message);};
const safe=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&!/[:\\\0\r\n]/u.test(path)&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
function selected(paths){accountData(paths);if(!Array.isArray(paths)||!paths.length||paths.length>SOURCE_CORPUS_LIMITS.trackedPaths+3||new Set(paths).size!==paths.length||paths.some(path=>!safe(path)||!path.endsWith('.rs')&&!['Cargo.toml','Cargo.lock','rust/Cargo.toml','rust/Cargo.lock'].includes(path)))fail('whole bounded native/Cargo index path census required');return [...paths].sort();}
function command(root,args,{startedAt,record=()=>{},input}={}){
 if(!Number.isFinite(startedAt))fail('original receiving case start required');const remaining=60000-(performance.now()-startedAt);if(remaining<=0)fail('original receiving case deadline');const timeout=Math.max(1,Math.floor(Math.min(20000,remaining))),nullFile=process.platform==='win32'?'NUL':'/dev/null';
 const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:nullFile,GIT_CONFIG_SYSTEM:nullFile,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',GIT_PAGER:'cat',GIT_AUTHOR_NAME:'Policy receiving fixture',GIT_AUTHOR_EMAIL:'policy-receiving@invalid',GIT_COMMITTER_NAME:'Policy receiving fixture',GIT_COMMITTER_EMAIL:'policy-receiving@invalid',GIT_AUTHOR_DATE:'2000-01-01T00:00:00Z',GIT_COMMITTER_DATE:'2000-01-01T00:00:00Z'};
 const prefix=['-C',root,'--literal-pathspecs','-c','core.hooksPath='+nullFile,'-c','gc.auto=0','-c','maintenance.auto=false','-c','core.fsmonitor=false','-c','core.untrackedCache=false','-c','core.autocrlf=false','-c','core.safecrlf=true','-c','commit.gpgSign=false','-c','tag.gpgSign=false','-c','core.pager=cat'],began=performance.now(),result=spawnSync(process.platform==='win32'?'git':'/usr/bin/git',[...prefix,...args],{cwd:root,env,input,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout,maxBuffer:8388608});
 record({stage:'temporary-native-source-git',args,status:result.status,signal:result.signal,stdout:String(result.stdout??''),stderr:String(result.stderr??''),rawComplete:!result.error&&!result.signal,timeoutMs:timeout,elapsedMs:performance.now()-began});if(result.error||result.signal||result.status!==0)fail('isolated no-hooks source cohort Git operation failed');return String(result.stdout);
}
export function initializePolicyNativeCohort(directory,paths,options){
 const root=resolve(directory),original=selected(paths);if(typeof options?.reserveGit!=='function')fail('receiving disk reservation callback required');options.reserveGit(4*1024*1024);if(existsSync(join(root,'.git')))fail('fresh receiving directory required; original repository index is never changed');const template=join(root,'.policy-empty-git-template');mkdirSync(template);command(root,['init','--quiet','--template='+template],options);return commitPolicyNativeCohort(root,original,{...options,label:'complete original copied source baseline'});
}
export function commitPolicyNativeCohort(directory,paths,{label='complete installed source cohort',...options}={}){
 const root=resolve(directory),names=selected(paths);let contentBytes=0;for(const path of names){const value=lstatSync(join(root,path));if(!value.isFile()||value.isSymbolicLink())fail('ordinary complete native source files required');contentBytes+=value.size;if(contentBytes>88*1024*1024)fail('original complete source/cargo cohort size bound');}
 const input=names.join('\0')+'\0',pathBytes=Buffer.byteLength(input);if(pathBytes>1048576)fail('unchanged tracked-source census byte bound');if(typeof options.reserveGit!=='function')fail('receiving disk reservation callback required');
 // Conservative loose-object/index/tree reservation before a mutating Git
 // command. The receiver still checks actual complete disk after every step.
 options.reserveGit(Math.ceil(contentBytes*1.25)+pathBytes*64+names.length*512+4*1024*1024);command(root,['add','--sparse','--pathspec-from-file=-','--pathspec-file-nul'],{...options,input});command(root,['commit','--quiet','--allow-empty','--no-verify','-m',label],options);
 const head=command(root,['rev-parse','--verify','HEAD'],options).trim(),index=command(root,['ls-files','--stage','-z'],options),records=index.split('\0').filter(Boolean).map(row=>{const at=row.indexOf('\t'),parts=row.slice(0,at).split(' ');if(at<0||!['100644','100755'].includes(parts[0])||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(parts[1])||parts[2]!=='0')fail('complete ordinary native source stage/mode/oid required');return {path:row.slice(at+1),mode:parts[0],object:parts[1],stage:0};});
 if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(head)||records.length!==names.length||records.some((row,index)=>row.path!==names[index]))fail('real complete native cohort HEAD/index/mode census differs');return {schema:'receiving-native-source-cohort-v1',head,records,completeModeAndPathCensus:true,sourceAuthority:false,semanticAuthority:false};
}
export function leavePolicyNativeLeafUntracked(directory,path,options){
 if(!safe(path)||!path.endsWith('.rs'))fail('one actual produced native leaf required');if(typeof options?.reserveGit!=='function')fail('receiving disk reservation callback required');options.reserveGit(4*1024*1024);const root=resolve(directory);command(root,['rm','--cached','--quiet','--',path],options);command(root,['commit','--quiet','--no-verify','-m','independent missing installed native leaf refusal fixture'],options);return {path,physicallyPresent:existsSync(join(root,path)),intentionallyUntracked:true,sourceAuthority:false,semanticAuthority:false};
}

// The parent repository's immutable baseline receipt is separate from the
// freshly-authored receiving HEAD. A copied commit must never impersonate it.
export function readPolicyNativeCohort(directory,paths,options){
 const root=resolve(directory),names=selected(paths),wanted=new Set(names),head=command(root,['rev-parse','--verify','HEAD'],options).trim(),index=command(root,['ls-files','--stage','-z'],options),records=[];
 for(const text of index.split('\0').filter(Boolean)){const tab=text.indexOf('\t');if(tab<0)fail('original complete index record required');const path=text.slice(tab+1);if(!wanted.has(path))continue;const fields=text.slice(0,tab).split(' ');if(!['100644','100755'].includes(fields[0])||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(fields[1])||fields[2]!=='0')fail('original ordinary merged mode/oid stage required');records.push({path,mode:fields[0],object:fields[1],stage:0});}
 records.sort((left,right)=>left.path<right.path?-1:left.path>right.path?1:0);if(records.length!==names.length||records.some((row,index)=>row.path!==names[index]))fail('original complete source/Cargo index census differs');return {schema:'original-native-source-index-receipt-v1',head,records,sourceAuthority:false,semanticAuthority:false};
}

// Additional receiving-only step AFTER the original native cohort is complete.
// The original native-only APIs above retain their exact census/refusals.
// Prepare the only artifact parent before source frames capture root identity.
// Later writes inside this directory cannot create a new child of that root.
export function prepareOpaqueReceivingOutputDirectory(directory){
 const root=resolve(directory),rootInfo=lstatSync(root);if(!rootInfo.isDirectory()||rootInfo.isSymbolicLink())fail('ordinary receiving root required');const target=join(root,'received');let created=false,info;try{info=lstatSync(target);}catch(error){if(error?.code!=='ENOENT')throw error;mkdirSync(target);created=true;info=lstatSync(target);}if(!info.isDirectory()||info.isSymbolicLink())fail('ordinary owned receiving output directory required');return {path:target,created,sourceAuthority:false,semanticAuthority:false};
}
export function commitOpaqueCompilerSourceCohort(directory,paths,options){
 accountData(paths);if(!Array.isArray(paths)||!paths.length||paths.length>8192||new Set(paths).size!==paths.length||paths.some(path=>!safe(path)))fail('complete bounded copied compiler/native cohort required');
 const root=resolve(directory),names=[...paths].sort();let bytes=0;
 for(const path of names){const stat=lstatSync(join(root,path));if(!stat.isFile()||stat.isSymbolicLink()||stat.size>33554432||(bytes+=stat.size)>67108864)fail('original receiving complete file/byte domain exceeded');}
 const input=names.join('\0')+'\0',pathBytes=Buffer.byteLength(input);if(pathBytes>1048576||typeof options?.reserveGit!=='function')fail('original source-list/reservation domain required');
 options.reserveGit(Math.ceil(bytes*1.25)+pathBytes*64+names.length*512+4*1024*1024);
 prepareOpaqueReceivingOutputDirectory(root);
 const record=options.record,actual={...options,record:receipt=>record?.({...receipt,stage:'temporary-complete-compiler-source-git'})};
 command(root,['add','--sparse','--pathspec-from-file=-','--pathspec-file-nul'],{...actual,input});command(root,['commit','--quiet','--allow-empty','--no-verify','-m','complete copied compiler profiles and native receiving cohort'],actual);
 const head=command(root,['rev-parse','--verify','HEAD'],actual).trim(),raw=command(root,['ls-files','--stage','-z'],actual),records=raw.split('\0').filter(Boolean).map(row=>{const at=row.indexOf('\t'),fields=row.slice(0,at).split(' ');if(at<0||!['100644','100755'].includes(fields[0])||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(fields[1])||fields[2]!=='0')fail('complete ordinary compiler/source index required');return {path:row.slice(at+1),mode:fields[0],object:fields[1],stage:0};});
 if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(head)||records.length!==names.length||records.some((row,at)=>row.path!==names[at]))fail('complete actual compiler/native cohort differs');
 return {schema:'actual-complete-compiler-native-receiving-cohort-v1',head,records,compilerAndProfilesTracked:true,sourceAuthority:false,semanticAuthority:false};
}


// Exact path geometry bounds for a fresh ordinary v2 index/tree. These are
// operational reservations only, never source or compiler permission.
export function planOpaqueCompilerMetadataReservation(paths,format){
 accountData(paths);if(!Array.isArray(paths)||!paths.length||paths.length>8192||new Set(paths).size!==paths.length||paths.some(path=>!safe(path))||!['sha1','sha256'].includes(format))fail('complete ordinary source paths and native Git object format required');
 const hashBytes=format==='sha1'?20:32,dirs=new Set(['']);let pathBytes=0,indexBytes=12+hashBytes,treeBytes=0;
 for(const path of paths){const raw=Buffer.byteLength(path);pathBytes+=raw+1;indexBytes+=Math.ceil((96+raw+1)/8)*8;const parts=path.split('/');treeBytes+=Buffer.byteLength(parts.at(-1))+8+hashBytes;for(let end=1;end<parts.length;end++)dirs.add(parts.slice(0,end).join('/'));}
 if(pathBytes>1048576)fail('original complete source-list byte bound');for(const dir of dirs)if(dir)treeBytes+=Buffer.byteLength(dir.split('/').at(-1))+8+hashBytes;
 // Two index images, cache/tree records and original4MiB fixed overhead.
 // No source blobs are billed here: each bounded object batch is reserved
 // separately before its real Git write and actual complete disk recheck.
 const reserveBytes=2*indexBytes+Math.ceil((treeBytes+dirs.size*64)*1.25)+dirs.size*256+paths.length*64+4*1024*1024;
 if(!Number.isSafeInteger(reserveBytes))fail('representable complete metadata reservation required');
 return Object.freeze({files:paths.length,pathBytes,directories:dirs.size,indexBytes,treeBytes,reserveBytes,sourceAuthority:false,semanticAuthority:false});
}
function cohortStamp(stat){return ['dev','ino','mode','size','mtimeNs','ctimeNs'].map(key=>{if(typeof stat[key]!=='bigint')fail('precise ordinary source identity/time required');return String(stat[key]);});}
function sameCohortStamp(left,right){return left.length===right.length&&left.every((value,index)=>value===right[index]);}
export function commitOpaqueCompilerSourceCohortInBatches(directory,paths,options){
 accountData(paths);if(!Array.isArray(paths)||!paths.length||paths.length>8192||new Set(paths).size!==paths.length||paths.some(path=>!safe(path)||path.split('/').includes('.gitattributes')))fail('complete ordinary copied cohort without attribute-file transforms required');
 if(typeof options?.reserveGit!=='function')fail('original receiving disk reservation callback required');const root=resolve(directory),names=[...paths].sort(),rows=[];let bytes=0;
 for(const path of names){const stat=lstatSync(join(root,path),{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||stat.size>33554432n||(bytes+=Number(stat.size))>67108864)fail('original complete source file/aggregate bound');rows.push({path,bytes:Number(stat.size),mode:(stat.mode&0o111n)?'100755':'100644',stamp:cohortStamp(stat)});}
 const nullFile=process.platform==='win32'?'NUL':'/dev/null',flags=['-c','index.version=2','-c','core.splitIndex=false','-c','core.attributesFile='+nullFile],record=options.record,actual={...options,record:receipt=>record?.({...receipt,stage:'temporary-batched-compiler-source-git'})};prepareOpaqueReceivingOutputDirectory(root);
 const format=command(root,[...flags,'rev-parse','--show-object-format'],actual).trim(),metadata=planOpaqueCompilerMetadataReservation(names,format),pattern=format==='sha1'?/^[a-f0-9]{40}$/u:/^[a-f0-9]{64}$/u;
 const hashes=new Map();let batches=0,batch=[],batchBytes=0,argumentBytes=0;
 const verify=row=>{const stat=lstatSync(join(root,row.path),{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||!sameCohortStamp(cohortStamp(stat),row.stamp))fail('complete source changed during object/index preparation');};
 const flush=()=>{
  if(!batch.length)return;for(const row of batch)verify(row);options.reserveGit(Math.ceil((batchBytes+batch.length*64)*1.25)+batch.length*4096+65536);
  const output=command(root,[...flags,'hash-object','-w','--no-filters','--',...batch.map(row=>row.path)],actual),objects=output.trim().split('\n');if(objects.length!==batch.length||objects.some(value=>!pattern.test(value)))fail('real complete Git object batch differs');for(let at=0;at<batch.length;at++){verify(batch[at]);hashes.set(batch[at].path,objects[at]);}batches++;batch=[];batchBytes=0;argumentBytes=0;
 };
 for(const row of rows){const next=Buffer.byteLength(row.path)+1;if(batch.length&&(batch.length>=128||batchBytes+row.bytes>1048576||argumentBytes+next>65536))flush();batch.push(row);batchBytes+=row.bytes;argumentBytes+=next;}flush();
 for(const row of rows)verify(row);options.reserveGit(metadata.reserveBytes);
 const input=rows.map(row=>row.mode+' '+hashes.get(row.path)+'\t'+row.path+'\0').join('');if(Buffer.byteLength(input)>2097152)fail('bounded complete raw index input required');command(root,[...flags,'update-index','-z','--index-info'],{...actual,input});
 command(root,[...flags,'commit','--quiet','--allow-empty','--no-verify','-m','complete copied compiler profiles and native receiving cohort'],actual);
 const head=command(root,[...flags,'rev-parse','--verify','HEAD'],actual).trim(),raw=command(root,[...flags,'ls-files','--stage','-z'],actual),records=raw.split('\0').filter(Boolean).map(row=>{const at=row.indexOf('\t'),fields=row.slice(0,at).split(' ');if(at<0||!['100644','100755'].includes(fields[0])||!pattern.test(fields[1])||fields[2]!=='0')fail('complete ordinary real source index required');return {path:row.slice(at+1),mode:fields[0],object:fields[1],stage:0};});
 if(!pattern.test(head)||records.length!==names.length||records.some((row,at)=>row.path!==names[at]||row.object!==hashes.get(row.path)||row.mode!==rows[at].mode))fail('complete real compiler/native cohort differs');for(const row of rows)verify(row);
 return {schema:'actual-complete-compiler-native-receiving-cohort-v1',head,records,compilerAndProfilesTracked:true,objectBatches:batches,metadataReservedBytes:metadata.reserveBytes,sourceAuthority:false,semanticAuthority:false};
}
