// Independent actual-target receiving SOURCE. Never a source/type issuer.
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Constant-index corpus target receiving: '+message);};
// write is the actual receiving tree's bounded writer; outputs remain inside
// that tree and count toward its unchanged64MiB cap. No extra temp tree or
// package installation is made. The parent owns the original20s child timeout.
export async function verifyConstantIndexCorpusTargets(result,{directory,dependencyRoot,write,checks,record,remaining}){
 account(checks);const require=createRequire(join(dependencyRoot,'js/package.json')),tsc=require.resolve('typescript/bin/tsc'),ts=require('typescript'),startedAt=performance.now(),timeout=()=>Math.max(1,Math.floor(Math.min(20000,remaining(),20000-(performance.now()-startedAt))));if(ts.version!=='5.9.3')fail('actual pinned TypeScript library required');
 const command=args=>{if(performance.now()-startedAt>=20000)fail('original child target deadline');const options={encoding:'utf8',timeout:timeout(),maxBuffer:8388608,stdio:['ignore','pipe','pipe']};try{const stdout=execFileSync(process.execPath,[tsc,...args],options);record({stage:'typescript-command',args,stdout,stderr:'',passed:true});return stdout;}catch(error){record({stage:'typescript-command',args,stdout:error?.stdout?.toString()??'',stderr:error?.stderr?.toString()??'',passed:false});throw error;}};
 const version=command(['--version']);if(version.trim()!=='Version 5.9.3')fail('actual pinned TypeScript5.9.3 required');record({stage:'compiler-version',version:'5.9.3',output:version});
 for(const row of result.phases){
  const prefix='targets/'+row.phase,entry=result.entry;if(typeof entry!=='string'||!entry.endsWith('.rs')||entry.startsWith('/')||entry.includes('\\')||entry.split('/').some(part=>!part||part==='.'||part==='..'))fail('actual complete original entry path required');
  const stem=entry.slice(0,-3);write(prefix+'/package.json','{"type":"module"}\n');const javascript=write(prefix+'/'+stem+'.mjs',row.javascript),typescript=write(prefix+'/'+stem+'.mts',row.typescript),compiled=join(directory,'received',prefix,'compiled');
  for(const asset of result.runtimeFiles)write(prefix+'/'+asset.path,asset.source);
  const args=['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',join(directory,'received',prefix),'--outDir',compiled,typescript],parsed=ts.parseCommandLine(args),host=ts.createCompilerHost(parsed.options);host.writeFile=(path,source)=>{remaining();const output=relative(compiled,path).split('\\').join('/');if(!output||output.startsWith('../')||output.startsWith('/')||output.includes(':'))fail('strict compiler output escaped actual receiving root');write(prefix+'/compiled/'+output,source);};
  const program=ts.createProgram(parsed.fileNames,parsed.options,host),before=ts.getPreEmitDiagnostics(program),emitted=program.emit(),diagnostics=[...parsed.errors,...before,...emitted.diagnostics],raw=ts.formatDiagnostics(diagnostics,{getCanonicalFileName:path=>path,getCurrentDirectory:()=>directory,getNewLine:()=> '\n'});if(raw.length>8388608||Buffer.byteLength(raw)>8388608)fail('original raw diagnostics bound');record({stage:'strict-typescript',version:ts.version,args,diagnostics:raw,emitSkipped:emitted.emitSkipped,passed:!emitted.emitSkipped&&!diagnostics.some(row=>row.category===ts.DiagnosticCategory.Error)});if(emitted.emitSkipped||diagnostics.some(row=>row.category===ts.DiagnosticCategory.Error))fail('strict whole emitted TypeScript refused');
  // Declarations remain paired with every actual runtime import; compiled JS
  // runs with separate module instances and the same complete runtime bytes.
  for(const asset of result.runtimeFiles)write(prefix+'/compiled/'+asset.path,asset.source);
  for(const [language,file,runtime]of [['JavaScript',javascript,join(directory,'received',prefix,'runtime')],['TypeScript',join(compiled,stem+'.mjs'),join(compiled,'runtime')]]){
   remaining();const module=await import(pathToFileURL(file).href),output=await import(pathToFileURL(join(runtime,'output-literal-core-20261101-runtime.mjs')).href);
   for(const check of checks){if(check.phase!==undefined&&check.phase!==row.phase)continue;const fn=module.translated?.[check.name];if(typeof fn!=='function')fail('requested actual original/adopted caller remains refused: '+check.name);const memory=output.createMemoryOutputBackend({captureActive:false,captureTerminal:false,operationActive:true,fileDiagnostics:null,transportError:false});
    const value=output.withOutputLiteralBackend(memory.backend,()=>fn(...(check.arguments??[])));if(Object.hasOwn(check,'value')&&value!==check.value)fail('independent emitted value differs');if(Object.hasOwn(check,'stdout')&&memory.snapshot().stdout!==check.stdout)fail('independent emitted output differs');record({stage:'actual-target-case',phase:row.phase,language,name:check.name,passed:true});
   }
  }
 }
 return Object.freeze({javascriptExecuted:true,strictTypeScriptExecuted:true,version:'5.9.3',runtimeParity:false,semanticAuthority:false});
}
