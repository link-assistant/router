import {emitProtectedSourceDiagnostic,retainProtectedSourceDiagnostic} from './protected-source-diagnostics-20261103.mjs';
import {captureProtectedNativeTemporaryPrefix} from './protected-native-temporary-prefix-20261103.mjs';
import {captureAbsoluteNativeMutationTargets} from './protected-external-mutations-20261102-addresses.mjs';
import {captureContainedNativeDirectTargets} from './protected-contained-direct-20261102-paths.mjs';
// Source-unit synchronization with fresh Git baselines and complete proposals.
// No persisted source/hash/verdict cache supplies a translation decision.
import * as fs from 'node:fs';
import {assertProtectedMutationPaths,directMutationOutputPaths,assertProtectedDirectWriteTargets,assertProtectedStagedMutationTargets,assertProtectedNativeStagedMutationTargets,assertProtectedNativeDirectWriteTargets,assertProtectedNativeStreamWriteDescriptors} from './protected-preparer-writers-20261102-alias.mjs';
import {ownSourceFailureField} from './source-error-fields-20261102.mjs';import {captureReadonlySourceProfile} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {resolve,dirname,posix} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {translateSource} from './translate.mjs';
import {translatePortableRust,UnsupportedPortableRustSource} from './js-to-rust/portable-rust.mjs';
import {preservePairedTypeScriptAPI} from './js-to-rust/paired-typescript-api.mjs';
import {translateProject} from './project.mjs';
import {translateJavaScript} from './js-to-rust/translator.mjs';
import {translateTypeScript} from './js-to-rust/typed-portable.mjs';
import {translatePortableModuleProject} from './js-to-rust/module-project.mjs';
import {translateFilesystemEffectJavaScript,translateFilesystemEffectTypeScript} from './js-to-rust/filesystem-effects.mjs';
import {translateFilesystemControlJavaScript,translateFilesystemControlTypeScript} from './js-to-rust/filesystem-control.mjs';
import {translateFilesystemControlRust} from './js-to-rust/filesystem-control-rust.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {hostRuntimeAssets} from './host-assets.mjs';
import {effectRuntimeAssets} from './effect-assets.mjs';
import {ownedUnitProfile,runtimeAssetsForSourceUnit} from './owned-unit-profiles.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';

