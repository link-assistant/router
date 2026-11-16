// Receiving execution harness SOURCE ONLY. All new execution remains UNRUN.
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync,lstatSync} from 'node:fs';
import {join,dirname,posix} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const CASE_MS=60000,CHILD_MS=20000,FILES=2048,SOURCE_BYTES=16777216,DISK_BYTES=67108864,RAW_BYTES=8388608;
const fail=message=>{throw new TypeError('Aggregate emitted target receiving: '+message);};
function safe(path){return typeof path==='string'&&path.length>0&&path.length<=4096&&!/[\\:\0\r\n]/u.test(path)&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');}
function artifactModule(proposal){
 if(!proposal||!Array.isArray(proposal.modules)||proposal.modules.length!==1)fail('one complete selected proposal module required');
 const row=proposal.modules[0],module=row.checked??row;
 if(!Array.isArray(module.artifacts))fail('complete canonical artifacts required');
 const select=language=>{const rows=module.artifacts.filter(row=>row.language===language);if(rows.length!==1||!safe(rows[0].path)||typeof rows[0].source!=='string')fail('one complete safe canonical '+language+' artifact required');return rows[0];};
 const javascript=select('JavaScript'),typescript=select('TypeScript');
 if(!javascript.path.endsWith('.mjs')||!typescript.path.endsWith('.mts'))fail('actual mjs/mts canonical pair required');
 return {javascript,typescript};
}
function closureRows(data,artifacts){
 if(!safe(data.runtimeRoot)||!safe(data.declarationRoot)||!Array.isArray(data.files)||data.files.length>FILES)fail('bounded complete receiving source closure required');
 const rows=[],seen=new Map();let bytes=0;
 for(const row of data.files){
  if(!safe(row.path)||typeof row.source!=='string')fail('complete safe receiving source row required');
  const key=row.path.toLowerCase();if(seen.has(key))fail('duplicate or case-colliding receiving path');seen.set(key,row.path);
  if(!/\.(?:mjs|mts|ts)$/u.test(row.path))continue;
  // Canonical targets replace only this pair inside the disposable test tree.
  const pairStem=artifacts.javascript.path.slice(0,-4),typedStem=artifacts.typescript.path.slice(0,-4);
  if([pairStem+'.mjs',typedStem+'.mts',typedStem+'.ts'].includes(row.path))continue;
  bytes+=Buffer.byteLength(row.source);if(bytes>SOURCE_BYTES)fail('complete receiving source byte bound');rows.push({path:row.path,source:row.source});
 }
 for(const artifact of Object.values(artifacts)){bytes+=Buffer.byteLength(artifact.source);if(bytes>SOURCE_BYTES)fail('complete receiving target/source byte bound');}
 if(!rows.some(row=>row.path===data.runtimeRoot+'/primitive-owned-vector-runtime.mjs'))fail('actual vector runtime closure missing');
 return {rows,bytes};
}
/**
 * Authored verifySource is an explicit independent test function expression.
 * It runs in fresh current-engine child processes against emitted JS and the
 * separately lockfile-strict-compiled TS. No interpreter result is its oracle.
 */
export async function verifyAggregateReceivingTargets(t,data,proposal,{verifySource,startedAt}={}){
 if(typeof verifySource!=='string'||Buffer.byteLength(verifySource)>262144||!Number.isFinite(startedAt)||startedAt>performance.now())fail('bounded independent verifier and original case start required');
 const artifacts=artifactModule(proposal),closure=closureRows(data,artifacts),report={schema:'scalar-emitted-target-receiving-evidence-v1',engine:process.versions.bun?'Bun':'Node',engineVersion:process.versions.bun??process.version,caseDeadlineMs:CASE_MS,childDeadlineMs:CHILD_MS,compilerVersion:null,compilerPackageVersion:null,lockfileVersion:null,commands:[],sourceBytes:closure.bytes,closureFiles:closure.rows.map(row=>({path:row.path,bytes:Buffer.byteLength(row.source),sha256:createHash('sha256').update(row.source).digest('hex')})),targets:[],cleanupAttempted:false,cleanupSucceeded:false,runtimeParity:false,wholeRouterSynchronization:false};
 const remaining=()=>{const value=CASE_MS-(performance.now()-startedAt);if(value<=0)fail('original complete case deadline exceeded');return Math.max(1,Math.floor(Math.min(CHILD_MS,value)));};
 let directory=null,primaryFailed=false,written=0;
 function write(base,path,text){if(!safe(path))fail('unsafe temporary receiving path');written+=Buffer.byteLength(text);if(written>DISK_BYTES)fail('complete authored receiving disk byte bound');const absolute=join(base,path);mkdirSync(dirname(absolute),{recursive:true});writeFileSync(absolute,text);return absolute;}
 function inspectDisk(path){let bytes=0,files=0;const visit=(directory,depth=0)=>{if(depth>64)fail('bounded receiving directory depth');for(const name of readdirSync(directory)){const child=join(directory,name),stat=lstatSync(child);if(stat.isSymbolicLink())fail('temporary receiving symlink refused');if(stat.isDirectory())visit(child,depth+1);else if(stat.isFile()){bytes+=stat.size;if(++files>FILES*4||bytes>DISK_BYTES)fail('complete receiving physical disk bound');}else fail('ordinary temporary receiving files required');}};visit(path);return {bytes,files};}
 function command(kind,executable,args,cwd){
  const timeout=remaining(),receipt={kind,executable,args:[...args],cwd,timeoutMs:timeout,elapsedMs:null,status:null,signal:null,stdout:'',stderr:'',rawComplete:true};report.commands.push(receipt);const start=performance.now();
  try{const child=spawnSync(executable,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout,maxBuffer:RAW_BYTES});receipt.stdout=String(child.stdout??'');receipt.stderr=String(child.stderr??'');receipt.status=child.status;receipt.signal=child.signal;receipt.rawComplete=!child.error&&!child.signal;receipt.failureCode=child.error?.code??null;if(child.error||child.signal||child.status!==0)throw new Error('Scalar receiving '+kind+' failed',{cause:child.error});}
  finally{receipt.elapsedMs=performance.now()-start;}
  if(receipt.elapsedMs>timeout)fail(kind+' completed beyond its original child deadline');remaining();return receipt.stdout;
 }
 try{
  remaining();directory=mkdtempSync(join(tmpdir(),'router-scalar-target-receiving-'));const jsRoot=join(directory,'javascript'),tsRoot=join(directory,'typescript'),compiled=join(directory,'compiled');
  for(const row of closure.rows){write(jsRoot,row.path,row.source);write(tsRoot,row.path,row.source);}
  const javascript=write(jsRoot,artifacts.javascript.path,artifacts.javascript.source),typescript=write(tsRoot,artifacts.typescript.path,artifacts.typescript.source);
  const require=createRequire(new URL('../../../js/package.json',import.meta.url)),packagePath=require.resolve('typescript/package.json'),compilerScript=require.resolve('typescript/bin/tsc');
  const compilerPackage=JSON.parse(readFileSync(packagePath,'utf8')),lock=JSON.parse(readFileSync(new URL('../../../js/package-lock.json',import.meta.url),'utf8'));
  report.compilerPackageVersion=compilerPackage.version;report.lockfileVersion=lock.packages?.['node_modules/typescript']?.version;
  if(report.compilerPackageVersion!=='5.9.3'||report.lockfileVersion!=='5.9.3')fail('installed and lockfile TypeScript5.9.3 required');
  const override=process.env.ROUTER_TRANSLATION_TSC,compiler=override??process.execPath,prefix=override===undefined?[compilerScript]:[];
  report.compilerPath=compiler;report.compilerScript=override===undefined?compilerScript:null;report.explicitCompilerOverride=override!==undefined;
  report.compilerVersion=command('typescript-version',compiler,[...prefix,'--version'],directory).trim();if(report.compilerVersion!=='Version 5.9.3')fail('actual TypeScript5.9.3 version output required');
  command('strict-typescript',compiler,[...prefix,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',tsRoot,'--outDir',compiled,typescript],directory);
  // Preserve every actual dependency path/import; do not symlink repository
  // modules or rewrite declarations/import specifiers to obtain compilation.
  for(const row of closure.rows)write(compiled,row.path,row.source);
  report.disk=inspectDisk(directory);
  const typedPath=join(compiled,artifacts.typescript.path.replace(/\.mts$/u,'.mjs'));
  const targets=[{kind:'emitted-javascript',path:javascript,root:jsRoot},{kind:'strict-compiled-typescript',path:typedPath,root:compiled}];
  for(const target of targets){
   const runtime=join(target.root,data.runtimeRoot,'primitive-owned-vector-runtime.mjs'),runner=write(directory,'run-'+target.kind+'.mjs',
    "import assert from 'node:assert/strict';\nimport {performance} from 'node:perf_hooks';\nconst target=await import("+JSON.stringify(pathToFileURL(target.path).href)+");\nconst core=await import("+JSON.stringify(pathToFileURL(runtime).href)+");\nconst output=await import("+JSON.stringify(pathToFileURL(join(target.root,data.runtimeRoot,'output-literal-core-20261101-runtime.mjs')).href)+");\nconst literal=await import("+JSON.stringify(pathToFileURL(join(target.root,data.runtimeRoot,'literal-arguments-core-20261101-runtime.mjs')).href)+");\nconst started=performance.now();\nawait ("+verifySource+")(target,core,{output,literal});\nconsole.log('SCALAR_TARGET_RECEIPT '+JSON.stringify({engine:process.versions.bun?'Bun':'Node',engineVersion:process.versions.bun??process.version,elapsedMs:performance.now()-started}));\n");
   const output=command(target.kind,process.execPath,[runner],directory),lines=output.trim().split('\n'),markers=lines.filter(line=>line.startsWith('SCALAR_TARGET_RECEIPT '));if(markers.length!==1)fail('complete actual target child receipt missing');
   report.targets.push({kind:target.kind,path:posix.relative(directory,target.path),...JSON.parse(markers[0].slice('SCALAR_TARGET_RECEIPT '.length))});
  }
  report.disk=inspectDisk(directory);report.elapsedMs=performance.now()-startedAt;remaining();return report;
 }catch(error){primaryFailed=true;throw error;}
 finally{
  report.cleanupAttempted=true;
  try{if(directory!==null)rmSync(directory,{recursive:true,force:true});report.cleanupSucceeded=true;}
  catch(error){report.cleanupFailure={name:error?.name??typeof error,message:error?.message??String(error)};if(!primaryFailed){primaryFailed=true;throw error;}}
  finally{report.elapsedMs=performance.now()-startedAt;try{t?.diagnostic?.(JSON.stringify(report));}catch{report.diagnosticFailure=true;}if(!primaryFailed&&report.elapsedMs>CASE_MS)throw new Error('Aggregate receiving cleanup exceeded the original complete case deadline');}
 }
}
