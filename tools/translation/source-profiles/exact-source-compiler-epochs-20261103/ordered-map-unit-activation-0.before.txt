// Fixed fresh compiler source cohort. SOURCE DRAFT / UNRUN.
// No parser/type/body receipt crosses into the fresh child process.
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {produceOrderedTextMapCallerSources} from './ordered-text-map-callers-20261102-producer.mjs';
import {proposeOrderedTextMapCanonicalSourceSuccessors} from './ordered-text-map-canonical-20261102-profile.mjs';
import {ORDERED_MAP_FULL_SOURCE_TRANSFER_LIMITS as LIMITS} from './ordered-text-map-callers-20261102-full-materialization.mjs';
import {compactSparsePhysicalCensus,readCompactSparsePhysicalFile,sameCompactPhysicalSourceStamp,compactSparseGit,releaseCompactSparsePhysicalCensus} from './compact-sparse-git-io-20261102.mjs';
import {requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withProtectedNativeWriter,allowProtectedNativeContainedDirectWrites,mutateProtectedNativeContainedDirectWriter} from './protected-native-writers-20261102.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url)),LIVE=new WeakMap();
const CANONICAL_PARENTS=Object.freeze([
 'tools/translation/js-to-rust/owned-core-source.mjs',
 'tools/translation/js-to-rust/owned-core-operations.mjs',
 'tools/translation/js-to-rust/owned-core-corpus.mjs',
]);
const MODULES=new Set(['scripts/regenerate-js-first.mjs','tools/translation/serialization-schema/native-descriptor.mjs','tools/translation/js-to-rust/native-typescript.mjs','tools/translation/serialization-schema/bulk.mjs']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw TypeError('Canonical map compiler cohort: '+message);};
function ordinary(root,name){
 if(typeof name!=='string'||!name||name.length>4096||/[\x00-\x1f\x7f\\:]/u.test(name)||name.startsWith('/')||name.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary complete compiler source path required');
 let parent=root;for(const part of name.split('/').slice(0,-1)){parent=join(parent,part);const stat=fs.lstatSync(parent);if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary compiler ancestor required');}
 const path=join(root,name),stat=fs.lstatSync(path,{bigint:true});
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>BigInt(LIMITS.fileBytes))fail('complete bounded compiler source required');
 return {path,stat};
}
function closingDiagnostic(){try{process.stderr.write('{"schema":"canonical-map-cohort-closing-20261102","closingFailed":true}\n');}catch{}}
function snapshot(root){
 const census=compactSparsePhysicalCensus(root,{maximum:LIMITS.aggregateBytes});
 return {census,digests:census.files.map(row=>hash(readCompactSparsePhysicalFile(row)))};
}
function verifySnapshot(frame){
 let failed=false,primary;const check=operation=>{try{operation();}catch(error){if(!failed){failed=true;primary=error;}}};
 for(let at=0;at<frame.census.files.length;at++)check(()=>{if(hash(readCompactSparsePhysicalFile(frame.census.files[at]))!==frame.digests[at])fail('complete compiler/package bytes changed');});
 for(const row of frame.census.directories)check(()=>{if(!sameCompactPhysicalSourceStamp(row.stat,fs.lstatSync(row.path,{bigint:true})))fail('compiler/package directory epoch changed');});
 check(()=>{const next=compactSparsePhysicalCensus(frame.census.root,{maximum:LIMITS.aggregateBytes});try{
  if(JSON.stringify(next.files.map(row=>row.name))!==JSON.stringify(frame.census.files.map(row=>row.name))||JSON.stringify(next.directories.map(row=>row.name))!==JSON.stringify(frame.census.directories.map(row=>row.name)))fail('complete compiler/package census changed');
 }finally{releaseCompactSparsePhysicalCensus(next);}});
 if(failed)throw primary;
}
function live(token){const state=LIVE.get(token);if(!state||state.closed)fail('expired operational cohort');if(state.failed)throw state.primary;return state;}
export function verifyCanonicalMapCompilerCohort(token){
 const state=live(token);try{verifySnapshot(state.snapshot);}catch(error){state.failed=true;state.primary=error;throw error;}
}
export function canonicalMapCompilerStep(token,step){
 const state=live(token);try{verifyCanonicalMapCompilerCohort(token);
 // Retain exactly the original argument vector except the fixed implementation
 // entry/module URL. Source/output roots, flags and workload remain unchanged.
 if(!step||!Array.isArray(step.args)||!step.args.every(value=>typeof value==='string'))fail('actual original producer command required');
 const args=step.args.slice(),prefix=state.sourceRoot.endsWith('/')?state.sourceRoot:state.sourceRoot+'/';
 const compiled=state.root.endsWith('/')?state.root:state.root+'/';
 if(args[0]===prefix+'scripts/translate-router-flat-native-owned-field-meta.mjs')args[0]=compiled+'scripts/translate-router-flat-native-owned-field-meta.mjs';
 else if(args[0]==='--input-type=module'&&args[1]==='--eval'){
  const originalURL=pathToFileURL(prefix).href,compiledURL=pathToFileURL(compiled).href;
  // The existing producer helper quotes a complete file URL, not a prefix.
  const match=/^import \* as producer from ("(?:[^"\\]|\\.)*");/u.exec(args[2]??'');
  if(!match)fail('original fixed producer import form required');const url=JSON.parse(match[1]);
  if(!url.startsWith(originalURL)||!MODULES.has(url.slice(originalURL.length)))fail('producer implementation is outside fixed canonical cohort');
  const replacement=compiledURL+url.slice(originalURL.length);
  args[2]='import * as producer from '+JSON.stringify(replacement)+';'+args[2].slice(match[0].length);
 }else fail('fixed canonical CLI or producer module form required');
 return {...step,args};
 }catch(error){if(!state.failed){state.failed=true;state.primary=error;}throw error;}
}
export function withCanonicalMapCompilerCohort({sourceRoot=ROOT,deadline}={},operation){
 requireSynchronousSourceCallback(operation);
 sourceRoot=fs.realpathSync(resolve(sourceRoot));
 if(!Number.isFinite(deadline)||deadline<=performance.now())fail('original finite producer deadline required');
 const tick=()=>{if(performance.now()>=deadline)fail('original producer deadline exhausted during compiler setup');};
 const parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-canonical-map-')));
 let state,token,failed=false,primary,result,clean=false;
 try{
  tick();const canonical=proposeOrderedTextMapCanonicalSourceSuccessors();tick();
  if(!canonical||!Array.isArray(canonical.files)||canonical.files.length!==CANONICAL_PARENTS.length||new Set(canonical.files.map(row=>row.path)).size!==CANONICAL_PARENTS.length||canonical.files.some(row=>!CANONICAL_PARENTS.includes(row.path)||typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before))fail('complete three original canonical source equations required');
  let originalBefore=true,originalAfter=true;
  const originals=canonical.files.map(row=>{const physical=ordinary(sourceRoot,row.path),bytes=readCompactSparsePhysicalFile(physical);originalBefore&&=bytes.equals(Buffer.from(row.before));originalAfter&&=bytes.equals(Buffer.from(row.after));return {...physical,bytes};});
  if(!originalBefore&&!originalAfter)fail('actual canonical sources are mixed or outside complete original equations');
  const receipt=produceOrderedTextMapCallerSources({sourceRoot,destination:join(parent,'package')});tick();
  const root=receipt.destination;
  withProtectedNativeWriter(root,()=>{
   const targets=canonical.files.map(row=>ordinary(root,row.path).path);
   for(let at=0;at<targets.length;at++)if(!fs.readFileSync(targets[at]).equals(originals[at].bytes))fail('complete copied canonical source differs');
   const changes=targets.filter((target,at)=>!originals[at].bytes.equals(Buffer.from(canonical.files[at].after)));
   allowProtectedNativeContainedDirectWrites(root,changes);
   for(let at=0;at<targets.length;at++){tick();if(originals[at].bytes.equals(Buffer.from(canonical.files[at].after)))continue;mutateProtectedNativeContainedDirectWriter(root,[targets[at]],captured=>fs.writeFileSync(captured[0].canonicalTarget,canonical.files[at].after));}
  });
  const index=[];for(const row of canonical.files){tick();const actual=ordinary(root,row.path),bytes=readCompactSparsePhysicalFile(actual);if(bytes.toString('utf8')!==row.after)fail('installed canonical source readback differs');const oid=compactSparseGit(root,['hash-object','-w','--stdin-paths','--no-filters'],{input:row.path+'\n',maxBytes:1048576}).trim();index.push(String(Number(actual.stat.mode&0o111n)?100755:100644)+' '+oid+'\t'+row.path+'\0');}
  compactSparseGit(root,['update-index','-z','--index-info'],{input:index.join(''),maxBytes:1048576});
  for(const row of originals)if(!readCompactSparsePhysicalFile(row).equals(row.bytes))fail('original canonical source changed during compiler setup');
  tick();state={root,sourceRoot,snapshot:snapshot(parent),closed:false,failed:false,primary:undefined};token=Object.freeze({});LIVE.set(token,state);
  tick();result=operation(token,{root,sourceRoot,setupDeadline:deadline,sourceAuthority:false,semanticAuthority:false,runtimeParity:false});
  if(types.isPromise(result)||types.isProxy(result)||result!==null&&['object','function'].includes(typeof result)&&Reflect.has(result,'then'))fail('operational cohort callback must complete synchronously');
 }catch(error){failed=true;primary=error;}
 // Always attempt all physical closers before deleting our known source copy.
 if(state){if(state.failed&&!failed){failed=true;primary=state.primary;}
  try{verifySnapshot(state.snapshot);clean=true;}catch(error){if(!failed){failed=true;primary=error;}else closingDiagnostic();}
  state.closed=true;LIVE.delete(token);releaseCompactSparsePhysicalCensus(state.snapshot.census);state.snapshot.digests.length=0;
 }
 if(clean)try{fs.rmSync(parent,{recursive:true});}catch(error){if(!failed){failed=true;primary=error;}else closingDiagnostic();}
 else try{if(fs.readdirSync(parent).length===0)fs.rmdirSync(parent);else process.stderr.write(JSON.stringify({schema:'canonical-map-cohort-retained-20261102',directory:parent,incomplete:true})+'\n');}catch{}
 if(failed)throw primary;return result;
}