const SCHEMA='router-source-unit-sync-v1',LIMIT=64*1024*1024,FILE_LIMIT=8*1024*1024;
const languages=['Rust','JavaScript','TypeScript'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Source unit synchronization: '+message);};
function relative(value){if(typeof value!=='string'||!value||value.length>4096||value.startsWith('/')||value.includes('\\')||/[\0\r\n:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative path required');return value;}
function physical(root,name){relative(name);let parent=root;const parts=name.split('/');for(const part of parts.slice(0,-1)){parent=resolve(parent,part);try{const row=fs.lstatSync(parent);if(!row.isDirectory()||row.isSymbolicLink())fail('linked or non-directory source parent');}catch(error){if(ownSourceFailureField(error,'code')!=='ENOENT')throw error;}}return resolve(root,name);}
function source(root,name){
 relative(name);const stored=captureReadonlySourceProfile(resolve(root,name),{maximum:FILE_LIMIT,retainBytes:false});if(stored){const raw=stored.read(),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('source must retain exact UTF8 bytes');stored.requireCurrent();return text;}const full=physical(root,name);let row;try{row=fs.lstatSync(full);}catch(error){if(ownSourceFailureField(error,'code')==='ENOENT')return null;throw error;}
 if(!row.isFile()||row.isSymbolicLink()||row.size>FILE_LIMIT)fail('bounded ordinary source file required');const fd=fs.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let readFailed=false;
 try{const before=fs.fstatSync(fd),chunks=[];let total=0;for(;;){const bytes=Buffer.alloc(Math.min(65536,FILE_LIMIT-total+1)),count=fs.readSync(fd,bytes,0,bytes.length,null);if(!count)break;total+=count;if(total>FILE_LIMIT)fail('source grew beyond its byte bound');chunks.push(bytes.subarray(0,count));}const raw=Buffer.concat(chunks,total),after=fs.fstatSync(fd),named=fs.lstatSync(full);if(!before.isFile()||row.dev!==before.dev||row.ino!==before.ino||before.dev!==after.dev||before.ino!==after.ino||before.size!==raw.length||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||before.dev!==named.dev||before.ino!==named.ino||before.mode!==named.mode||after.size!==named.size||after.mtimeMs!==named.mtimeMs||after.ctimeMs!==named.ctimeMs)fail('complete source changed during capture');const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('source must retain exact UTF8 bytes');return text;}catch(error){readFailed=true;throw error;}finally{try{fs.closeSync(fd);}catch(error){if(!readFailed)throw error;}}
}
function gitEnvironment(){const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),empty=process.platform==='win32'?'NUL':'/dev/null';return {...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:empty,GIT_CONFIG_SYSTEM:empty};}
const gitExecutable=()=>process.platform==='win32'?'git':'/usr/bin/git';
function git(root,args){return execFileSync(gitExecutable(),['-C',root,...args],{env:gitEnvironment(),encoding:'utf8',timeout:30000,maxBuffer:FILE_LIMIT+1048576});}
function baselines(root,revision,names){
 const raw=execFileSync(gitExecutable(),['-C',root,'cat-file','--batch'],{env:gitEnvironment(),input:names.map(name=>revision+':'+name).join('\n')+'\n',timeout:30000,maxBuffer:LIMIT}),result=new Map();let at=0;
 for(const name of names){const end=raw.indexOf(10,at);if(end<at)fail('complete Git baseline frame required');const header=raw.subarray(at,end).toString('utf8');at=end+1;if(header===revision+':'+name+' missing'){result.set(name,null);continue;}const fields=header.split(' '),size=Number(fields[2]);if(fields.length!==3||!/^[a-f0-9]+$/u.test(fields[0])||fields[0].length!==revision.length||fields[1]!=='blob'||!Number.isSafeInteger(size)||size<0||size>FILE_LIMIT||at+size>=raw.length)fail('bounded exact Git baseline blob required');const bytes=raw.subarray(at,at+size);at+=size;if(raw[at++]!==10)fail('complete Git baseline terminator required');const text=bytes.toString('utf8');if(!Buffer.from(text).equals(bytes))fail('lossless Git baseline source required');result.set(name,text);}
 if(at!==raw.length)fail('extra Git baseline bytes');return result;
}
function descriptor(value){
 if(!value||value.schema!==SCHEMA||!Array.isArray(value.units)||!value.units.length||value.units.length>256)fail('bounded nonempty unit descriptor required');const ids=new Set(),paths=new Set();
 for(const unit of value.units){
  sourceUnitPrimitiveOperators(unit);
  if(!unit||typeof unit.id!=='string'||!/^[_a-zA-Z0-9-]{1,96}$/u.test(unit.id)||ids.has(unit.id)||!['portable','portable-project','filesystem','filesystem-control','owned-state','owned-outcome','owned-cancellation','async-control','http-resource'].includes(unit.profile)||!['auto',...languages].includes(unit.authority??'auto'))fail('unique source unit and known profile required');ids.add(unit.id);
  for(const language of languages){const name=relative(unit.paths?.[language]);if(paths.has(name))fail('source units cannot overlap');paths.add(name);if(!name.endsWith(language==='Rust'?'.rs':language==='TypeScript'?'.ts':'.mjs'))fail('language extension differs');}
  const owned=ownedUnitProfile(unit.profile);if(owned){
   if(!Array.isArray(unit.nativeSources)||unit.nativeSources.length<owned.nativeInputs.length||unit.nativeSources.length>32)fail('complete bounded actual native source mappings required');
   const logical=new Set(),physical=new Set();for(const row of unit.nativeSources){relative(row.path);relative(row.sourcePath);if(logical.has(row.path)||physical.has(row.sourcePath))fail('unique logical and physical native source mappings required');logical.add(row.path);physical.add(row.sourcePath);}
   if(owned.nativeInputs.some(path=>!logical.has(path)))fail('complete actual native boundary and Cargo mappings required');
  }else if(unit.nativeSources!==undefined)fail('native source mappings require an owned source profile');
  relative(unit.meta);for(const language of ['JavaScript','TypeScript'])relative(unit.runtimes?.[language]);
  for(const language of languages){const dependencies=unit.dependencies?.[language]??[];if(!Array.isArray(dependencies)||dependencies.length>127||new Set(dependencies).size!==dependencies.length)fail('bounded unique dependency paths required');for(const dependency of dependencies)relative(dependency);if(dependencies.length&&unit.profile!=='portable-project')fail('source dependency lists require the project profile');}
 }
 const owners=new Map(value.units.flatMap(unit=>languages.map(language=>[unit.paths[language],unit.id])));
 for(const unit of value.units){
  if(paths.has(unit.meta))fail('metadata cannot overwrite a source unit');paths.add(unit.meta);
  for(const language of languages)for(const dependency of unit.dependencies?.[language]??[]){const owner=owners.get(dependency);if(owner&&owner!==unit.id)fail('shared dependency state must stay in one source-unit scope');if(languages.some(key=>unit.paths[key]===dependency))fail('entry paths must not be repeated as dependencies');owners.set(dependency,unit.id);}
 }return value;
}
function choose(unit,current,previous,dependencyChanges=new Set()){
 const changed=languages.filter(language=>current[language]!==previous[language]||dependencyChanges.has(language));
 if(changed.length>1)fail('concurrent source edits require reconciliation in unit '+unit.id+': '+changed.join(', '));
 const selected=unit.authority??'auto';if(selected!=='auto'){if(changed.length&&changed[0]!==selected)fail('an edited non-authoritative source would be overwritten: '+unit.id);if(current[selected]===null)fail('authoritative source is missing');return selected;}
 if(changed.length===1){if(current[changed[0]]===null)fail('source deletion is not an implicit translation request');return changed[0];}
 const available=languages.filter(language=>current[language]!==null);if(available.length!==1)fail('unchanged multi-language unit needs an explicit authority: '+unit.id);return available[0];
}
function relocate(text,from,to,runtimeBefore,runtimeAfter,language,runtimeRoots){return relocateSourceUnitRuntimeTarget(text,from,to,runtimeBefore,runtimeAfter,language,runtimeRoots);}
function translate(unit,language,text,runtime,dependencies=[],ownedStateInputs=null){
 if(unit.profile==='filesystem-control'&&language==='Rust'){const result=translateFilesystemControlRust(text,{sourcePath:unit.paths.Rust,javascriptPath:unit.paths.JavaScript,runtimePath:unit.runtimes.JavaScript+'/effects.mjs',runtimeSource:runtime.javascript});return {Rust:text,JavaScript:result.javascript,TypeScript:result.typescript,meta:{semanticMeta:result.meta,filesystemRustSourceHistory:result.filesystemRustSourceHistory},generatedFrom:unit.paths.JavaScript,runtimeBefore:unit.runtimes.JavaScript};}
 const owned=ownedUnitProfile(unit.profile);if(owned){if(!ownedStateInputs)fail('complete actual owned unit inputs required');return owned.translate(ownedStateInputs);}
 if(language==='Rust'){
  if(unit.profile==='portable-project'){
   const sources=new Map([{path:unit.paths.Rust,source:text},...dependencies].map(row=>[row.path,row.source])),result=translateProject({entry:unit.paths.Rust,paths:[...sources.keys()],readSource:path=>{if(!sources.has(path))fail('missing complete Rust project source');return sources.get(path);}});
   if(result.meta.refused.length)fail('Rust project unit still has unsupported source obligations: '+unit.id);return {Rust:text,JavaScript:result.javascript,TypeScript:result.typescript,meta:result.meta,generatedFrom:unit.paths.Rust.replace(/\.rs$/u,'.mjs'),runtimeBefore:'runtime'};
  }
  if(unit.profile==='portable'){
   try{const result=translatePortableRust(text,{sourcePath:unit.paths.Rust});return {Rust:text,JavaScript:result.javascript,TypeScript:result.typescript,meta:{semanticMeta:result.meta,portableRustSourceHistory:result.portableRustSourceHistory},portableProgram:result.program,generatedFrom:unit.paths.Rust.replace(/\.rs$/u,'.mjs'),runtimeBefore:'runtime'};}
   catch(error){if(!(error instanceof UnsupportedPortableRustSource))throw error;}
  }
  const result=translateSource(text,unit.paths.Rust);if(result.ir.counts.carried||result.ir.items.some(row=>row.term==='fn'&&row.status!=='executable'))fail('Rust unit still contains unsupported bodies: '+unit.id);return {Rust:text,JavaScript:result.javascript,TypeScript:result.typescript,meta:result.ir,generatedFrom:unit.paths.Rust.replace(/\.rs$/u,'.mjs'),runtimeBefore:'runtime'};
 }
 let result;if(unit.profile==='portable-project')result=translatePortableModuleProject({entry:unit.paths[language],language,modules:[{path:unit.paths[language],source:text},...dependencies]});
 else if(unit.profile==='filesystem'||unit.profile==='filesystem-control'){
  const input={sourcePath:unit.paths[language],runtimePath:unit.runtimes[language]+'/effects.mjs',runtimeSource:runtime.javascript};result=unit.profile==='filesystem-control'?(language==='TypeScript'?translateFilesystemControlTypeScript(text,input):translateFilesystemControlJavaScript(text,input)):(language==='TypeScript'?translateFilesystemEffectTypeScript(text,input):translateFilesystemEffectJavaScript(text,input));
 }else result=language==='TypeScript'?translateTypeScript(text,{sourcePath:unit.paths[language]}):translateJavaScript(text,{sourcePath:unit.paths[language]});
 return {Rust:result.rust,JavaScript:result.javascript??text,TypeScript:result.typescript,meta:result.moduleSourceHistory?{semanticMeta:result.meta,moduleSourceHistory:result.moduleSourceHistory}:result.meta,generatedFrom:unit.paths[language],runtimeBefore:unit.runtimes[language]};
}
export function planUnitSynchronization({root,manifestPath}={}){
 root=resolve(root);if(!fs.lstatSync(root).isDirectory()||fs.lstatSync(root).isSymbolicLink())fail('ordinary repository root required');manifestPath=relative(manifestPath);const manifestSource=source(root,manifestPath);if(manifestSource===null)fail('source descriptor is missing');const manifest=descriptor(JSON.parse(manifestSource)),revision=git(root,['rev-parse','HEAD']).trim();if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision))fail('one full current Git revision required');
 const inputs=[{path:manifestPath,source:manifestSource}],outputs=new Map(),units=[],protectedSources=new Set(),runtime=effectRuntimeAssets(),assets=hostRuntimeAssets();assets.set('effects.mjs',runtime.javascript);assets.set('effects.d.mts',runtime.declarations);let retained=Buffer.byteLength(manifestSource);
 const baselinePaths=[...new Set(manifest.units.flatMap(unit=>[...languages.map(language=>unit.paths[language]),...languages.flatMap(language=>unit.dependencies?.[language]??[]),...(unit.nativeSources??[]).map(row=>row.sourcePath)]))],previousSources=baselines(root,revision,baselinePaths),sourcePaths=new Set(baselinePaths);
 const output=(path,after,kind)=>{relative(path);if(path===manifestPath||kind!=='translated-source'&&sourcePaths.has(path))fail('generated data cannot overwrite its descriptor or a source unit/dependency');if(typeof after!=='string'||Buffer.byteLength(after)>FILE_LIMIT)fail('bounded complete generated source required');const prior=outputs.get(path);if(prior){if(prior.after!==after)fail('competing generated outputs');return;}const before=source(root,path),mode=before===null?0o644:fs.lstatSync(physical(root,path)).mode&0o777;retained+=Buffer.byteLength(after)+(before===null?0:Buffer.byteLength(before));if(retained>LIMIT)fail('whole source-unit proposal byte budget exceeded');outputs.set(path,{path,before,after,mode,kind,inverse:before});};
 for(const unit of manifest.units){
  const current={},previous={};for(const language of languages){current[language]=source(root,unit.paths[language]);previous[language]=previousSources.get(unit.paths[language]);retained+=current[language]===null?0:Buffer.byteLength(current[language]);if(retained>LIMIT)fail('whole original source byte budget exceeded');inputs.push({path:unit.paths[language],source:current[language]});}
  const dependencies={},dependencyChanges=new Set();for(const language of languages){dependencies[language]=(unit.dependencies?.[language]??[]).map(path=>{const text=source(root,path);if(text===null)fail('complete physical dependency source is missing');retained+=Buffer.byteLength(text);if(retained>LIMIT)fail('whole dependency source byte budget exceeded');inputs.push({path,source:text});if(text!==previousSources.get(path))dependencyChanges.add(language);return {path,source:text};});}
  const language=choose(unit,current,previous,dependencyChanges),original=current[language];protectedSources.add(unit.paths[language]);for(const row of dependencies[language])protectedSources.add(row.path);let translated;
  if(unit.profile==='filesystem-control'||unit.profile==='filesystem'&&language!=='Rust'){const path=unit.runtimes[language==='Rust'?'JavaScript':language]+'/effects.mjs',actual=source(root,path);if(actual!==runtime.javascript)fail('complete actual source filesystem runtime differs');inputs.push({path,source:actual});retained+=Buffer.byteLength(actual);if(retained>LIMIT)fail('whole original runtime byte budget exceeded');}
  let ownedStateInputs=null;
  const owned=ownedUnitProfile(unit.profile);if(owned){
   const capture=path=>{const text=source(root,path);if(text===null)fail('complete actual owned-state input is missing: '+path);retained+=Buffer.byteLength(text);if(retained>LIMIT)fail('whole owned-state input byte budget exceeded');inputs.push({path,source:text});protectedSources.add(path);return text;};
   const nativeSources=unit.nativeSources.map(row=>({path:row.path,source:capture(row.sourcePath)})),runtimeSources=owned.runtimeSources(unit).map(row=>{const actual=capture(row.path);if(actual!==row.source)fail('complete actual owned-state runtime differs: '+row.path);return {path:row.path,source:actual};});
   ownedStateInputs={unit,language,current,nativeSources,runtimeSources};
  }
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'source-unit:translate-complete-current-authoritative-source',apply:()=>{translated=translate(unit,language,original,runtime,dependencies[language],ownedStateInputs);return translated;}}]},
   {phase:'repository',rules:[{id:'router:relocate-target-modules-and-retain-complete-source-proposal',apply:result=>{
    if(language==='Rust'&&result.portableProgram&&current.TypeScript!==null){const paired=preservePairedTypeScriptAPI({original:current.TypeScript,typescript:result.TypeScript,program:result.portableProgram,rustSource:original});result={...result,TypeScript:paired.typescript,meta:{...result.meta,pairedTypeScriptAPIHistory:paired.history}};}
    const targetEquations=[];for(const target of languages){if(target===language)continue;let after=result[target];if(target!=='Rust'){const row=relocate(after,result.targetOrigins?.[target]??result.generatedFrom,unit.paths[target],result.runtimeBefore,unit.runtimes[target],target,sourceUnitPrimitiveOperators(unit)?[...new Set([unit.runtimes.JavaScript,unit.runtimes.TypeScript])]:undefined);after=row.source;targetEquations.push({language:target,...row});}const concrete=transportConcreteSyntaxSource(after,{language:target});if(transportConcreteSyntaxMeta(concrete.meta).source!==after)fail('complete target CST roundtrip differs');output(unit.paths[target],after,'translated-source');targetEquations.push({language:target,concreteSyntax:concrete.meta});}
    const unitAssets=runtimeAssetsForSourceUnit(unit,assets,runtime);for(const target of ['JavaScript','TypeScript'])for(const [name,text]of unitAssets)output(unit.runtimes[target]+'/'+name,text,'runtime-closure');return {...result,targetEquations};
   }}]},
  ]).run(original);
  const metadata={schema:SCHEMA,id:unit.id,authority:language,sourcePath:unit.paths[language],sourceSha256:hash(original),semanticMeta:run.value.meta,targetEquations:run.value.targetEquations,trace:run.trace,runtimeParity:false};output(unit.meta,JSON.stringify(metadata)+'\n','translation-meta');units.push({id:unit.id,authority:language,paths:unit.paths,trace:run.trace});
 }
 for(const row of outputs.values())if(protectedSources.has(row.path)&&row.before!==row.after)fail('a generated target would overwrite another unit authoritative input/dependency');
 for(const row of inputs)if(source(root,row.path)!==row.source)fail('source changed during complete planning');if(git(root,['rev-parse','HEAD']).trim()!==revision)fail('Git baseline changed');
 return {schema:SCHEMA,root,manifestPath,baseRevision:revision,manifestSource,units,inputs,outputs:[...outputs.values()],retainedSourceBytes:retained,sourceAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
}
// Shared guarded source installer. Node offers no conditional inode CAS: callers
// require exclusive/cooperating writers. Unknown captured replacements are kept.
function sourceInstallation(fresh,{checkHead=false,policy}={}){
 const root=fs.realpathSync(resolve(fresh.root)),rows=fresh.outputs,originals=new Map(),states=new Map(),written=[],installed=new Map(),artifacts=new Map(),external=[],unknownQuarantines=new Set();let directory=null,directoryIdentity=null,total=policy.retainedBytes;
 const id=stat=>[stat.dev,stat.ino,stat.mode],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const mutate=(names,operation,direct=false)=>{
  if(direct)policy.allowDirectWrites({root,outputs:names.map(path=>({path}))});else policy.allowMutationPaths(names);
  let result,failed=false,primary;try{policy.verify();result=operation();}catch(error){failed=true;primary=error;}try{policy.verify();}catch(error){if(failed)recordProtectedPolicyClosingFailure(primary,error,()=>policy.allowNativeStreamWrites({root,descriptors:[2]}));else{failed=true;primary=error;}}if(failed)throw primary;return result;
 };
 const createParents=name=>{const full=physical(root,name),pieces=name.split('/').slice(0,-1),missing=[];let path='';for(const piece of pieces){path=path?path+'/'+piece:piece;try{fs.lstatSync(physical(root,path));}catch(error){if(ownSourceFailureField(error,'code')!=='ENOENT')throw error;missing.push(path);}}return mutate(missing,()=>fs.mkdirSync(dirname(full),{recursive:true}));};
 const current=name=>{const before=source(root,name);if(before===null)return null;const stat=fs.lstatSync(physical(root,name));if(source(root,name)!==before)fail('source changed during installer identity capture');return {source:before,mode:stat.mode&0o777,identity:id(stat)};};
 const matches=(actual,expected)=>actual===null||expected===null?actual===expected:actual.source===expected.source&&actual.mode===expected.mode&&same(actual.identity,expected.identity);
 const exact=(name,expected)=>{if(!matches(current(name),expected))fail('source identity/bytes/mode changed: '+name);};
 const ownDirectory=()=>{const stat=fs.lstatSync(directory);if(!stat.isDirectory()||stat.isSymbolicLink()||!same(id(stat),directoryIdentity))fail('owned installation directory changed');};
 const privateRead=name=>{ownDirectory();return current(name);};
 const externalCheck=row=>{if(source(row.root,row.path)!==row.source)fail('external receiving producer source changed');const stat=row.source===null?null:fs.lstatSync(physical(row.root,row.path));if(stat&&!same(id(stat),row.identity))fail('external receiving producer source identity/mode changed');};
 const originalCheck=()=>{policy.verify();if(checkHead&&git(root,['rev-parse','HEAD']).trim()!==fresh.baseRevision)fail('Git baseline changed during source installation');for(const [name,expected]of originals)exact(name,installed.has(name)?installed.get(name):expected);for(const row of external)externalCheck(row);};
 if(!Array.isArray(rows)||rows.length>4096||!Array.isArray(fresh.inputs)||fresh.inputs.length>4096)fail('bounded complete source installation required');
 policy.allow({root,outputs:rows});
 for(const row of fresh.inputs){relative(row.path);const actual=current(row.path);if((actual?.source??null)!==row.source||originals.has(row.path)&&!matches(originals.get(row.path),actual))fail('inconsistent original source snapshots');originals.set(row.path,actual);total+=Buffer.byteLength(row.source??'');}
 for(const group of fresh.externalInputs??[]){if(!group||typeof group.root!=='string'||!Array.isArray(group.inputs)||external.length+group.inputs.length>4096)fail('bounded complete receiving source groups required');for(const row of group.inputs){relative(row.path);const sourceRoot=resolve(group.root),value=source(sourceRoot,row.path);if(value!==row.source)fail('external receiving source baseline differs');const stat=value===null?null:fs.lstatSync(physical(sourceRoot,row.path));if((stat?stat.mode&0o777:null)!==row.mode)fail('external receiving source mode differs');external.push({root:sourceRoot,path:row.path,source:value,identity:stat?id(stat):null});total+=Buffer.byteLength(value??'');}}
 for(const row of rows){relative(row.path);if(states.has(row.path)||row.after!==null&&typeof row.after!=='string'||row.before!==null&&typeof row.before!=='string'||!Number.isInteger(row.mode)||row.mode<0||row.mode>0o777||row.after===null&&(row.before===null||row.inverse!==row.before))fail('complete unique output source/mode operation required');const actual=current(row.path);if((actual?.source??null)!==row.before||actual&&actual.mode!==row.mode)fail('complete original output bytes/mode differ');if(row.after!==null&&Buffer.byteLength(row.after)>FILE_LIMIT)fail('generated output source bound');states.set(row.path,{row,before:actual,after:null});total+=Buffer.byteLength(row.before??'')+Buffer.byteLength(row.after??'');}if(total>LIMIT)fail('whole guarded installation source byte bound');
 const changed=[...states.values()].filter(state=>state.row.before!==state.row.after);originalCheck();for(const state of states.values())exact(state.row.path,state.before);if(!changed.length)return {schema:fresh.schema,baseRevision:fresh.baseRevision,changed:[],sourceAuthority:false,runtimeParity:false,rustExecuted:false};
 const privateName=name=>relative(fsRelative(directory)+'/'+name),fsRelative=full=>{const value=full.slice(root.length+1);relative(value);return value;};
 const remember=(name,expected)=>{artifacts.set(name,expected);exact(name,expected);};
 const removePrivate=name=>{ownDirectory();const expected=artifacts.get(name);if(!expected)fail('unknown private installation artifact');exact(name,expected);mutate([name],()=>fs.unlinkSync(physical(root,name)));artifacts.delete(name);};
 const capturePublic=(state,suffix)=>{
  ownDirectory();const name=privateName(suffix),publicName=state.row.path;if(current(name)!==null)fail('quarantine slot unexpectedly exists');mutate([publicName,name],()=>fs.renameSync(physical(root,publicName),physical(root,name)));unknownQuarantines.add(name);const actual=privateRead(name);
  if(!matches(actual,state.before)&&!matches(actual,state.after)){
   // Restore only by no-overwrite link; unexpected captured data stays retained.
   if(actual)try{mutate([publicName],()=>fs.linkSync(physical(root,name),physical(root,publicName)));}catch{}fail('unexpected public replacement captured and retained');
  }artifacts.set(name,actual);unknownQuarantines.delete(name);return name;
 };
 let primary,failed=false;const secondary=[];
 try{
  directory=resolve(root,'.router-source-install-'+randomUUID());mutate([fsRelative(directory)],()=>fs.mkdirSync(directory,{mode:0o700}));directoryIdentity=id(fs.lstatSync(directory));
  for(let index=0;index<changed.length;index++){
   const state=changed[index],row=state.row;ownDirectory();createParents(row.path);exact(row.path,state.before);
   if(state.before){const backup=privateName('backup-'+index),publicName=row.path;mutate([backup],()=>fs.linkSync(physical(root,publicName),physical(root,backup)));state.backup=backup;remember(backup,state.before);}
   if(row.after!==null){const stage=privateName('stage-'+index);mutate([stage],()=>fs.writeFileSync(physical(root,stage),row.after,{flag:'wx',mode:row.mode}));mutate([stage],()=>fs.chmodSync(physical(root,stage),row.mode),true);state.stage=stage;state.after=privateRead(stage);if(state.after.source!==row.after||state.after.mode!==row.mode)fail('complete prepared output readback differs');remember(stage,state.after);}
  }
  originalCheck();for(const state of states.values())exact(state.row.path,state.before);
  for(let index=0;index<changed.length;index++){
   const state=changed[index],row=state.row;originalCheck();exact(row.path,state.before);written.push(state);
   if(state.before){state.quarantine=capturePublic(state,'quarantine-'+index);installed.set(row.path,null);}
   if(row.after!==null){ownDirectory();const publicName=row.path;mutate([publicName],()=>fs.linkSync(physical(root,state.stage),physical(root,publicName)));installed.set(row.path,state.after);}else installed.set(row.path,null);
   exact(row.path,state.after);originalCheck();
  }
  originalCheck();for(const state of states.values())exact(state.row.path,state.row.before===state.row.after?state.before:state.after);
 }catch(error){failed=true;primary=error;
  for(let index=written.length-1;index>=0;index--)try{
   const state=written[index],row=state.row,actual=current(row.path);ownDirectory();
   if(matches(actual,state.before)){installed.set(row.path,state.before);continue;}
   if(actual!==null){if(!matches(actual,state.after))fail('external output replacement retained during rollback');capturePublic(state,'rollback-'+index);}
   if(state.before){exact(state.backup,state.before);const publicName=row.path;mutate([publicName],()=>fs.linkSync(physical(root,state.backup),physical(root,publicName)));exact(row.path,state.before);}else exact(row.path,null);installed.set(row.path,state.before);
  }catch(error){secondary.push(error);}
 }
 // Attempt every source closer even when one input changed or failure is falsy.
 try{policy.verify();}catch(error){secondary.push(error);}
 for(const [name,expected]of originals)try{exact(name,installed.has(name)?installed.get(name):expected);}catch(error){secondary.push(error);}
 for(const row of external)try{externalCheck(row);}catch(error){secondary.push(error);}
 for(const state of states.values())try{exact(state.row.path,installed.has(state.row.path)?installed.get(state.row.path):state.before);}catch(error){secondary.push(error);}
 if(directory){for(const name of [...artifacts.keys()])try{
   // Keep recovery bytes whenever rollback/closing could not restore originals.
   if(secondary.length||unknownQuarantines.size)continue;removePrivate(name);
  }catch(error){secondary.push(error);}try{ownDirectory();if(fs.readdirSync(directory).length===0)mutate([fsRelative(directory)],()=>fs.rmdirSync(directory));}catch(error){secondary.push(error);}}
 const recoveryPaths=[];if(directory)try{if(fs.existsSync(directory))recoveryPaths.push(directory);}catch(error){secondary.push(error);}
 if(failed){retainProtectedSourceDiagnostic('Source installation rollback/recovery',{primary,recoveryPaths});let attached=false;if(primary&&typeof primary==='object')try{Object.defineProperties(primary,{rollbackFailures:{value:secondary,enumerable:true},recoveryPaths:{value:recoveryPaths,enumerable:true}});attached=true;}catch{}if(recoveryPaths.length&&!attached)try{emitProtectedSourceDiagnostic(JSON.stringify({schema:'router-source-installation-recovery-paths-v1',recoveryPaths})+'\n',{primary,recoveryPaths,additionalVeto:()=>policy.allowNativeStreamWrites({root:fresh.root,descriptors:[2]})});}catch{}throw primary;}
 if(secondary.length){const error=new AggregateError(secondary,'Guarded source installation closing/cleanup failures');error.recoveryPaths=recoveryPaths;throw error;}return {schema:fresh.schema,baseRevision:fresh.baseRevision,changed:changed.map(state=>state.row.path),sourceAuthority:false,runtimeParity:false,rustExecuted:false};
}
function installFreshUnitProposal(serialized,produce){
 if(typeof serialized!=='string'||Buffer.byteLength(serialized)>LIMIT*3)fail('bounded serialized complete proposal required');const received=JSON.parse(serialized),policy=captureProtectedSourcePolicy(received.root);let result,primary,failed=false;
 try{const fresh=produce();if(JSON.stringify(received)!==JSON.stringify(fresh))fail('proposal differs from complete fresh source translation');result=sourceInstallation(fresh,{policy});}catch(error){failed=true;primary=error;}
 try{policy.close();}catch(error){if(!failed)throw error;recordProtectedPolicyClosingFailure(primary,error,()=>policy.allowNativeStreamWrites({root:received.root,descriptors:[2]}));}if(failed)throw primary;return result;
}

