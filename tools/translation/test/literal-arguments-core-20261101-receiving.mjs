// Isolated complete-source profile receiving harness SOURCE. All UNRUN.
// Subprocess exit discards the copied compiler's loader/private issuer graph.
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,opendirSync,lstatSync,rmSync,openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {proposeLiteralArgumentsCoreProfile} from '../literal-arguments-core-20261101-profile.mjs';
import {isCompilerSourceInputPath} from '../compiler-source-inputs.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),LIMIT=67108864,FILES=8192,RAW=8388608,CASE=60000,CHILD=20000;
const fail=message=>{throw new TypeError('Literal profile receiving: '+message);};
export function receiveLiteralArgumentsCoreProfile(t,payload,{startedAt}={}){
 if(!Number.isFinite(startedAt)||startedAt>performance.now())fail('original case start required');
 const report={schema:'literal-arguments-core-isolated-profile-receipt-v1',caseDeadlineMs:CASE,childDeadlineMs:CHILD,engine:process.versions.bun?'Bun':'Node',engineVersion:process.versions.bun??process.version,stdout:'',stderr:'',rawComplete:true,cleanupAttempted:false,cleanupSucceeded:false,files:0,bytes:0,runtimeParity:false};
 let directory=null,primaryFailed=false,written=0,names=0;const sources=[];
 const remaining=()=>{const left=CASE-(performance.now()-startedAt);if(left<=0)fail('original whole case deadline exceeded');return Math.max(1,Math.floor(Math.min(CHILD,left)));};
 function bytesAt(path,maximum){const before=lstatSync(path);if(!before.isFile()||before.isSymbolicLink()||before.size>maximum)fail('ordinary bounded compiler source closure required');const descriptor=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);let primaryReadFailed=false;try{const first=fstatSync(descriptor);if(!first.isFile()||first.dev!==before.dev||first.ino!==before.ino||first.size!==before.size||first.mtimeMs!==before.mtimeMs||first.ctimeMs!==before.ctimeMs)fail('stable ordinary compiler source required');const bytes=Buffer.alloc(first.size+1);let at=0;while(at<bytes.length){const count=readSync(descriptor,bytes,at,bytes.length-at,at);if(!count)break;at+=count;}const last=fstatSync(descriptor),after=lstatSync(path);if(at!==first.size||last.dev!==first.dev||last.ino!==first.ino||last.size!==first.size||last.mtimeMs!==first.mtimeMs||last.ctimeMs!==first.ctimeMs||!after.isFile()||after.isSymbolicLink()||after.dev!==last.dev||after.ino!==last.ino||after.size!==last.size||after.mtimeMs!==last.mtimeMs||after.ctimeMs!==last.ctimeMs)fail('complete compiler source changed during bounded read');return bytes.subarray(0,at);}catch(error){primaryReadFailed=true;throw error;}finally{try{closeSync(descriptor);}catch(error){if(!primaryReadFailed)throw error;}}}
 function boundedRead(path){const bytes=bytesAt(path,LIMIT-report.bytes);report.bytes+=bytes.length;if(++report.files>FILES||report.bytes>LIMIT)fail('complete compiler source closure bound');sources.push({path,bytes});return bytes;}
 const sourceSelected=path=>isCompilerSourceInputPath(path)||['extensions/','vendor/','js-to-rust/vendor/','source-profiles/'].some(prefix=>path.startsWith('tools/translation/'+prefix));
 function write(path,bytes){written+=Buffer.byteLength(bytes);if(written>LIMIT)fail('complete temporary source/output byte bound');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes);}
 function tree(from,to,depth=0,compiler=false){if(depth>64)fail('bounded source tree depth');const directory=opendirSync(from);let primaryDirectoryFailed=false;try{let entry;while((entry=directory.readSync())!==null){if(++names>FILES*2)fail('bounded complete source entry census');const name=entry.name;remaining();const source=join(from,name),target=join(to,name),logical=relative(root,source).split('\\').join('/'),info=lstatSync(source);if(info.isSymbolicLink())fail('compiler source symlink refused');if(info.isDirectory()){if(compiler){const subtree=['extensions/','vendor/','js-to-rust/vendor/','source-profiles/'].some(prefix=>(logical+'/').startsWith('tools/translation/'+prefix));if(!subtree&&logical.slice('tools/translation/'.length).split('/').some(part=>['test','fixtures','meta','projects','generated','node_modules','.git','source-profiles'].includes(part)||part.endsWith('-generated')))continue;}tree(source,target,depth+1,compiler);}else if(info.isFile()){if(compiler&&!sourceSelected(logical))continue;write(target,boundedRead(source));}else fail('ordinary compiler source closure required');}}catch(error){primaryDirectoryFailed=true;throw error;}finally{try{directory.closeSync();}catch(error){if(!primaryDirectoryFailed)throw error;}}}
 const close=()=>{let failed=false,first;for(const row of sources)try{if(!bytesAt(row.path,row.bytes.length).equals(row.bytes))fail('complete compiler source changed during receiving: '+relative(root,row.path));}catch(error){if(!failed){failed=true;first=error;}}if(failed)throw first;};
 try{return withCompleteSourceClosingFence(()=>{
  remaining();const proposal=proposeLiteralArgumentsCoreProfile();directory=mkdtempSync(join(tmpdir(),'router-literal-core-profile-'));
  tree(join(root,'tools/translation'),join(directory,'tools/translation'),0,true);
  // Copy genuine installed TypeScript code/declarations, never install/fallback
  // or alias the old compiler's private issuer graph into the copied one.
  const require=createRequire(join(root,'js/package.json')),packagePath=require.resolve('typescript/package.json'),packageRoot=dirname(packagePath);
  const packageSource=JSON.parse(bytesAt(packagePath,1048576).toString('utf8')),lock=JSON.parse(bytesAt(join(root,'js/package-lock.json'),4194304).toString('utf8'));
  if(packageSource.version!=='5.9.3'||lock.packages?.['node_modules/typescript']?.version!=='5.9.3')fail('actual installed and lockfile TypeScript5.9.3 required');
  report.compilerPackageVersion=packageSource.version;report.lockfileVersion=lock.packages['node_modules/typescript'].version;
  tree(packageRoot,join(directory,'js/node_modules/typescript'));
  for(const path of ['js/package.json','js/package-lock.json'])write(join(directory,path),boundedRead(join(root,path)));
  for(const row of proposal.substitutions){const original=join(root,row.path);if(!bytesAt(original,Buffer.byteLength(row.physicalBefore)).equals(Buffer.from(row.physicalBefore)))fail('exact original substitution predecessor changed');write(join(directory,row.path),row.after);}
  for(const row of proposal.additions)write(join(directory,row.path),row.source);
  for(const name of ['cross-module-helper-bulk-20261101-fixture.mjs','text-artifact-loader.mjs'])write(join(directory,'tools/translation/test',name),boundedRead(join(root,'tools/translation/test',name)));
  write(join(directory,'request.json'),JSON.stringify(payload));
  const runner=join(directory,'run.mjs');write(runner,`import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {compileLiteralArgumentsCoreProject,readLiteralArgumentsCoreMeta,invertLiteralArgumentsCoreTarget} from './tools/translation/literal-arguments-core-20261101-project.mjs';
import {withLiteralArgumentsCoreInstalledSources} from './tools/translation/literal-arguments-core-20261101-profile.mjs';
import {verifyCrossModuleHelperTargets} from './tools/translation/test/cross-module-helper-bulk-20261101-fixture.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './tools/translation/primitive-vector-iterator-bulk-20261101-accounting.mjs';
const input=JSON.parse(readFileSync(new URL('./request.json',import.meta.url),'utf8'));
const writeResult=value=>{accountData(value);const text=JSON.stringify(value);if(Buffer.byteLength(text)>16777216)throw new TypeError('complete receiving result bound');writeFileSync(new URL('./result.json',import.meta.url),text);};
try{
 let result=compileLiteralArgumentsCoreProject(input.request),reports=[];
 if(input.operation==='meta'){const meta=structuredClone(result.meta);if(input.mutate)meta.entry+='stale';result=readLiteralArgumentsCoreMeta(input.request,meta);}
 else if(input.operation==='inverse'){
  const key=input.language==='JavaScript'?'javascript':'typescript',before=JSON.stringify(input.before),after=JSON.stringify(input.after),source=result[key];assert.equal(source.split(before).length-1,1,'one actual unique emitted literal');result=invertLiteralArgumentsCoreTarget(input.request,{language:input.language,source:source.replace(before,after)});
 }
 else if(input.operation==='primary-source-close'){
  const source=new URL('./tools/translation/project.mjs',import.meta.url),original=readFileSync(source);
  for(const primary of [undefined,null,false,0,'',Object.freeze(Error('frozen primary'))]){let caught=false;try{withLiteralArgumentsCoreInstalledSources(()=>{writeFileSync(source,Buffer.concat([original,Buffer.from('\\n// closing failure')]));throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}finally{writeFileSync(source,original);}assert.equal(caught,true);}
  result={allExactPrimariesPreserved:true};
 }
 else if(input.operation==='source-poison'){
  const source=new URL('./tools/translation/project.mjs',import.meta.url),original=readFileSync(source);withLiteralArgumentsCoreInstalledSources(()=>{writeFileSync(source,Buffer.concat([original,Buffer.from('\\n//source observer failure')]));try{try{withLiteralArgumentsCoreInstalledSources(()=>null);}catch{}}finally{writeFileSync(source,original);}return null;});throw Error('caught source failure did not poison');
 }
 else if(input.operation!=='compile')throw TypeError('unknown receiving operation');
 if(input.verify){const candidate=result.checkedChangedProject??result;await verifyCrossModuleHelperTargets(candidate,api=>{for(const check of input.verify){if(check.kind==='nominal'){const values=Object.freeze(check.tags.map(tag=>Object.freeze({$:tag}))),actual=api[check.name](values);assert.deepEqual(actual,check.tags.map(tag=>({$:tag})));assert.notEqual(actual,values);assert.equal(Object.isFrozen(actual),true);}else assert.equal(api[check.name](),check.kind==='u64'?BigInt(check.value):check.value);}},{record:record=>reports.push(record)});}
 writeResult({ok:true,result,reports});
}catch(error){writeResult({ok:false,error:{name:error.name,message:error.message}});}
`);
  if(written>LIMIT-16777216)fail('reserve complete bounded child result before execution');report.writtenSourceBytes=written;
  const start=performance.now(),timeout=remaining(),child=spawnSync(process.execPath,[runner],{cwd:directory,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:directory},encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout,maxBuffer:RAW});
  Object.assign(report,{timeoutMs:timeout,elapsedMs:performance.now()-start,status:child.status,signal:child.signal,stdout:String(child.stdout??''),stderr:String(child.stderr??''),rawComplete:!child.error&&!child.signal,failureCode:child.error?.code??null});
  if(child.error||child.signal||child.status!==0)fail('isolated actual compiler receiving child failed');remaining();
  const resultPath=join(directory,'result.json'),resultInfo=lstatSync(resultPath);if(!resultInfo.isFile()||resultInfo.isSymbolicLink()||resultInfo.size>16777216)fail('bounded complete profile output DATA required');const result=JSON.parse(bytesAt(resultPath,16777216).toString('utf8'));return {result,report};
 },[close]);}catch(error){primaryFailed=true;throw error;}
 finally{report.cleanupAttempted=true;try{if(directory!==null)rmSync(directory,{recursive:true,force:true});report.cleanupSucceeded=true;}catch(error){report.cleanupFailure={name:error.name,message:error.message};if(!primaryFailed){primaryFailed=true;throw error;}}report.totalElapsedMs=performance.now()-startedAt;try{t?.diagnostic?.(JSON.stringify(report));}catch(error){report.diagnosticFailure=true;}if(!primaryFailed&&report.totalElapsedMs>CASE)fail('original complete case deadline exceeded during closing/cleanup');}
}
