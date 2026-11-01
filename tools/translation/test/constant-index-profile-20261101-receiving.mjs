// Isolated complete-source profile receiving harness SOURCE. All UNRUN.
// Subprocess exit discards the copied compiler's loader/private issuer graph.
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,opendirSync,lstatSync,readlinkSync,rmSync,openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {proposeConstantIndexProfile} from '../constant-index-profile-20261101-profile.mjs';
import {forwardFailureField} from '../forward-output-ownership-20261101-failure.mjs';
import {repositoryRustLayout} from '../repository-layout.mjs';
import {isCompilerSourceInputPath} from '../compiler-source-inputs.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),LIMIT=67108864,FILES=8192,RAW=8388608,CASE=60000,CHILD=20000;
const fail=message=>{throw new TypeError('Literal profile receiving: '+message);};
export function receiveConstantIndexProfile(t,payload,{startedAt}={}){
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
  remaining();const proposal=proposeConstantIndexProfile();directory=mkdtempSync(join(tmpdir(),'router-literal-core-profile-'));
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
  for(const name of ['constant-index-profile-20261101-targets.mjs','text-artifact-loader.mjs'])write(join(directory,'tools/translation/test',name),boundedRead(join(root,'tools/translation/test',name)));
  for(const row of proposal.localCustody)write(join(directory,row.path),row.source);
  write(join(directory,'request.json'),JSON.stringify(payload));
  const runner=join(directory,'run.mjs');write(runner,`import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {compileConstantIndexProfileProject,readConstantIndexProfileMeta} from './tools/translation/constant-index-profile-20261101-project.mjs';
import {invertConstantIndexProfileTarget} from './tools/translation/constant-index-profile-20261101-inverse.mjs';
import {withConstantIndexProfileInstalledSources} from './tools/translation/constant-index-profile-20261101-profile.mjs';
import {createOriginalConstantIndexFormatKernel} from './tools/translation/constant-index-profile-20261101-kernel.mjs';
import * as Host from './tools/translation/extensions/host-contracts.mjs';
import {checkCollectedDeclarationTypes} from './tools/translation/extensions/declaration-refusals.mjs';
import {ownershipCompiler} from './tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {verifyConstantIndexProfileTargets} from './tools/translation/test/constant-index-profile-20261101-targets.mjs';
const input=JSON.parse(readFileSync(new URL('./request.json',import.meta.url),'utf8')),reports=[];
const writeResult=value=>writeFileSync(new URL('./result.json',import.meta.url),JSON.stringify(value));
function field(value,key){if(value===null||typeof value!=='object'||types.isProxy(value))return undefined;const descriptor=Object.getOwnPropertyDescriptor(value,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;}
try{
 let result=compileConstantIndexProfileProject(input.request);
 if(input.operation==='inverse-cell'||input.operation==='inverse-index'){
  const language=input.language,key=language==='TypeScript'?'typescript':'javascript';let source=result[key];
  if(input.operation==='inverse-cell'){const token=JSON.stringify(input.before);assert.ok(source.includes(token));source=source.replace(token,JSON.stringify(input.after));}
  else {const proof=result.constantIndexOrigins.cells.find(row=>row.literalIndex&&row.index===String(input.before));assert.ok(proof);const ts=ownershipCompiler(),file=ts.createSourceFile('edited.mts',source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS),matches=[];function visit(node,owner=null){if(ts.isFunctionDeclaration(node))owner=node.name?.text??null;if(owner===proof.ownerTargetFunction&&ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='ml_at'&&node.arguments.length===2){const found=[];function value(part){if(ts.isBigIntLiteral(part)&&BigInt(source.slice(part.getStart(file),part.end).slice(0,-1))===BigInt(input.before))found.push(part);ts.forEachChild(part,value);}value(node.arguments[1]);if(found.length===1)matches.push(found[0]);}ts.forEachChild(node,child=>visit(child,owner));}visit(file);assert.equal(matches.length,1);const node=matches[0];source=source.slice(0,node.getStart(file))+String(input.after)+'n'+source.slice(node.end);}
  if(input.extraTargetText)source+=input.extraTargetText;result=invertConstantIndexProfileTarget(input.request,{language,source});assert.equal(result[key],source);assert.ok(result.rustEdit.before!==result.rustEdit.after);
 }else if(input.operation==='meta-forgery'){const meta=structuredClone(result.meta);meta.sourceAuthority=true;assert.throws(()=>readConstantIndexProfileMeta(input.request,meta));result={forgeryRefused:true};}
 else if(input.operation==='sibling-kernel'){const sibling=createOriginalConstantIndexFormatKernel({originalProgram:Host.HostChecker.prototype.program,requireChecker:Host.requireOriginalPrimitiveTryFromChecker,collectProgram:checkCollectedDeclarationTypes}),surface=Host.parseRust('const CELLS:[&str;1]=["x"];pub fn header()->String{format!("{}",CELLS[0usize])}fn main(){}');assert.throws(()=>sibling.withOperation(()=>sibling.checkProgram(new Host.HostChecker(surface.language,surface.externals??[]),surface)),/mandatory actual Host early and late/);result={siblingRefused:true};}
 else if(input.operation==='caught-source'){const source=new URL('./tools/translation/constant-index-profile-20261101-domain.mjs',import.meta.url),before=readFileSync(source);withConstantIndexProfileInstalledSources(()=>{writeFileSync(source,Buffer.concat([before,Buffer.from('\\n// source failure')]));try{try{withConstantIndexProfileInstalledSources(()=>null);}catch{}}finally{writeFileSync(source,before);}});throw Error('caught restored source was accepted');}
 else if(input.operation!=='compile')throw TypeError('unknown receiving operation');
 if(input.verify){const candidate=result.checkedChangedProject??result;await verifyConstantIndexProfileTargets(candidate,(api,_value,_module,{output})=>{for(const check of input.verify){const memory=output.createMemoryOutputBackend({captureActive:false,captureTerminal:false,operationActive:true,fileDiagnostics:null,transportError:false}),arguments_=(check.arguments??[]).map(value=>value&&typeof value==='object'&&value.kind==='fixed'?BigInt(value.value):value);if(check.failure){assert.throws(()=>output.withOutputLiteralBackend(memory.backend,()=>api[check.name](...arguments_)),new RegExp(check.failure));if(Object.hasOwn(check,'stdout'))assert.equal(memory.snapshot().stdout,check.stdout);continue;}const value=output.withOutputLiteralBackend(memory.backend,()=>api[check.name](...arguments_));if(Object.hasOwn(check,'value'))assert.equal(value,check.value);if(Object.hasOwn(check,'stdout'))assert.equal(memory.snapshot().stdout,check.stdout);}},{record:row=>reports.push(row)});}
 writeResult({ok:true,result,reports});
}catch(error){writeResult({ok:false,error:{type:typeof error,isNull:error===null,primitive:error===null||!['object','function'].includes(typeof error)?error:undefined,name:field(error,'name'),message:field(error,'message')}});}
`);
  if(written>LIMIT-16777216)fail('reserve complete bounded child result before execution');report.writtenSourceBytes=written;
  const start=performance.now(),timeout=remaining(),child=spawnSync(process.execPath,[runner],{cwd:directory,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:directory},encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout,maxBuffer:RAW});
  Object.assign(report,{timeoutMs:timeout,elapsedMs:performance.now()-start,status:child.status,signal:child.signal,stdout:String(child.stdout??''),stderr:String(child.stderr??''),rawComplete:!child.error&&!child.signal,failureCode:child.error?.code??null});
  if(child.error||child.signal||child.status!==0)fail('isolated actual compiler receiving child failed');remaining();
  const resultPath=join(directory,'result.json'),resultInfo=lstatSync(resultPath);if(!resultInfo.isFile()||resultInfo.isSymbolicLink()||resultInfo.size>16777216)fail('bounded complete profile output DATA required');const result=JSON.parse(bytesAt(resultPath,16777216).toString('utf8'));return {result,report};
 },[close]);}catch(error){primaryFailed=true;throw error;}
 finally{report.cleanupAttempted=true;try{if(directory!==null)rmSync(directory,{recursive:true,force:true});report.cleanupSucceeded=true;}catch(error){report.cleanupFailure={name:forwardFailureField(error,'name'),message:forwardFailureField(error,'message')};if(!primaryFailed){primaryFailed=true;throw error;}}report.totalElapsedMs=performance.now()-startedAt;try{t?.diagnostic?.(JSON.stringify(report));}catch(error){report.diagnosticFailure=true;}if(!primaryFailed&&report.totalElapsedMs>CASE)fail('original complete case deadline exceeded during closing/cleanup');}
}