export function applyUnitSynchronization(serialized,{root,manifestPath}={}){
 return installFreshUnitProposal(serialized,()=>planUnitSynchronization({root,manifestPath}));
}
const RUNTIME_SCHEMA='router-source-unit-runtime-materialization-v1';
export function planUnitRuntimeMaterialization({root,manifestPath}={}){
 root=resolve(root);if(!fs.lstatSync(root).isDirectory()||fs.lstatSync(root).isSymbolicLink())fail('ordinary repository root required');manifestPath=relative(manifestPath);
 const manifestSource=source(root,manifestPath);if(manifestSource===null)fail('complete source-unit descriptor required');const manifest=descriptor(JSON.parse(manifestSource)),revision=git(root,['rev-parse','HEAD']).trim();if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision))fail('one full current Git revision required');
 const inputs=[{path:manifestPath,source:manifestSource}],outputs=new Map(),protectedPaths=new Set([manifestPath]),assets=hostRuntimeAssets(),effects=effectRuntimeAssets();let retained=Buffer.byteLength(manifestSource);
 assets.set('effects.mjs',effects.javascript);assets.set('effects.d.mts',effects.declarations);
 const originals=[...new Set(manifest.units.flatMap(unit=>[...languages.map(language=>unit.paths[language]),...languages.flatMap(language=>unit.dependencies?.[language]??[]),...(unit.nativeSources??[]).map(row=>row.sourcePath),unit.meta]))];
 for(const path of originals){protectedPaths.add(path);const text=source(root,path);retained+=text===null?0:Buffer.byteLength(text);if(retained>LIMIT)fail('complete runtime initialization input byte budget exceeded');inputs.push({path,source:text});}
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'runtime:derive-complete-registered-current-runtime-assets',apply:()=>assets}]},
  {phase:'repository',rules:[{id:'router:retain-all-declared-runtime-target-originals-and-inverses',apply:files=>{
   for(const unit of manifest.units){const unitAssets=runtimeAssetsForSourceUnit(unit,files,effects);for(const language of ['JavaScript','TypeScript'])for(const [name,after]of unitAssets){
    const path=relative(unit.runtimes[language]+'/'+name);if(protectedPaths.has(path))fail('runtime output would overwrite a source descriptor unit dependency native input or meta');
    const prior=outputs.get(path);if(prior){if(prior.after!==after)fail('competing complete runtime outputs');continue;}
    if(typeof after!=='string'||Buffer.byteLength(after)>FILE_LIMIT)fail('bounded complete registered runtime required');const before=source(root,path),mode=before===null?0o644:fs.lstatSync(physical(root,path)).mode&0o777;
    retained+=Buffer.byteLength(after)+(before===null?0:Buffer.byteLength(before));if(retained>LIMIT)fail('complete runtime proposal byte budget exceeded');outputs.set(path,{path,before,after,mode,kind:'runtime-closure',inverse:before});
   }}
   return [...outputs.values()];
  }}]},
 ]).run(null);
 for(const row of inputs)if(source(root,row.path)!==row.source)fail('complete runtime inputs changed during capture');for(const row of outputs.values())if(source(root,row.path)!==row.before)fail('runtime target changed during capture');if(git(root,['rev-parse','HEAD']).trim()!==revision)fail('Git baseline changed during runtime planning');
 return {schema:RUNTIME_SCHEMA,root,manifestPath,baseRevision:revision,manifestSource,units:manifest.units.map(unit=>({id:unit.id,profile:unit.profile})),inputs,outputs:run.value,trace:run.trace,retainedSourceBytes:retained,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
}
export function applyUnitRuntimeMaterialization(serialized,{root,manifestPath}={}){
 return installFreshUnitProposal(serialized,()=>planUnitRuntimeMaterialization({root,manifestPath}));
}


