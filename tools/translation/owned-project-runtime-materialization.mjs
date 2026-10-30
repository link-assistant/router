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

const SCHEMA='router-source-unit-sync-v1',LIMIT=64*1024*1024,FILE_LIMIT=8*1024*1024;
const languages=['Rust','JavaScript','TypeScript'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Source unit synchronization: '+message);};
function relative(value){if(typeof value!=='string'||!value||value.length>4096||value.startsWith('/')||value.includes('\\')||/[\0\r\n:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative path required');return value;}
function physical(root,name){relative(name);let parent=root;const parts=name.split('/');for(const part of parts.slice(0,-1)){parent=resolve(parent,part);try{const row=fs.lstatSync(parent);if(!row.isDirectory()||row.isSymbolicLink())fail('linked or non-directory source parent');}catch(error){if(error.code!=='ENOENT')throw error;}}return resolve(root,name);}
function source(root,name){
 const full=physical(root,name);let row;try{row=fs.lstatSync(full);}catch(error){if(error.code==='ENOENT')return null;throw error;}
 if(!row.isFile()||row.isSymbolicLink()||row.size>FILE_LIMIT)fail('bounded ordinary source file required');const fd=fs.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{const before=fs.fstatSync(fd),chunks=[];let total=0;for(;;){const bytes=Buffer.alloc(Math.min(65536,FILE_LIMIT-total+1)),count=fs.readSync(fd,bytes,0,bytes.length,null);if(!count)break;total+=count;if(total>FILE_LIMIT)fail('source grew beyond its byte bound');chunks.push(bytes.subarray(0,count));}const raw=Buffer.concat(chunks,total),after=fs.fstatSync(fd),named=fs.lstatSync(full);if(!before.isFile()||row.dev!==before.dev||row.ino!==before.ino||before.dev!==after.dev||before.ino!==after.ino||before.size!==raw.length||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||before.dev!==named.dev||before.ino!==named.ino||before.mode!==named.mode||after.size!==named.size||after.mtimeMs!==named.mtimeMs||after.ctimeMs!==named.ctimeMs)fail('complete source changed during capture');const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('source must retain exact UTF8 bytes');return text;}finally{fs.closeSync(fd);}
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
function relocate(text,from,to,runtimeBefore,runtimeAfter,language){
 const ts=ownershipCompiler(),file=ts.createSourceFile(from,text,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS),edits=[];if(file.parseDiagnostics.length)fail('complete generated native target syntax differs');
 for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
  const literal=node.moduleSpecifier;if(!ts.isStringLiteral(literal))fail('literal target module edge required');if(literal.text.startsWith('node:'))continue;if(!literal.text.startsWith('.'))fail('unbound package import in source-unit target');const before=posix.normalize(posix.join(posix.dirname(from),literal.text));
  if(!before.startsWith(runtimeBefore+'/'))fail('target import escapes declared runtime closure');const full=runtimeAfter+before.slice(runtimeBefore.length),relative=posix.relative(posix.dirname(to),full),replacement=JSON.stringify(relative.startsWith('.')?relative:'./'+relative);edits.push({span:[literal.getStart(file),literal.end],expected:literal.getText(file),replacement});
 }
 let after=text;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);const equation=transportConcreteSourceEquations([{before:text,after,language}])[0];if(equation.inverse!==text)fail('whole native target import inverse differs');return {source:after,edits,equation};
}
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
    const targetEquations=[];for(const target of languages){if(target===language)continue;let after=result[target];if(target!=='Rust'){const row=relocate(after,result.generatedFrom,unit.paths[target],result.runtimeBefore,unit.runtimes[target],target);after=row.source;targetEquations.push({language:target,...row});}const concrete=transportConcreteSyntaxSource(after,{language:target});if(transportConcreteSyntaxMeta(concrete.meta).source!==after)fail('complete target CST roundtrip differs');output(unit.paths[target],after,'translated-source');targetEquations.push({language:target,concreteSyntax:concrete.meta});}
    const unitAssets=runtimeAssetsForSourceUnit(unit,assets,runtime);for(const target of ['JavaScript','TypeScript'])for(const [name,text]of unitAssets)output(unit.runtimes[target]+'/'+name,text,'runtime-closure');return {...result,targetEquations};
   }}]},
  ]).run(original);
  const metadata={schema:SCHEMA,id:unit.id,authority:language,sourcePath:unit.paths[language],sourceSha256:hash(original),semanticMeta:run.value.meta,targetEquations:run.value.targetEquations,trace:run.trace,runtimeParity:false};output(unit.meta,JSON.stringify(metadata)+'\n','translation-meta');units.push({id:unit.id,authority:language,paths:unit.paths,trace:run.trace});
 }
 for(const row of outputs.values())if(protectedSources.has(row.path)&&row.before!==row.after)fail('a generated target would overwrite another unit authoritative input/dependency');
 for(const row of inputs)if(source(root,row.path)!==row.source)fail('source changed during complete planning');if(git(root,['rev-parse','HEAD']).trim()!==revision)fail('Git baseline changed');
 return {schema:SCHEMA,root,manifestPath,baseRevision:revision,manifestSource,units,inputs,outputs:[...outputs.values()],retainedSourceBytes:retained,sourceAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
}
function installFreshUnitProposal(serialized,produce){
 if(typeof serialized!=='string'||Buffer.byteLength(serialized)>LIMIT*3)fail('bounded serialized complete proposal required');const received=JSON.parse(serialized),fresh=produce();if(JSON.stringify(received)!==JSON.stringify(fresh))fail('proposal differs from complete fresh source translation');
 const changed=fresh.outputs.filter(row=>row.before!==row.after),written=[],installed=new Map(),originals=new Map();for(const row of fresh.inputs){if(originals.has(row.path)&&originals.get(row.path)!==row.source)fail('inconsistent original input snapshots');originals.set(row.path,row.source);}
 const guardOriginals=()=>{for(const [path,before]of originals)if(source(fresh.root,path)!==(installed.has(path)?installed.get(path):before))fail('original source changed during installation');};
 guardOriginals();for(const row of fresh.outputs)if(source(fresh.root,row.path)!==row.before)fail('complete output set changed before installation');
 try{
  for(const row of changed){if(source(fresh.root,row.path)!==row.before)fail('target changed before installation');const full=physical(fresh.root,row.path);fs.mkdirSync(dirname(full),{recursive:true});const temporary=full+'.router-unit-'+randomUUID();try{fs.writeFileSync(temporary,row.after,{flag:'wx',mode:row.mode});if(row.before!==null)fs.chmodSync(temporary,row.mode);if(source(fresh.root,row.path)!==row.before)fail('target changed before atomic replacement');fs.renameSync(temporary,full);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}written.push(row);installed.set(row.path,row.after);}
  guardOriginals();for(const row of fresh.outputs)if(source(fresh.root,row.path)!==row.after)fail('complete target readback differs');
 }catch(error){const rollback=[];for(const row of [...written].reverse())try{if(source(fresh.root,row.path)!==row.after){rollback.push(row.path+': external change retained');continue;}if(row.before===null)fs.unlinkSync(physical(fresh.root,row.path));else fs.writeFileSync(physical(fresh.root,row.path),row.before);}catch(caught){rollback.push(row.path+': '+caught.message);}error.rollbackFailures=rollback;throw error;}
 return {schema:fresh.schema,baseRevision:fresh.baseRevision,changed:changed.map(row=>row.path),sourceAuthority:false,runtimeParity:false,rustExecuted:false};
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
