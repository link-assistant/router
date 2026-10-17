// A fresh Bun process runs each complete discovered forward test file.
// This changes process lifetime only; Bun's case deadlines remain unchanged.
import {readdir,lstat,stat,access,realpath,mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync,createReadStream,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {resolve,relative,join,dirname,delimiter} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const directories=Object.freeze(['tools/translation/test','tools/translation/serialization-schema']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fileDigest(path){const digest=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(path)){bytes+=chunk.length;digest.update(chunk);}return {bytes,sha256:digest.digest('hex')};}
const leaf=fileURLToPath(new URL('./bun-file-resource.py',import.meta.url));
const excluded=path=>['tools/translation/meta/','tools/translation/projects/','tools/translation/generated/','tools/translation/js-to-rust/generated/'].some(prefix=>path.startsWith(prefix));
export async function discoverForwardBunFiles(root){
 const files=[];
 for(const directory of directories){
  const base=join(root,directory),stat=await lstat(base);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Forward test directory must be an original directory: '+directory);
  for(const entry of await readdir(base,{withFileTypes:true}))if(entry.name.endsWith('.test.mjs')){if(!entry.isFile()||entry.isSymbolicLink())throw Error('Forward test must be an original file: '+entry.name);files.push(directory+'/'+entry.name);}
 }
 if(!files.length)throw Error('No mandatory forward Bun test files discovered');return files.sort();
}
async function filesystemInputs(root,output){
 const paths=[];
 async function visit(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(path===output||['node_modules','.git'].includes(entry.name))continue;if(entry.isSymbolicLink())throw Error('Input symlink is unsupported: '+path);if(entry.isDirectory())await visit(path);else if(entry.isFile())paths.push(relative(root,path));}}
 await visit(root);return paths.sort();
}
async function inputVector(root,output){
 const headResult=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}),head=headResult.status===0?headResult.stdout.trim():null;
 let paths;
 if(head){const listed=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','*.rs','Cargo.toml','Cargo.lock','**/Cargo.toml','**/Cargo.lock','packages/javascript/package.json','packages/javascript/package-lock.json','tools/translation','scripts'],{cwd:root,encoding:'utf8'});if(listed.status!==0)throw Error('Tracked input inventory failed');paths=listed.stdout.split('\0').filter(path=>path&&!excluded(path)).sort();}
 else paths=await filesystemInputs(root,output);
 const missing=paths.filter(path=>!existsSync(join(root,path))),blobs=new Map();
 if(missing.length){
  const batch=spawnSync('git',['cat-file','--batch'],{cwd:root,input:missing.map(path=>head+':'+path+'\n').join(''),maxBuffer:256*1024*1024});if(batch.status!==0)throw Error('Original missing tracked input read failed');let offset=0;
  for(const path of missing){const end=batch.stdout.indexOf(10,offset),header=batch.stdout.subarray(offset,end).toString('utf8').split(' '),length=Number(header[2]);if(end<0||header[1]!=='blob'||!Number.isSafeInteger(length)||length<0)throw Error('Invalid original tracked input: '+path);offset=end+1;blobs.set(path,batch.stdout.subarray(offset,offset+length));offset+=length;if(batch.stdout[offset++]!==10)throw Error('Invalid tracked input boundary');}
  if(offset!==batch.stdout.length)throw Error('Trailing tracked input bytes');
 }
 const files=[];
 for(const path of paths){const absolute=join(root,path);if(existsSync(absolute)&&!(await lstat(absolute)).isFile())throw Error('Input is not a regular original file: '+path);const blob=blobs.get(path);files.push({path,storage:blob?'original-HEAD-sparse-fallback':'worktree',...(blob?{bytes:blob.length,sha256:hash(blob)}:await fileDigest(absolute))});}
 return {head,kind:head?'complete Git-tracked compiler/original input vector':'complete synthetic fixture filesystem vector',files};
}
async function executableObservation(requested,root){
 const candidates=requested.includes('/')?[resolve(root,requested)]:(process.env.PATH??'').split(delimiter).map(directory=>resolve(root,directory,requested));
 for(const path of candidates){
  try{await access(path,constants.X_OK);if(!(await stat(path)).isFile())continue;const realPath=await realpath(path);return {requested,path,realPath};}catch{}
 }
 return {requested,path:null,realPath:null};
}
async function executionInputs(root,bun,python){
 const compiler=await executableObservation(process.env.ROUTER_TRANSLATION_TSC??'tsc',root);let compilerPackage=null;
 if(compiler.realPath){
  const path=resolve(dirname(compiler.realPath),'../package.json');
  try{if((await stat(path)).size<=1048576){const bytes=await readFile(path),data=JSON.parse(bytes.toString('utf8'));if(data.name==='typescript')compilerPackage={path,name:data.name,version:data.version,bytes:bytes.length,sha256:hash(bytes)};}}catch{}
 }
 return {pathSource:process.env.PATH??null,typescriptOverride:process.env.ROUTER_TRANSLATION_TSC??null,node:{executable:process.execPath,versions:process.versions},bun:await executableObservation(bun,root),python:await executableObservation(python,root),typescript:{...compiler,package:compilerPackage},versionObservation:'TypeScript package metadata; Python runtime and Bun raw header are in child receipts. No version subprocesses or compiler selection changes.'};
}
async function waitLeaf(command,args,cwd,control){
 return await new Promise((resolve_,reject)=>{const child=spawn(command,args,{cwd,stdio:['ignore','ignore','pipe']}),chunks=[];control.leaf=child;child.stderr.on('data',chunk=>chunks.push(chunk));child.once('error',reject);child.once('close',(code,signal)=>resolve_({code,signal,stderr:Buffer.concat(chunks).toString('utf8')}));});
}
export async function runBunForwardFiles({root,outputDirectory,bun='bun',python='python3',totalTimeoutMs=2400000}={}){
 root=resolve(root);outputDirectory=resolve(outputDirectory);if(!Number.isSafeInteger(totalTimeoutMs)||totalTimeoutMs<=0||totalTimeoutMs>2400000)throw Error('Global Bun forward budget must be a positive integer at most2400000ms');
 if(existsSync(outputDirectory))throw Error('Evidence output directory already exists');await mkdir(outputDirectory,{recursive:true});const started=performance.now();
 const control={interrupted:false,leaf:null},interrupt=()=>{control.interrupted=true;control.leaf?.kill('SIGTERM');};process.on('SIGTERM',interrupt);process.on('SIGINT',interrupt);
 try{
 const before=await inputVector(root,outputDirectory),executionBefore=await executionInputs(root,bun,python),files=await discoverForwardBunFiles(root),records=[],failures=[];
 await writeFile(join(outputDirectory,'execution-inputs-before.json'),JSON.stringify(executionBefore,null,2)+'\n');await writeFile(join(outputDirectory,'inputs-before.json'),JSON.stringify(before,null,2)+'\n');await writeFile(join(outputDirectory,'files.json'),JSON.stringify(files,null,2)+'\n');
 for(const[fileIndex,file]of files.entries()){
  const remainingMs=Math.floor(totalTimeoutMs-(performance.now()-started));
  if(remainingMs<=0||control.interrupted){const record={file,status:control.interrupted?'unrun-interrupted-failure':'unrun-global-cap-failure',mandatory:true};records.push(record);failures.push(record);continue;}
  const prefix=String(fileIndex).padStart(4,'0')+'-'+file.split('/').at(-1),stdout=join(outputDirectory,prefix+'.stdout.raw.log'),stderr=join(outputDirectory,prefix+'.stderr.raw.log'),resourceFile=join(outputDirectory,prefix+'.resource.json'),requestFile=join(outputDirectory,prefix+'.request.json'),command=[bun,'test','./'+file];
  await writeFile(requestFile,JSON.stringify({root,command,remainingMs,stdout,stderr,resourceFile,pidFile:join(outputDirectory,prefix+'.pid.json')},null,2)+'\n');
  let result;try{result=await waitLeaf(python,[leaf,requestFile],root,control);}catch(error){result={code:null,signal:null,stderr:error.message};}finally{control.leaf=null;}let resource=null;
  if(result.code===0&&existsSync(resourceFile))resource=JSON.parse(await readFile(resourceFile,'utf8'));
  const logs=[];for(const path of [stdout,stderr])if(existsSync(path)){logs.push({path:relative(outputDirectory,path),...await fileDigest(path)});}
  const record={file,command,status:resource&&!resource.timedOut&&resource.exitCode===0?'passed':'failed',mandatory:true,resource,measurementLeafExit:result.code,measurementLeafSignal:result.signal,measurementLeafError:result.stderr,logs};records.push(record);if(record.status!=='passed')failures.push(record);
  await writeFile(join(outputDirectory,'progress.json'),JSON.stringify({completed:records.length,mandatoryFiles:files.length,failures:failures.length,current:file},null,2)+'\n');
 }
 const discoveredAfter=await discoverForwardBunFiles(root),after=await inputVector(root,outputDirectory),executionAfter=await executionInputs(root,bun,python),executionInputsUnchanged=JSON.stringify(executionBefore)===JSON.stringify(executionAfter),inputsUnchanged=JSON.stringify(before)===JSON.stringify(after),newFiles=discoveredAfter.filter(file=>!files.includes(file)),removedFiles=files.filter(file=>!discoveredAfter.includes(file));
 for(const file of newFiles){const record={file,status:'unrun-new-mandatory-file-failure',mandatory:true};records.push(record);failures.push(record);}
 const report={schema:'complete-fresh-process-bun-forward-v1',root,globalCapMs:totalTimeoutMs,elapsedSeconds:(performance.now()-started)/1000,originalPerCaseDeadlinesUnchanged:true,wholeFileInvocations:true,allDiscoveredFilesExecuted:records.every(row=>row.resource&&!row.resource.timedOut),oneActiveBunTestProcess:records.every(row=>!row.resource||row.resource.processGroupCleanupSupported),discoveredFiles:files,discoveredAfter,records,inputsUnchanged,executionInputsUnchanged,newFiles,removedFiles,exitCode:failures.length||!inputsUnchanged||!executionInputsUnchanged||removedFiles.length?1:0,interrupted:control.interrupted,coordinatorMemoryIncludedInChildResources:false,nodeCoordinator:{versions:process.versions,method:'Node process.resourceUsage; separate from waited Bun resources',resourceUsage:process.resourceUsage()},runtimeParity:false,rustExecuted:false};
 await writeFile(join(outputDirectory,'execution-inputs-after.json'),JSON.stringify(executionAfter,null,2)+'\n');await writeFile(join(outputDirectory,'inputs-after.json'),JSON.stringify(after,null,2)+'\n');await writeFile(join(outputDirectory,'receipt.json'),JSON.stringify(report,null,2)+'\n');return report;
 }finally{process.removeListener('SIGTERM',interrupt);process.removeListener('SIGINT',interrupt);}
}
async function main(){const args=process.argv.slice(2);let root=fileURLToPath(new URL('../',import.meta.url)),outputDirectory,bun='bun';for(let index=0;index<args.length;index++){const flag=args[index],value=args[++index];if(flag==='--root')root=value;else if(flag==='--output')outputDirectory=value;else if(flag==='--bun')bun=value;else throw Error('Unknown runner option: '+flag);}if(!outputDirectory)throw Error('--output new evidence directory is required');const report=await runBunForwardFiles({root,outputDirectory,bun});console.log(JSON.stringify({exitCode:report.exitCode,mandatoryFiles:report.discoveredFiles.length,executedFiles:report.records.filter(row=>row.resource).length,elapsedSeconds:report.elapsedSeconds,inputsUnchanged:report.inputsUnchanged}));process.exitCode=report.exitCode;}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