// Generic source transaction DATA APIs. The caller supplies its actual fresh
// producer; these issue no compiler, semantic or runtime authority.
export {installFreshUnitProposal as installFreshSourceProposal,source as readCurrentSourceProposalFile};

// Separate complete asynchronous fresh-producer transaction. Legacy sync API stays intact.
export async function installFreshAsyncSourceProposal(serialized,produce){
 if(typeof serialized!=='string'||Buffer.byteLength(serialized)>LIMIT*3)fail('bounded serialized complete proposal required');const received=JSON.parse(serialized),policy=captureProtectedSourcePolicy(received.root);let result,primary,failed=false;
 try{const fresh=await produce();if(JSON.stringify(received)!==JSON.stringify(fresh))fail('proposal differs from complete fresh source translation');result=sourceInstallation(fresh,{checkHead:true,policy});}catch(error){failed=true;primary=error;}
 try{policy.close();}catch(error){if(!failed)throw error;recordProtectedPolicyClosingFailure(primary,error,()=>policy.allowNativeStreamWrites({root:received.root,descriptors:[2]}));}if(failed)throw primary;return result;
}

import {sourceUnitPrimitiveOperators} from './primitive-source-unit-options.mjs';
import {relocateSourceUnitRuntimeTarget} from './source-unit-runtime-relocation.mjs';

