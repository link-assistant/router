// Isolated complete-source profile receiving harness SOURCE. All UNRUN. The complete copied receiving implementation preserves predecessor limits; only the profile and independent edited-target runner differ.
// Subprocess exit discards the copied compiler's loader/private issuer graph.
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,lstatSync,rmSync,openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {visitSourceProfileEquations} from '../source-profile-visitor-20261101.mjs';
import {accountPrimitiveVectorIteratorBulkData} from '../primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {isCompilerSourceInputPath} from '../compiler-source-inputs.mjs';
import {withCompleteSourceClosingFence} from '../complete-source-closing-fence.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),LIMIT=67108864,FILES=8192,RAW=8388608,CASE=60000,CHILD=20000;
const fail=message=>{throw new TypeError('Nominal profile receiving: '+message);};
export function streamedProfileReceivingReadSource(path,maximum){if(typeof path!=='string'||path.length>4096||path.includes(String.fromCharCode(0))||!Number.isSafeInteger(maximum)||maximum<0||maximum>LIMIT)fail('bounded ordinary source path/read maximum required');const before=lstatSync(path);if(!before.isFile()||before.isSymbolicLink()||before.size>maximum)fail('ordinary bounded compiler source closure required');if(!Number.isInteger(constants.O_NOFOLLOW)||!Number.isInteger(constants.O_NONBLOCK)||constants.O_NOFOLLOW<=0||constants.O_NONBLOCK<=0)fail('native no-follow/nonblocking reads required');const descriptor=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);let primaryFailed=false;try{const first=fstatSync(descriptor);if(!first.isFile()||first.dev!==before.dev||first.ino!==before.ino||first.size!==before.size||first.mtimeMs!==before.mtimeMs||first.ctimeMs!==before.ctimeMs)fail('stable ordinary compiler source required');const bytes=Buffer.alloc(first.size+1);let at=0;while(at<bytes.length){const count=readSync(descriptor,bytes,at,bytes.length-at,at);if(!count)break;at+=count;}const last=fstatSync(descriptor),after=lstatSync(path);if(at!==first.size||last.dev!==first.dev||last.ino!==first.ino||last.size!==first.size||last.mtimeMs!==first.mtimeMs||last.ctimeMs!==first.ctimeMs||!after.isFile()||after.isSymbolicLink()||after.dev!==last.dev||after.ino!==last.ino||after.size!==last.size||after.mtimeMs!==last.mtimeMs||after.ctimeMs!==last.ctimeMs)fail('complete compiler source changed during bounded read');return bytes.subarray(0,at);}catch(error){primaryFailed=true;throw error;}finally{try{closeSync(descriptor);}catch(error){if(!primaryFailed)throw error;}}}
export function receiveStreamedSourceProfile(t,payload,{startedAt}={}){
 if(!Number.isFinite(startedAt)||startedAt>performance.now())fail('original case start required');
 const report={schema:'streamed-source-profile-isolated-receipt-v1',caseDeadlineMs:CASE,childDeadlineMs:CHILD,engine:process.versions.bun?'Bun':'Node',engineVersion:process.versions.bun??process.version,stdout:'',stderr:'',rawComplete:true,cleanupAttempted:false,cleanupSucceeded:false,files:0,bytes:0,runtimeParity:false};
 let directory=null,primaryFailed=false,written=0;const sources=[],ancestors=new Map(),stampKeys=['dev','ino','size','mtimeMs','ctimeMs'];
 const stamp=info=>Object.fromEntries(stampKeys.map(key=>[key,info[key]]));
 const same=(left,right)=>stampKeys.every(key=>left[key]===right[key]);
 function parentFence(path){let current=dirname(path);for(let depth=0;depth<=64;depth++){const info=lstatSync(current);if(!info.isDirectory()||info.isSymbolicLink())fail('ordinary receiving source ancestors required');const prior=ancestors.get(current);if(prior&&!same(prior,info))fail('receiving source ancestor changed');if(!prior){if(ancestors.size>=FILES)fail('original receiving closure count bounds source ancestors');ancestors.set(current,stamp(info));}const parent=dirname(current);if(parent===current)return;current=parent;}fail('bounded receiving source ancestry required');}
 const remaining=()=>{const left=CASE-(performance.now()-startedAt);if(left<=0)fail('original whole case deadline exceeded');return Math.max(1,Math.floor(Math.min(CHILD,left)));};
 const bytesAt=streamedProfileReceivingReadSource;
 function boundedRead(path){parentFence(path);const before=lstatSync(path),bytes=bytesAt(path,LIMIT-report.bytes),after=lstatSync(path);if(!same(before,after))fail('receiving initial source identity/time changed');report.bytes+=bytes.length;if(++report.files>FILES||report.bytes>LIMIT)fail('complete compiler source closure bound');sources.push({path,bytes,stamp:stamp(before)});return bytes;}
 const sourceSelected=path=>isCompilerSourceInputPath(path)||['extensions/','vendor/','js-to-rust/vendor/','source-profiles/'].some(prefix=>path.startsWith('tools/translation/'+prefix));
 function write(path,bytes){written+=Buffer.byteLength(bytes);if(written>LIMIT)fail('complete temporary source/output byte bound');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes);}
 function tree(from,to,depth=0,compiler=false){if(depth>64)fail('bounded source tree depth');for(const name of readdirSync(from)){remaining();const source=join(from,name),target=to===null?null:join(to,name),logical=relative(root,source).split('\\').join('/'),info=lstatSync(source);if(info.isSymbolicLink())fail('compiler source symlink refused');if(info.isDirectory()){if(compiler){const subtree=['extensions/','vendor/','js-to-rust/vendor/','source-profiles/'].some(prefix=>(logical+'/').startsWith('tools/translation/'+prefix));if(!subtree&&logical.slice('tools/translation/'.length).split('/').some(part=>['test','fixtures','meta','projects','generated','node_modules','.git','source-profiles'].includes(part)||part.endsWith('-generated')))continue;}tree(source,target,depth+1,compiler);}else if(info.isFile()){if(compiler&&!sourceSelected(logical))continue;const bytes=boundedRead(source);if(target!==null)write(target,bytes);}else fail('ordinary compiler source closure required');}}
 const close=()=>{let failed=false,first;for(const row of sources)try{if(!same(row.stamp,lstatSync(row.path))||!bytesAt(row.path,row.bytes.length).equals(row.bytes)||!same(row.stamp,lstatSync(row.path)))fail('complete compiler source changed during receiving: '+relative(root,row.path));}catch(error){if(!failed){failed=true;first=error;}}for(const [path,prior]of ancestors)try{const now=lstatSync(path);if(!now.isDirectory()||now.isSymbolicLink()||!same(prior,now))fail('complete receiving source ancestor changed');}catch(error){if(!failed){failed=true;first=error;}}if(failed)throw first;};
 try{return withCompleteSourceClosingFence(()=>{
  remaining();let received=0;const receipts=[];const proposal=visitSourceProfileEquations(event=>{
   remaining();const history=event.history;if(event.index!==received||history.inverse!==history.before||transportConcreteSyntaxMeta(history.beforeMeta).source!==history.before||transportConcreteSyntaxMeta(history.afterMeta).source!==history.after||history.trace.length!==2||history.trace[0].phase!=='language'||history.trace[1].phase!=='repository')fail('complete full streamed equation/CST/trace was not consumed');if(receipts.length>=128)fail('original bounded profile chronology required');receipts.push({index:event.index,path:event.path,language:event.language,layer:event.layer,beforeVersion:event.beforeVersion,afterVersion:event.afterVersion,inverseVersion:event.inverseVersion});accountPrimitiveVectorIteratorBulkData(receipts);received++;return {index:event.index,complete:true};
  });if(received!==proposal.equationsVisited||!proposal.allFullEquationsDelivered||proposal.fullCstRetained!==false)fail('complete source stream delivery/closing required before materialization');accountPrimitiveVectorIteratorBulkData({proposal,receipts});for(const [index,row]of receipts.entries()){const chronology=proposal.chronology[index];for(const key of Object.keys(row))if(chronology[key]!==row[key])fail('complete consumed chronology differs');for(const name of ['beforeVersion','afterVersion','inverseVersion']){const image=proposal.versions[row[name]];if(!image||image.path!==row.path||image.language!==row.language)fail('complete consumed source version join differs');}}report.fullEquationsConsumed=received;report.completeSourceVersions=proposal.versions.length;directory=mkdtempSync(join(tmpdir(),'router-streamed-source-profile-'));
  tree(join(root,'tools/translation'),join(directory,'tools/translation'),0,true);
  // Complete genuine installed TypeScript package is a declared read-only
  // dependency. A fresh child loads its own CJS/runtime graph; parent compiler
  // issuer objects never cross this boundary. Retain/close every package byte.
  const require=createRequire(join(root,'js/package.json')),packagePath=require.resolve('typescript/package.json'),packageRoot=dirname(packagePath);
  const packageSource=JSON.parse(bytesAt(packagePath,1048576).toString('utf8')),lock=JSON.parse(bytesAt(join(root,'js/package-lock.json'),4194304).toString('utf8'));
  if(packageSource.version!=='5.9.3'||lock.packages?.['node_modules/typescript']?.version!=='5.9.3')fail('actual installed and lockfile TypeScript5.9.3 required');
  report.compilerPackageVersion=packageSource.version;report.lockfileVersion=lock.packages['node_modules/typescript'].version;
  tree(packageRoot,null);report.readOnlyTypeScriptDependencyRoot=packageRoot;report.readOnlyTypeScriptSourceRoot=root;report.typeScriptPackageCopied=false;
  for(const path of ['js/package.json','js/package-lock.json'])write(join(directory,path),boundedRead(join(root,path)));
  for(const row of proposal.substitutions){const before=proposal.versions[row.beforeVersion],after=proposal.versions[row.afterVersion];if(before.path!==row.path||after.path!==row.path||before.language!==row.language||after.language!==row.language)fail('complete source image chronology join differs');const original=join(root,row.path);if(!bytesAt(original,Buffer.byteLength(before.source)).equals(Buffer.from(before.source)))fail('exact original substitution predecessor changed');write(join(directory,row.path),after.source);}
  for(const row of proposal.additions){const image=proposal.versions[row.version];if(image.path!==row.path||image.language!==row.language)fail('complete prerequisite image join differs');write(join(directory,row.path),image.source);}
  write(join(directory,'request.json'),JSON.stringify(payload));
  const runner=join(directory,'run.mjs');write(runner,`import {readFileSync,writeFileSync} from 'node:fs';
import {prepareNominalEditedTarget,translateEditedNominalTarget,readEditedNominalTargetMeta} from './tools/translation/nominal-edited-target-20261101.mjs';
const input=JSON.parse(readFileSync(new URL('./request.json',import.meta.url),'utf8'));
const writeResult=value=>{const text=JSON.stringify(value);if(Buffer.byteLength(text)>16777216)throw new TypeError('complete receiving result serialization bound');writeFileSync(new URL('./result.json',import.meta.url),text);};
try{
 const baseline=prepareNominalEditedTarget(input.request,input.qualifiedNames);let result;
 if(input.operation==='prepare')result=baseline;
 else{
  const language=input.language,original=language==='JavaScript'?baseline.javascript:baseline.typescript,plan=baseline.plans[0],marker='function '+plan.target+'(',start=original.indexOf(marker),end=original.indexOf('\\n}',start)+2;
  if(start<0||end<start)throw new TypeError('independent complete emitted function boundary missing');
  const before=original.slice(start,end);let body=before;
  if(input.kind==='constant')body=body.replace("Object.freeze({ $: 'Native' })","Object.freeze({ $: 'Denied' })");
  else if(input.kind==='predicate')body=body.replace('return true;','return false;');
  else throw new TypeError('independent edited value selection missing');
  if(before===body)throw new TypeError('independent semantic target leaf did not change');
  let source=original.slice(0,start)+body+original.slice(end);
  if(input.mutate==='extra-source')source+='\\n//stale';
  if(input.mutate==='foreign-variant')source=source.replace("Object.freeze({ $: 'Denied' })","Object.freeze({ $: 'Foreign' })");
  if(input.mutate==='capture')source=source.replace("Object.freeze({ $: 'Denied' })",'captured');
  if(input.mutate==='extra-field')source=source.replace("Object.freeze({ $: 'Denied' })","Object.freeze({ $: 'Denied', forged: true })");
  if(input.mutate==='freeze-call')source=source.replace("Object.freeze({ $: 'Denied' })","globalThis.freeze({ $: 'Denied' })");
  if(input.mutate==='switch-tag')source=source.replace("case 'Native':", "case 'Denied':");
  if(input.mutate==='noncanonical')source=source.replace("$: 'Denied'", '$: "Denied"');
  const configuration={source,sourcePath:input.request.entry.slice(0,-3)+(language==='JavaScript'?'.mjs':'.mts'),language,qualifiedNames:input.qualifiedNames};
  result=translateEditedNominalTarget(input.request,configuration);
  if(input.operation==='meta'){const meta=structuredClone(result.afterMeta);if(input.mutate==='stale-meta')meta.entry+='stale';result=readEditedNominalTargetMeta(input.request,configuration,meta);}
 }
 writeResult({ok:true,result});
}catch(error){writeResult({ok:false,error:{name:error.name,message:error.message}});}
`);
  if(written>LIMIT-16777216)fail('reserve complete bounded child result before execution');report.writtenSourceBytes=written;
  const start=performance.now(),timeout=remaining(),child=spawnSync(process.execPath,[runner],{cwd:directory,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:root},encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout,maxBuffer:RAW});
  Object.assign(report,{timeoutMs:timeout,elapsedMs:performance.now()-start,status:child.status,signal:child.signal,stdout:String(child.stdout??''),stderr:String(child.stderr??''),rawComplete:!child.error&&!child.signal,failureCode:child.error?.code??null});
  if(child.error||child.signal||child.status!==0)fail('isolated actual compiler receiving child failed');remaining();
  const resultPath=join(directory,'result.json'),resultInfo=lstatSync(resultPath);if(!resultInfo.isFile()||resultInfo.isSymbolicLink()||resultInfo.size>16777216)fail('bounded complete profile output DATA required');const result=JSON.parse(bytesAt(resultPath,16777216).toString('utf8'));return {result,report};
 },[close]);}catch(error){primaryFailed=true;throw error;}
 finally{report.cleanupAttempted=true;try{if(directory!==null)rmSync(directory,{recursive:true,force:true});report.cleanupSucceeded=true;}catch(error){report.cleanupFailure={name:error.name,message:error.message};if(!primaryFailed){primaryFailed=true;throw error;}}report.totalElapsedMs=performance.now()-startedAt;try{t?.diagnostic?.(JSON.stringify(report));}catch(error){report.diagnosticFailure=true;}if(!primaryFailed&&report.totalElapsedMs>CASE)fail('original complete case deadline exceeded during closing/cleanup');}
}
