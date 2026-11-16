// Source-unit synchronization with fresh Git baselines and complete proposals.
// No persisted source/hash/verdict cache supplies a translation decision.
import * as fs from 'node:fs';
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
import {ownedUnitProfile,runtimeAssetsForSourceUnit} from './project-unit-profiles.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {resolveSourceUnitGitBaseline} from './source-unit-git-baseline.mjs';

const SCHEMA='router-source-unit-sync-v1',LIMIT=64*1024*1024,FILE_LIMIT=8*1024*1024;
const languages=['Rust','JavaScript','TypeScript'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Source unit synchronization: '+message);};
function relative(value){if(typeof value!=='string'||!value||value.length>4096||value.startsWith('/')||value.includes('\\')||/[\0\r\n:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative path required');return value;}
function physical(root,name){relative(name);let parent=root;const parts=name.split('/');for(const part of parts.slice(0,-1)){parent=resolve(parent,part);try{const row=fs.lstatSync(parent);if(!row.isDirectory()||row.isSymbolicLink())fail('linked or non-directory source parent');}catch(error){if(error.code!=='ENOENT')throw error;}}return resolve(root,name);}
function source(root,name){
 const full=physical(root,name);let row;try{row=fs.lstatSync(full);}catch(error){if(error.code==='ENOENT')return null;throw error;}
 if(!row.isFile()||row.isSymbolicLink()||row.size>FILE_LIMIT)fail('bounded ordinary source file required');const fd=fs.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let readFailed=false;
 try{const before=fs.fstatSync(fd),chunks=[];let total=0;for(;;){const bytes=Buffer.alloc(Math.min(65536,FILE_LIMIT-total+1)),count=fs.readSync(fd,bytes,0,bytes.length,null);if(!count)break;total+=count;if(total>FILE_LIMIT)fail('source grew beyond its byte bound');chunks.push(bytes.subarray(0,count));}const raw=Buffer.concat(chunks,total),after=fs.fstatSync(fd),named=fs.lstatSync(full);if(!before.isFile()||row.dev!==before.dev||row.ino!==before.ino||before.dev!==after.dev||before.ino!==after.ino||before.size!==raw.length||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||before.dev!==named.dev||before.ino!==named.ino||before.mode!==named.mode||after.size!==named.size||after.mtimeMs!==named.mtimeMs||after.ctimeMs!==named.ctimeMs)fail('complete source changed during capture');const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('source must retain exact UTF8 bytes');return text;}catch(error){readFailed=true;throw error;}finally{try{fs.closeSync(fd);}catch(error){if(!readFailed)throw error;}}
}
function gitEnvironment(){const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),empty=process.platform==='win32'?'NUL':'/dev/null';return {...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:empty,GIT_CONFIG_SYSTEM:empty,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};}
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
  if(!unit||typeof unit.id!=='string'||!/^[_a-zA-Z0-9-]{1,96}$/u.test(unit.id)||ids.has(unit.id)||!['portable','portable-project','filesystem','filesystem-control','owned-state','owned-outcome','owned-project'].includes(unit.profile)||!['auto',...languages].includes(unit.authority??'auto'))fail('unique source unit and known profile required');ids.add(unit.id);
  for(const language of languages){const name=relative(unit.paths?.[language]);if(paths.has(name))fail('source units cannot overlap');paths.add(name);if(!name.endsWith(language==='Rust'?'.rs':language==='TypeScript'?'.ts':'.mjs'))fail('language extension differs');}
  const owned=ownedUnitProfile(unit.profile);if(owned){
   if(!Array.isArray(unit.nativeSources)||unit.nativeSources.length<owned.nativeInputs.length||unit.nativeSources.length>32)fail('complete bounded actual native source mappings required');
   const logical=new Set(),physical=new Set();for(const row of unit.nativeSources){relative(row.path);relative(row.sourcePath);if(logical.has(row.path)||physical.has(row.sourcePath))fail('unique logical and physical native source mappings required');logical.add(row.path);physical.add(row.sourcePath);}
   if(owned.nativeInputs.some(path=>!logical.has(path)))fail('complete actual native boundary and Cargo mappings required');
  }else if(unit.nativeSources!==undefined)fail('native source mappings require an owned source profile');
  relative(unit.meta);for(const language of ['JavaScript','TypeScript'])relative(unit.runtimes?.[language]);
  for(const language of languages){const dependencies=unit.dependencies?.[language]??[];if(!Array.isArray(dependencies)||dependencies.length>127||new Set(dependencies).size!==dependencies.length)fail('bounded unique dependency paths required');for(const dependency of dependencies)relative(dependency);if(dependencies.length&&!['portable-project','owned-project'].includes(unit.profile))fail('source dependency lists require the project profile');}
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

import {sourceUnitPrimitiveOperators} from './primitive-source-unit-options.mjs';
import {relocateSourceUnitRuntimeTarget} from './source-unit-runtime-relocation.mjs';

// Additive concurrent-owned-pair lane. The copied descriptor/translation plumb
// above remains original; every admission calls actual private owned producers.
import {captureSourceUnitGitBaseline} from './source-unit-git-baseline.mjs';
import {repositoryRustLayout,rustPackageSourcePath} from './repository-layout.mjs';
import {installFreshAsyncSourceProposal} from './unit-runtime-materialization.mjs';
import {createReconcileSourceCapture,requireReconcile as need,reconcileHead,ordinal,boundedReconcileWireBytes,RECONCILE_LIMITS as BOUNDS} from './paired-sync-reconcile-20261101-support.mjs';
const PAIR_SCHEMA='router-owned-peer-reconcile-20261101-v1';
const same=(a,b)=>{boundedReconcileWireBytes(a);boundedReconcileWireBytes(b);return JSON.stringify(a)===JSON.stringify(b);};
const sameMaps=(a,b)=>a.size===b.size&&[...a].every(([key,value])=>b.has(key)&&b.get(key)===value);
const directoryIdentity=stat=>[stat.dev,stat.ino,stat.mode,stat.mtimeMs,stat.ctimeMs];
function closePreserving(operation,close){let result,primary,failed=false;try{result=operation();}catch(error){failed=true;primary=error;}try{close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return result;}
function scan(captured,prefix,{rust=false}={}){
 const names=[],directories=[];let count=0;const visit=name=>{relative(name);const full=resolve(captured.root,name),before=fs.lstatSync(full);need(before.isDirectory()&&!before.isSymbolicLink(),'ordinary owned source directory required');const handle=fs.opendirSync(full),entries=[];closePreserving(()=>{for(;;){const entry=handle.readSync();if(entry===null)break;need(++count<=BOUNDS.count,'owned source census bound');entries.push(entry);}},()=>handle.closeSync());entries.sort((a,b)=>ordinal(a.name,b.name));directories.push({path:name,names:entries.map(row=>row.name),identity:directoryIdentity(before)});for(const entry of entries){need(!entry.isSymbolicLink(),'linked owned source refused');const child=relative(name+'/'+entry.name);if(entry.isDirectory())visit(child);else{need(entry.isFile(),'special owned source refused');if(!rust||child.endsWith('.rs')){captured.capture(child);names.push(child);}}}};visit(prefix);return {names:names.sort(ordinal),directories};
}
function closeTrees(root,trees){const errors=[];for(const tree of trees)for(const row of tree.directories)try{const stat=fs.lstatSync(resolve(root,row.path));need(stat.isDirectory()&&!stat.isSymbolicLink()&&same(directoryIdentity(stat),row.identity),'owned directory identity changed');const handle=fs.opendirSync(resolve(root,row.path)),names=[];closePreserving(()=>{for(;;){const entry=handle.readSync();if(entry===null)break;need(names.length<BOUNDS.count,'closing owned source census bound');names.push(entry.name);}},()=>handle.closeSync());need(same(names.sort(ordinal),row.names),'owned source child census changed');}catch(error){errors.push(error);}if(errors.length)throw new AggregateError(errors,'Owned peer directory closing failures');}
function fullInverse(before,after,language){const equation=transportConcreteSourceEquations([{before,after,language}])[0];need(equation.inverse===before,'complete owned peer source inverse differs');return equation;}
function retainRaw(value){let bytes=64,cells=0;const visit=(row,depth)=>{need(++cells<=1000000&&depth<=128,'complete owned proof metadata traversal bound');if(typeof row==='string')bytes+=Buffer.byteLength(row);else if(row&&typeof row==='object')for(const [key,value]of Object.entries(row)){bytes+=Buffer.byteLength(key);visit(value,depth+1);}else bytes+=8;need(bytes<=BOUNDS.raw,'complete retained owned proof/source occurrence bound');};visit(value,0);return bytes;}
function runtimeMap(unit,owned){const runtime=effectRuntimeAssets(),assets=hostRuntimeAssets();assets.set('effects.mjs',runtime.javascript);assets.set('effects.d.mts',runtime.declarations);const expected=new Map(),add=(path,source)=>{relative(path);need(typeof source==='string'&&(!expected.has(path)||expected.get(path)===source),'complete original runtime producers disagree');expected.set(path,source);};for(const row of owned.runtimeSources(unit))add(row.path,row.source);const outputs=runtimeAssetsForSourceUnit(unit,assets,runtime);for(const language of ['JavaScript','TypeScript'])for(const [name,text]of outputs)add(unit.runtimes[language]+'/'+name,text);return {expected,runtime};}
function canonical(result,unit){
 need(typeof result.Rust==='string'&&typeof result.JavaScript==='string'&&typeof result.TypeScript==='string'&&!result.projectSources,'complete original owned single-file outputs required');const rows={Rust:result.Rust};for(const language of ['JavaScript','TypeScript'])rows[language]=relocate(result[language],result.targetOrigins?.[language]??result.generatedFrom,unit.paths[language],result.runtimeBefore,unit.runtimes[language],language,sourceUnitPrimitiveOperators(unit)?[...new Set([unit.runtimes.JavaScript,unit.runtimes.TypeScript])]:undefined).source;return {sources:rows,meta:result.meta};
}
/** Actual complete owned-outcome inverse domain; no extra scalar syntax whitelist. */
export function planOwnedPeerReconciliation({root,manifestPath}={}){
 relative(manifestPath);const captured=createReconcileSourceCapture(resolve(root));root=captured.root;const trees=[],closers=[];let result,primary,failed=false,revision;
 try{
  revision=reconcileHead(root);const manifestSource=captured.capture(manifestPath).source;need(manifestSource!==null,'actual owned descriptor missing');const manifest=descriptor(JSON.parse(manifestSource));need(Object.keys(manifest).every(key=>['schema','units','baselineRevision'].includes(key))&&manifest.units.length===1,'closed descriptor and one whole owned unit required in this lane');const unit=manifest.units[0];need(Object.keys(unit).every(key=>['id','profile','authority','paths','runtimes','meta','nativeSources','dependencies','primitiveOperators'].includes(key))&&same(Object.keys(unit.paths).sort(),[...languages].sort())&&same(Object.keys(unit.runtimes).sort(),['JavaScript','TypeScript']),'closed actual owned-unit fields required');need(unit.profile==='owned-outcome'&&(unit.authority??'auto')==='auto'&&languages.every(key=>(unit.dependencies?.[key]??[]).length===0),'auto owned-outcome single-file/no-application-dependency domain required');
  need(unit.dependencies===undefined||unit.dependencies&&typeof unit.dependencies==='object'&&!Array.isArray(unit.dependencies)&&Object.keys(unit.dependencies).every(key=>languages.includes(key)),'closed optional application dependency set required');need(unit.paths.JavaScript.startsWith('js/src/')&&unit.paths.TypeScript.startsWith('ts/src/')&&unit.runtimes.JavaScript==='js/runtime'&&unit.runtimes.TypeScript==='ts/runtime','mirrored original physical JS/TS source/runtime roots required');const layout=repositoryRustLayout(root),prefix=layout.productionPrefix.replace(/\/$/u,'');need(unit.paths.Rust.startsWith(prefix+'/'),'caller must stay in actual native source root');
  const owned=ownedUnitProfile(unit.profile);need(owned&&typeof owned.translate==='function','actual original owned producer required');for(const row of unit.nativeSources)need(same(Object.keys(row).sort(),['path','sourcePath'])&&(row.path==='Cargo.toml'||row.path==='Cargo.lock'||row.path.startsWith('src/')&&row.path.endsWith('.rs'))&&row.sourcePath===rustPackageSourcePath(root,row.path),'native logical/physical mapping differs from actual repository layout');
  const native=scan(captured,prefix,{rust:true});trees.push(native);need(native.names.includes(unit.paths.Rust),'whole current native caller missing');const generatedRuntime=runtimeMap(unit,owned);closers.push(()=>need(sameMaps(runtimeMap(unit,owned).expected,generatedRuntime.expected),'original runtime producer sources changed'));for(const name of [...new Set(Object.values(unit.runtimes))]){const tree=scan(captured,name);trees.push(tree);const expected=[...generatedRuntime.expected.keys()].filter(path=>path.startsWith(name+'/')).sort(ordinal);need(same(tree.names,expected),'complete current registered runtime census differs');}
  const protectedPaths=new Set([manifestPath,...native.names.filter(name=>name!==unit.paths.Rust),...layout.cargoInputs,...unit.nativeSources.map(row=>row.sourcePath),...generatedRuntime.expected.keys()]);need(!protectedPaths.has(unit.paths.Rust)&&![...protectedPaths,unit.paths.Rust,unit.paths.JavaScript,unit.paths.TypeScript].includes(unit.meta),'owned caller/metadata overlap original source or runtime');
  const paths=[...new Set([manifestPath,...native.names,...layout.cargoInputs,...unit.nativeSources.map(row=>row.sourcePath),...generatedRuntime.expected.keys(),...Object.values(unit.paths),unit.meta])];need(paths.length<=BOUNDS.count,'complete owned input count bound');for(const name of paths)need(captured.capture(name).source!==null,'complete owned input missing: '+name);
  const sourceBaselineRevision=resolveSourceUnitGitBaseline(root,revision,Object.hasOwn(manifest,'baselineRevision')?manifest.baselineRevision:undefined),baseline=captureSourceUnitGitBaseline(root,sourceBaselineRevision,{prefix,paths});for(const row of baseline.values())captured.charge(row.source);need(same([...baseline.keys()].filter(name=>name.startsWith(prefix+'/')&&name.endsWith('.rs')).sort(ordinal),native.names),'native source addition/deletion/rename requires topology reconciliation');
  let currentDescriptor=baseline.get(manifestPath);if(sourceBaselineRevision!==revision){const descriptorEpoch=captureSourceUnitGitBaseline(root,revision,{prefix,paths:[manifestPath]});for(const row of descriptorEpoch.values())captured.charge(row.source);currentDescriptor=descriptorEpoch.get(manifestPath);}
  for(const name of paths){const before=name===manifestPath?currentDescriptor:baseline.get(name),actual=captured.capture(name);need(before&&before.mode===actual.mode,'missing or changed complete committed owned mode: '+name);if(!Object.values(unit.paths).includes(name)&&name!==unit.meta)need(before.source===actual.source,'changed original owned helper/Cargo/descriptor/runtime: '+name);}
  for(const [name,text]of generatedRuntime.expected)need(captured.capture(name).source===text&&baseline.get(name).source===text,'actual/baseline original runtime differs: '+name);
  const previous=Object.fromEntries(languages.map(language=>[language,baseline.get(unit.paths[language]).source])),current=Object.fromEntries(languages.map(language=>[language,captured.capture(unit.paths[language]).source])),changed=languages.filter(language=>current[language]!==previous[language]);need(changed.includes('JavaScript')===changed.includes('TypeScript'),'single edited peer belongs to original unit planner');
  const nativeSources=unit.nativeSources.map(row=>({path:row.path,source:captured.capture(row.sourcePath).source})),runtimeSources=owned.runtimeSources(unit).map(row=>({path:row.path,source:captured.capture(row.path).source})),dependencies=Object.fromEntries(languages.map(language=>[language,[]]));
  const invoke=(language,sources)=>{const value=translate(unit,language,sources[language],generatedRuntime.runtime,[],{unit,language,current:sources,nativeSources,runtimeSources,dependencies});need(value.profile==='router-owned-json-outcome-v1','unexpected original owned producer result');boundedReconcileWireBytes(value.meta);captured.charge(value.Rust);captured.charge(value.JavaScript);captured.charge(value.TypeScript);return value;};
  let js,ts,fromJs,fromTs,canonicalProof,peerEquations,reviewProof;
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'owned-pair:independently-reissue-complete-current-JavaScript-and-strict-TypeScript-inverses',apply:()=>{
    js=invoke('JavaScript',{Rust:previous.Rust,JavaScript:current.JavaScript,TypeScript:previous.TypeScript});ts=invoke('TypeScript',{Rust:previous.Rust,JavaScript:previous.JavaScript,TypeScript:current.TypeScript});need(js.Rust===ts.Rust,'independent complete owned canonical Rust candidates conflict');need(current.Rust===previous.Rust||current.Rust===js.Rust,'concurrent differing native source requires separate reconciliation');
    fromJs=canonical(invoke('Rust',{...previous,Rust:js.Rust}),unit);fromTs=canonical(invoke('Rust',{...previous,Rust:ts.Rust}),unit);need(same(fromJs,fromTs),'independent complete native forward source/meta sets differ');need(fromJs.sources.Rust===js.Rust,'original native forward changed complete canonical Rust');
    for(const [language,source]of [['JavaScript',fromJs.sources.JavaScript],['TypeScript',fromJs.sources.TypeScript]]){const checked=invoke(language,{...previous,[language]:source});need(checked.Rust===js.Rust,'canonical forward peer failed independent complete native reproduction');}
    const untouched=!changed.includes('JavaScript');if(untouched)need(js.Rust===previous.Rust&&current.Rust===previous.Rust,'unchanged peers must reproduce exact committed native baseline');canonicalProof=fromJs;peerEquations=languages.map(language=>({language,path:unit.paths[language],equation:fullInverse(language==='Rust'?previous.Rust:current[language],canonicalProof.sources[language],language)}));return canonicalProof;
   }}]},
   {phase:'repository',rules:[{id:'router:protect-both-authored-owned-peers-and-merge-only-exact-native-runtime-metadata-outputs',apply:()=>{
    const outputs=[],output=(path,after,kind)=>{const before=captured.capture(path);need(typeof after==='string'&&Buffer.byteLength(after)<=BOUNDS.file,'bounded complete owned output required');captured.charge(after);outputs.push({path,before:before.source,after,inverse:before.source,mode:before.mode,kind});};
    const proof={schema:PAIR_SCHEMA,id:unit.id,sourceBaselineRevision,manifestSource,originalNativeCaller:previous.Rust,authoredPeers:{JavaScript:current.JavaScript,TypeScript:current.TypeScript},independentInverses:{JavaScript:{Rust:js.Rust,meta:js.meta},TypeScript:{Rust:ts.Rust,meta:ts.meta}},canonical:canonicalProof,peerEquations,trace:[{phase:'language',id:'owned-pair:independently-reissue-complete-current-JavaScript-and-strict-TypeScript-inverses'},{phase:'repository',id:'router:protect-both-authored-owned-peers-and-merge-only-exact-native-runtime-metadata-outputs'}],sourceAuthority:false,semanticAuthority:false,runtimeParity:false};reviewProof=proof;need(boundedReconcileWireBytes(proof)+1<=BOUNDS.file,'complete owned reconciliation metadata bound');const metadata=JSON.stringify(proof)+'\n',actualMeta=captured.capture(unit.meta).source;need(actualMeta===baseline.get(unit.meta).source||actualMeta===metadata,'owned metadata changed independently or is stale');
    if(changed.includes('JavaScript')){output(unit.paths.Rust,js.Rust,'fresh-complete-owned-native-candidate');for(const [name,text]of generatedRuntime.expected)output(name,text,'exact-original-owned-runtime');output(unit.meta,metadata,'complete-owned-peer-reconciliation-proof');}
    need(outputs.every(row=>![unit.paths.JavaScript,unit.paths.TypeScript].includes(row.path)),'authored peer would be overwritten');return outputs;
   }}]},
  ]).run(null);need(same(reviewProof.trace,run.trace),'complete owned reconciliation rule trace differs');
  result={schema:PAIR_SCHEMA,root,manifestPath,manifestSource,baseRevision:revision,sourceBaselineRevision,units:[{id:unit.id,authority:'JavaScript+TypeScript',profile:unit.profile,paths:unit.paths}],inputs:captured.inputs(),outputs:run.value,proof:{independentInverses:{JavaScript:js.meta,TypeScript:ts.meta},canonical:canonicalProof,peerEquations},trace:run.trace,noOp:run.value.every(row=>row.before===row.after),sourceAuthority:false,semanticAuthority:false,runtimeParity:false,rustExecuted:false,crossInvocationCache:false,wholeRouterSynchronization:false};result.retainedSourceBytes=Math.max(captured.retained,retainRaw({plan:result,producerResults:{js,ts,fromJs,fromTs},baselineInputs:[...baseline].map(([path,row])=>({path,...row})),currentInputs:{nativeSources,runtimeSources,previous,current,unit,nativeCensus:native},runtimeProducerRows:[...generatedRuntime.expected].map(([path,source])=>({path,source}))}));boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}
 const closing=[];for(const close of closers)try{close();}catch(error){closing.push(error);}try{closeTrees(root,trees);}catch(error){closing.push(error);}try{captured.close();}catch(error){closing.push(error);}if(revision)try{need(reconcileHead(root)===revision,'Git source epoch changed during owned reconciliation');}catch(error){closing.push(error);}if(failed)throw primary;if(closing.length)throw new AggregateError(closing,'Owned peer reconciliation closing failures');return result;
}
export async function applyOwnedPeerReconciliation(serialized,options){return installFreshAsyncSourceProposal(serialized,()=>planOwnedPeerReconciliation(options));}