// Private operational ownership snapshot. It grants no compiler permission.
// Capture precedes fresh production so a producer cannot remove the policy
// before installation. A restored present file retains changed ctimeNs.
function captureProtectedSourcePolicy(requestedRoot){
 if(typeof requestedRoot!=='string')fail('explicit source installation root required');
 const root=fs.realpathSync(resolve(requestedRoot)),policyPath='translation/source-ownership.json',schema='router-explicit-source-ownership-v1';
 const rootStamp=()=>{const stat=fs.lstatSync(root,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary protected-policy root required');return [stat.dev,stat.ino,stat.mode].map(String);};
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),rootIdentity=rootStamp();let revoked=false,closed=false;
 const parentStamp=()=>{let stat;try{stat=fs.lstatSync(resolve(root,'translation'),{bigint:true});}catch(error){if(ownSourceFailureField(error,'code')==='ENOENT')return null;throw error;}if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary protected-policy parent required');return [stat.dev,stat.ino,stat.mode].map(String);},parentIdentity=parentStamp();
 const fileStamp=()=>{let stat;try{stat=fs.lstatSync(physical(root,policyPath),{bigint:true});}catch(error){if(ownSourceFailureField(error,'code')==='ENOENT')return null;throw error;}if(!stat.isFile()||stat.isSymbolicLink()||stat.size>BigInt(FILE_LIMIT))fail('bounded ordinary protected-source policy required');return [stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(String);};
 const read=()=>{const before=fileStamp(),body=source(root,policyPath),after=fileStamp();if(!same(before,after)||(body===null)!==(after===null))fail('protected-source policy changed during capture');return {body,identity:after};};
 const initial=read(),protectedPaths=new Set();if(!same(rootStamp(),rootIdentity)||!same(parentStamp(),parentIdentity))fail('protected-source policy ancestors changed during capture');
 if(initial.body!==null){const value=JSON.parse(initial.body);if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!=='authored,schema,unmanaged'||value.schema!==schema)fail('closed explicit source ownership policy required');
  for(const names of [value.authored,value.unmanaged]){if(!Array.isArray(names)||names.length>4096)fail('bounded explicit protected-source list required');for(const name of names){relative(name);if(protectedPaths.has(name))fail('duplicate explicit protected-source path');protectedPaths.add(name);}}
 }
 const verify=()=>{try{if(closed||revoked)fail('protected-source policy scope expired or revoked');if(!same(rootStamp(),rootIdentity)||parentIdentity!==null&&!same(parentStamp(),parentIdentity))fail('protected-source root or parent changed');const next=read();if(next.body!==initial.body||!same(next.identity,initial.identity))fail('protected-source policy changed or was restored');}catch(error){revoked=true;throw error;}};
 const veto=operation=>{let value,failed=false,primary;try{verify();value=operation();}catch(error){failed=true;primary=error;}try{verify();}catch(error){if(!failed){failed=true;primary=error;}else recordProtectedPolicyClosingFailure(primary,error,diagnosticVeto);}if(failed){revoked=true;throw primary;}return value;};
 const diagnosticVeto=()=>veto(()=>assertProtectedNativeStreamWriteDescriptors({root,protectedNames:[policyPath,...protectedPaths],descriptors:[2]}));
 return Object.freeze({retainedBytes:initial.body===null?0:4*Buffer.byteLength(initial.body)+256,verify,
  allow(fresh){return veto(()=>{if(fs.realpathSync(resolve(fresh.root))!==root)fail('fresh producer root differs from protected-source policy');const protectedNames=[policyPath,...protectedPaths];let names=[];for(const row of fresh.outputs){relative(row.path);if(row.path===policyPath||protectedPaths.has(row.path)){if(row.before!==row.after)fail('explicit authored/unmanaged source or policy retained: '+row.path);if(row.before!==null){const stat=fs.lstatSync(physical(root,row.path));if((stat.mode&0o777)!==row.mode)fail('explicit protected-source mode retained: '+row.path);}}if(row.before!==row.after){names.push(row.path);if(names.length===256){assertProtectedStagedMutationTargets({root,protectedNames,paths:names});names=[];}}}if(names.length)assertProtectedStagedMutationTargets({root,protectedNames,paths:names});});},
  allowMutationPaths(paths){return veto(()=>{const protectedNames=[policyPath,...protectedPaths];assertProtectedMutationPaths({protectedNames,paths});assertProtectedStagedMutationTargets({root,protectedNames,paths});});},
  allowDirectWrites(fresh){return veto(()=>{if(fs.realpathSync(resolve(fresh.root))!==root)fail('fresh direct-writer root differs from protected-source policy');const paths=directMutationOutputPaths(fresh.outputs),protectedNames=[policyPath,...protectedPaths];assertProtectedMutationPaths({protectedNames,paths});assertProtectedDirectWriteTargets({root,protectedNames,paths});});},
  allowContainedDirectWrites(fresh){return veto(()=>{const captured=captureContainedNativeDirectTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:fresh.targets});assertProtectedDirectWriteTargets({root,protectedNames:[policyPath,...protectedPaths],paths:captured.map(row=>row.canonicalTarget)});return captured;});},
  allowNativeDirectWrites(fresh){return veto(()=>{const captured=captureAbsoluteNativeMutationTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:fresh.targets});assertProtectedNativeDirectWriteTargets({root,protectedNames:[policyPath,...protectedPaths],paths:captured.map(row=>row.canonicalTarget),descriptors:fresh.descriptors??[]});return captured;});},
  allowNativeStreamWrites(fresh){return veto(()=>{captureAbsoluteNativeMutationTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:[]});return assertProtectedNativeStreamWriteDescriptors({root,protectedNames:[policyPath,...protectedPaths],descriptors:fresh.descriptors??[]});});},
  allowNativeTemporaryPrefix(fresh){return veto(()=>{const captured=captureAbsoluteNativeMutationTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:[fresh.prefix]});return captureProtectedNativeTemporaryPrefix({root,protectedNames:[policyPath,...protectedPaths],prefix:captured[0].canonicalTarget,maximumRetainedBytes:fresh.maximumRetainedBytes});});},
  allowNativeMutationPaths(fresh){return veto(()=>{const captured=captureAbsoluteNativeMutationTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:fresh.targets});assertProtectedNativeStagedMutationTargets({root,protectedNames:[policyPath,...protectedPaths],paths:captured.map(row=>row.canonicalTarget)});return captured;});},
  close(){if(closed)fail('protected-source policy already closed');try{verify();}finally{closed=true;protectedPaths.clear();}},
 });
}
function recordProtectedPolicyClosingFailure(primary,error,additionalVeto){
 retainProtectedSourceDiagnostic('Protected source policy closing failure',{primary,secondary:error});
 if(primary!==null&&(typeof primary==='object'||typeof primary==='function'))try{Object.defineProperty(primary,'protectedSourcePolicyClosingFailure',{value:error,enumerable:true});return;}catch{}
 try{emitProtectedSourceDiagnostic(JSON.stringify({schema:'router-protected-source-policy-closing-v1',policy:'translation/source-ownership.json',closingFailed:true})+'\n',{primary,secondary:error,additionalVeto});}catch{}
}
// Shared operational veto/closing scope for fixed specialized writers. Its
// methods can restrict source mutations; they issue no compiler permission.
export {captureProtectedSourcePolicy as captureExplicitSourceMutationPolicy};
