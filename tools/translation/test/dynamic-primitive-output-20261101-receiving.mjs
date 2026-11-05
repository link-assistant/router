// Isolated complete-source profile receiving harness SOURCE. All UNRUN.
// Subprocess exit discards the copied compiler's loader/private issuer graph.
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,opendirSync,lstatSync,readlinkSync,rmSync,openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {proposeDynamicOutputProfile} from '../dynamic-primitive-output-20261101-profile.mjs';
import {repositoryRustLayout} from '../repository-layout.mjs';
import {isCompilerSourceInputPath} from '../compiler-source-inputs.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),LIMIT=67108864,FILES=8192,RAW=8388608,CASE=60000,CHILD=20000;
const fail=message=>{throw new TypeError('Literal profile receiving: '+message);};
export function receiveDynamicPrimitiveOutputProfile(t,payload,{startedAt}={}){
 if(!Number.isFinite(startedAt)||startedAt>performance.now())fail('original case start required');
 const report={schema:'literal-arguments-core-isolated-profile-receipt-v1',caseDeadlineMs:CASE,childDeadlineMs:CHILD,engine:process.versions.bun?'Bun':'Node',engineVersion:process.versions.bun??process.version,stdout:'',stderr:'',rawComplete:true,cleanupAttempted:false,cleanupSucceeded:false,files:0,bytes:0,runtimeParity:false};
 let directory=null,primaryFailed=false,written=0,names=0;const sources=[],stamps=new Map(),parents=new Map();
 const remaining=()=>{const left=CASE-(performance.now()-startedAt);if(left<=0)fail('original whole case deadline exceeded');return Math.max(1,Math.floor(Math.min(CHILD,left)));};
 function physical(info,full=true){return Object.fromEntries((full?['dev','ino','mode','nlink','uid','gid','size','mtimeNs','ctimeNs']:['dev','ino','mode','uid','gid']).map(key=>{if(typeof info[key]!=='bigint')fail('complete native identity required');return [key,String(info[key])];}));}
 const equal=(left,right)=>Object.keys(left).length===Object.keys(right).length&&Object.keys(left).every(key=>left[key]===right[key]);
 function ancestors(path){let current=dirname(path);for(let depth=0;;depth++){if(depth>64||parents.size>=512&&!parents.has(current))fail('bounded receiving ancestor census');const info=lstatSync(current,{bigint:true});if(!info.isDirectory()&&!info.isSymbolicLink())fail('ordinary receiving ancestor required');const next={identity:physical(info,false),alias:info.isSymbolicLink()?readlinkSync(current):null},prior=parents.get(current);if(prior&&(!equal(prior.identity,next.identity)||prior.alias!==next.alias))fail('original receiving ancestor identity/alias changed');if(!prior)parents.set(current,next);const parent=dirname(current);if(parent===current)break;current=parent;}}
 function bytesAt(path,maximum){ancestors(path);const before=lstatSync(path,{bigint:true});if(!before.isFile()||before.isSymbolicLink()||before.size<0n||before.size>BigInt(maximum))fail('ordinary bounded compiler source closure required');const identity=physical(before);let record=stamps.get(path);if(record&&!equal(record.identity,identity))fail('original receiving source identity changed');if(!record){if(stamps.size>=FILES+128)fail('bounded receiving read census');record={path,limit:maximum,identity,bytes:null};stamps.set(path,record);}const descriptor=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0));let primaryReadFailed=false;try{const first=fstatSync(descriptor,{bigint:true});if(!first.isFile()||!equal(identity,physical(first)))fail('stable ordinary source required');const size=Number(first.size),bytes=Buffer.alloc(size+1);let at=0;while(at<bytes.length){const count=readSync(descriptor,bytes,at,bytes.length-at,at);if(!count)break;at+=count;}const last=fstatSync(descriptor,{bigint:true}),after=lstatSync(path,{bigint:true});if(at!==size||!after.isFile()||after.isSymbolicLink()||!equal(identity,physical(last))||!equal(identity,physical(after)))fail('source changed during bounded receiving read');ancestors(path);const value=bytes.subarray(0,at);if(record.bytes&&!record.bytes.equals(value))fail('original receiving source bytes changed');if(!record.bytes)record.bytes=value;return value;}catch(error){primaryReadFailed=true;throw error;}finally{try{closeSync(descriptor);}catch(error){if(!primaryReadFailed)throw error;}}}

 function boundedRead(path){const bytes=bytesAt(path,LIMIT-report.bytes);report.bytes+=bytes.length;if(++report.files>FILES||report.bytes>LIMIT)fail('complete compiler source closure bound');sources.push({path,bytes});return bytes;}
 const sourceSelected=path=>isCompilerSourceInputPath(path)||['extensions/','vendor/','js-to-rust/vendor/','source-profiles/'].some(prefix=>path.startsWith('tools/translation/'+prefix));
 function write(path,bytes){written+=Buffer.byteLength(bytes);if(written>LIMIT)fail('complete temporary source/output byte bound');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes);}
 function tree(from,to,depth=0,compiler=false){if(depth>64)fail('bounded source tree depth');const directory=opendirSync(from);let primaryDirectoryFailed=false;try{let entry;while((entry=directory.readSync())!==null){if(++names>FILES*2)fail('bounded complete source entry census');const name=entry.name;remaining();const source=join(from,name),target=join(to,name),logical=relative(root,source).split('\\').join('/'),info=lstatSync(source);if(info.isSymbolicLink())fail('compiler source symlink refused');if(info.isDirectory()){if(compiler){const subtree=['extensions/','vendor/','js-to-rust/vendor/','source-profiles/'].some(prefix=>(logical+'/').startsWith('tools/translation/'+prefix));if(!subtree&&logical.slice('tools/translation/'.length).split('/').some(part=>['test','fixtures','meta','projects','generated','node_modules','.git','source-profiles'].includes(part)||part.endsWith('-generated')))continue;}tree(source,target,depth+1,compiler);}else if(info.isFile()){if(compiler&&!sourceSelected(logical))continue;write(target,boundedRead(source));}else fail('ordinary compiler source closure required');}}catch(error){primaryDirectoryFailed=true;throw error;}finally{try{directory.closeSync();}catch(error){if(!primaryDirectoryFailed)throw error;}}}
 const close=()=>{let failed=false,first;for(const row of stamps.values())try{bytesAt(row.path,row.limit);}catch(error){if(!failed){failed=true;first=error;}}for(const [path,record]of parents)try{const info=lstatSync(path,{bigint:true});if(!info.isDirectory()&&!info.isSymbolicLink()||!equal(record.identity,physical(info,false))||record.alias!==(info.isSymbolicLink()?readlinkSync(path):null))fail('receiving original ancestor identity/alias changed');}catch(error){if(!failed){failed=true;first=error;}}if(failed)throw first;};
 try{return withCompleteSourceClosingFence(()=>{
  remaining();const proposal=proposeDynamicOutputProfile();directory=mkdtempSync(join(tmpdir(),'router-literal-core-profile-'));
  tree(join(root,'tools/translation'),join(directory,'tools/translation'),0,true);
  // Copy genuine installed TypeScript code/declarations, never install/fallback
  // or alias the old compiler's private issuer graph into the copied one.
  const require=createRequire(join(root,'js/package.json')),packagePath=require.resolve('typescript/package.json'),packageRoot=dirname(packagePath);
  const packageSource=JSON.parse(bytesAt(packagePath,1048576).toString('utf8')),lock=JSON.parse(bytesAt(join(root,'js/package-lock.json'),4194304).toString('utf8'));
  if(packageSource.version!=='5.9.3'||lock.packages?.['node_modules/typescript']?.version!=='5.9.3')fail('actual installed and lockfile TypeScript5.9.3 required');
  report.compilerPackageVersion=packageSource.version;report.lockfileVersion=lock.packages['node_modules/typescript'].version;
  tree(packageRoot,join(directory,'js/node_modules/typescript'));
  for(const path of ['js/package.json','js/package-lock.json'])write(join(directory,path),boundedRead(join(root,path)));
  for(const path of repositoryRustLayout(root).cargoInputs)write(join(directory,path),boundedRead(join(root,path)));
  for(const row of proposal.substitutions){const before=proposal.sources[row.physicalBeforeVersion],after=proposal.sources[row.afterVersion],original=join(root,row.path);if(!bytesAt(original,Buffer.byteLength(before)).equals(Buffer.from(before)))fail('exact original substitution predecessor changed');write(join(directory,row.path),after);}
  for(const row of proposal.additions)write(join(directory,row.path),proposal.sources[row.version]);
  for(const row of proposal.resources)write(join(directory,row.path),proposal.sources[row.version]);
  for(const name of ['dynamic-primitive-output-20261101-targets.mjs','text-artifact-loader.mjs'])write(join(directory,'tools/translation/test',name),boundedRead(join(root,'tools/translation/test',name)));
  write(join(directory,'request.json'),JSON.stringify(payload));
  const runner=join(directory,'run.mjs');write(runner,`import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {compileDynamicPrimitiveOutputProject,readDynamicPrimitiveOutputMeta,invertDynamicPrimitiveOutputTarget,invertDynamicOutputFormatTarget} from './tools/translation/dynamic-primitive-output-20261101-project.mjs';
import {withDynamicOutputInstalledSources} from './tools/translation/dynamic-primitive-output-20261101-profile.mjs';
import {verifyDynamicPrimitiveOutputTargets} from './tools/translation/test/dynamic-primitive-output-20261101-targets.mjs';
import {proposeDynamicPrimitiveOutputProductionAdoption} from './tools/translation/dynamic-primitive-output-20261101-production.mjs';
import {withDynamicPrimitiveOutput} from './tools/translation/dynamic-primitive-output-20261101.mjs';
import {withAggregateCopyCollectionOperation} from './tools/translation/aggregate-copy-collection-20261101-domain.mjs';
import {withNominalEditedOperation} from './tools/translation/nominal-edited-target-20261101-domain.mjs';
import {withLiteralArgumentsCore} from './tools/translation/literal-arguments-core-20261101.mjs';
import * as nominal from './tools/translation/nominal-copy-collection-20261101.mjs';
import * as actualProject from './tools/translation/project.mjs';
import {emitJavaScript} from './tools/translation/extensions/host-contracts.mjs';
import {parseProgram} from './tools/translation/semantic-meta.mjs';
import {loadDeriveDependencyProof} from './tools/translation/derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './tools/translation/json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from './tools/translation/cfg-profile.mjs';
import * as dynamic from './tools/translation/dynamic-primitive-output-20261101-runtime.mjs';
import * as persistent from './tools/translation/persistent-output-backend-20261101-runtime.mjs';
import * as provider from './tools/translation/persistent-output-backend-20261101-provider.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as output from './tools/translation/output-literal-core-20261101-runtime.mjs';
import * as literal from './tools/translation/literal-arguments-core-20261101-runtime.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './tools/translation/primitive-vector-iterator-bulk-20261101-accounting.mjs';
const input=JSON.parse(readFileSync(new URL('./request.json',import.meta.url),'utf8'));
const writeResult=value=>{accountData(value);const text=JSON.stringify(value);if(Buffer.byteLength(text)>16777216)throw new TypeError('complete receiving result bound');writeFileSync(new URL('./result.json',import.meta.url),text);};
try{
 let result=compileDynamicPrimitiveOutputProject(input.request),reports=[];
 if(input.operation==='meta'){const meta=structuredClone(result.meta);if(input.mutate)meta.entry+='stale';result=readDynamicPrimitiveOutputMeta(input.request,meta);}
 else if(input.operation==='inverse'||input.operation==='format-inverse'||input.operation==='scalar-inverse'){
  const key=input.language==='JavaScript'?'javascript':'typescript',before=input.operation==='scalar-inverse'?input.before:JSON.stringify(input.before),after=input.singleQuoted?String.fromCharCode(39)+input.after+String.fromCharCode(39):input.operation==='scalar-inverse'?input.after:JSON.stringify(input.after),source=result[key];assert.equal(source.split(before).length-1,1,'one actual unique emitted literal');result=(input.operation==='format-inverse'?invertDynamicOutputFormatTarget:invertDynamicPrimitiveOutputTarget)(input.request,{language:input.language,source:source.replace(before,after)});
 }
 else if(input.operation==='production'){result=proposeDynamicPrimitiveOutputProductionAdoption(input.productionRequest);}
 else if(input.operation==='runtime'){
  const run=(0,eval)(input.runtimeSource);await verifyDynamicPrimitiveOutputTargets(result,(api,_checked,_module,helpers)=>run({assert,api,output:helpers.output,literal:helpers.literal,persistent:helpers.persistent,dynamic:helpers.dynamic,provider,fs,path}),{record:record=>reports.push(record)});result={independentRuntimeCasesCompleted:true};
 }
 else if(input.operation==='custody-reentry'){
  const files=new Map(input.request.files.map(row=>[row.path,row.source])),dependencies={manifest:input.request.manifest,lock:input.request.lock},options={entry:input.request.entry,paths:[...files.keys()],readSource:path=>{if(!files.has(path))throw TypeError('missing original file');return files.get(path);},cargoManifest:input.request.manifest,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),compilationProfile:PRODUCTION_PROFILE};let first,secondRejected=false,emissionRejected=false,closed=false,nestedCalls=0;
  try{withDynamicOutputInstalledSources(()=>withAggregateCopyCollectionOperation(()=>withNominalEditedOperation(()=>withLiteralArgumentsCore(()=>nominal.withNominalCopyCollectionSourceReaders(()=>withDynamicPrimitiveOutput(()=>{
   first=actualProject.translateProject(options);assert.throws(()=>withDynamicPrimitiveOutput(()=>{nestedCalls++;}));assert.equal(nestedCalls,0);
   try{actualProject.translateProject({...options,readSource:path=>{const text=options.readSource(path);return path===options.entry?text.replace('COUNT=','OTHER='):text;}});}catch{secondRejected=true;}assert.equal(secondRejected,true);
   const transported=parseProgram(JSON.stringify(first.meta.targetSemanticProgram));assert.throws(()=>emitJavaScript(transported,{runtimeModule:'./runtime/effects.mjs'}),/invalidated|dynamic|source/i);emissionRejected=true;return first;
  }))))));}catch(error){closed=true;assert.match(error.message,/invalidated|context|source/i);}assert.equal(closed,true);assert.equal(emissionRejected,true);
  assert.throws(()=>emitJavaScript(parseProgram(JSON.stringify(first.meta.targetSemanticProgram)),{runtimeModule:'./runtime/effects.mjs'}),/dynamic|source/i);const fresh=compileDynamicPrimitiveOutputProject(input.request);assert.ok(fresh.meta.executable.length);result={secondOriginalProjectRefused:true,caughtFailureDidNotRecover:true,expiredTransportRefused:true,freshOperationReissued:true};
 }
 else if(input.operation==='primary-source-close'){
  const source=new URL('./tools/translation/project.mjs',import.meta.url),original=readFileSync(source);
  for(const primary of [undefined,null,false,0,'',Object.freeze(Error('frozen primary'))]){let caught=false;try{withDynamicOutputInstalledSources(()=>{writeFileSync(source,Buffer.concat([original,Buffer.from('\\n// closing failure')]));throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}finally{writeFileSync(source,original);}assert.equal(caught,true);}
  result={allExactPrimariesPreserved:true};
 }
 else if(input.operation==='source-poison'){
  const source=new URL('./tools/translation/project.mjs',import.meta.url),original=readFileSync(source);withDynamicOutputInstalledSources(()=>{writeFileSync(source,Buffer.concat([original,Buffer.from('\\n//source observer failure')]));try{try{withDynamicOutputInstalledSources(()=>null);}catch{}}finally{writeFileSync(source,original);}return null;});throw Error('caught source failure did not poison');
 }
 else if(input.operation!=='compile')throw TypeError('unknown receiving operation');
 if(input.verify){const candidate=result.checkedChangedProject??result;await verifyDynamicPrimitiveOutputTargets(candidate,(api,_result,_module,{output,persistent})=>{for(const check of input.verify){if(check.kind==='nominal'){const values=Object.freeze(check.tags.map(tag=>Object.freeze({$:tag})));assert.deepEqual(api[check.name](values).map(row=>row.$),check.expected);continue;}const memory=output.createMemoryOutputBackend(check.options??{captureActive:false,captureTerminal:false,operationActive:true,fileDiagnostics:null,transportError:false}),arguments_=(check.arguments??[]).map(value=>value&&typeof value==='object'&&value.kind==='fixed'?BigInt(value.value):value);if(check.failure){assert.throws(()=>output.withOutputLiteralBackend(memory.backend,()=>api[check.name](...arguments_)),new RegExp(check.failure));assert.equal(memory.snapshot().events.length,0);continue;}const value=output.withOutputLiteralBackend(memory.backend,()=>api[check.name](...arguments_));assert.equal(value,null);const actual=memory.snapshot();if(check.stdout!==undefined)assert.equal(actual.stdout,check.stdout);if(check.stderr!==undefined)assert.equal(actual.stderr,check.stderr);if(check.events!==undefined)assert.deepEqual(actual.events.map(row=>row.kind),check.events);}},{record:record=>reports.push(record)});}

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
