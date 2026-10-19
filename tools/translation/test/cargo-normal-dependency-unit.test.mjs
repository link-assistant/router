import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,copyFileSync,realpathSync,renameSync,symlinkSync,unlinkSync,lstatSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {Hash,createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {compilationProfile,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {planOriginalCargoInvocation,requireOriginalCargoInvocationPlan} from '../cargo-invocation-plan.mjs';
import {captureOriginalNormalDependencyUnit,requireOriginalNormalDependencyUnit,originalNormalDependencyUnitObligations} from '../cargo-normal-dependency-unit.mjs';
import {originalCargoUnitSourceProgram,assertOriginalCargoUnitSourceProgram,revalidateOriginalCargoSourceText} from '../cargo-unit-source-semantics.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),cargo={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},dependencies=loadDeriveDependencyProof(cargo),packageToken=captureOriginalExternalTraitPackage(dependencies,'base64');
const temporary=realpathSync(mkdtempSync(join(tmpdir(),'router-cargo-normal-unit-')));after(()=>rmSync(temporary,{recursive:true,force:true}));
function retain(name,value){const directory=process.env.ROUTER_CARGO_NORMAL_UNIT_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json.gz'),gzipSync(JSON.stringify(value)+'\n'),{flag:'wx'});}}
function frame(profile=PRODUCTION_PROFILE){const source='pub fn choose(value:bool)->i32{if value{23}else{-6}}',capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:profile}),modules=[{source,file:'src/lib.rs',path:[],sourceView:capture.views[0],compilationProfile:profile}],context=createMatchesMacroContext({modules,deriveDependencies:dependencies,compilationProfile:profile}),parser=new HostRustParser(tokenizeRust(source));parser.compilationProfile=profile;configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});return {source,capture,modules,context,parser,state:matchesParserFacts(parser)};}
function domain(mode='build'){return {schema:'modeled-cargo-root-library-invocation-v1',argv:['cargo',mode,'--package','link-assistant-router','--lib'],configurationFiles:[],environmentOverrides:[],compilerWrappers:[],rustflags:[],rustdocflags:[],profileCompilerFlags:[],extraRustcArguments:[],targetOverride:null,cargoUnstableOptions:[],buildScriptOverrides:[]};}
function issue(row,request=domain()){const options={packageToken,domain:request},token=planOriginalCargoInvocation(row.parser,options),facts=requireOriginalCargoInvocationPlan(token,row.parser,options);return {options,token,facts};}
function noAuthority(facts){assert.equal(facts.modeledSemanticsOnly,true);for(const key of ['nativeInvocationObserved','actualEnvironmentObserved','actualConfigurationObserved','nativeParity','dependencyUnitRoleProved','cfgTestProved','namespaceAuthority','runtimeAuthority'])assert.equal(facts[key],false,key);}
function errorOf(action){try{return {value:action()};}catch(error){return {error:{name:error.name,message:error.message}};}}

function unit(row,request=domain()){const invocation=issue(row,request),token=captureOriginalNormalDependencyUnit(invocation.token,row.parser,invocation.options),facts=originalNormalDependencyUnitObligations(token,invocation.token,row.parser,invocation.options);return {invocation,token,facts};}
function noUnitAuthority(facts){for(const key of ['normalizationComplete','unitRoleProved','cfgTestProved','devDependenciesExcluded','namespaceAuthority','runtimeAuthority','nativeParity','actualEnvironmentObserved','actualConfigurationObserved'])assert.equal(facts[key],false,key);assert.equal(facts.configuredProfile,null);assert.equal(facts.conditionalTypedModeTransfer.preconditionsStatus,'open');}
function freshLeaf(name,{profile=null}={}){
 const origin=new URL('../'+name,import.meta.url),source=readFileSync(origin,'utf8'),matches=[...source.matchAll(/^import\b[^\n]*?\bfrom\s+(['"])([^'"\n]+)\1;/gmu)],changes=[];assert.equal(matches.length,[...source.matchAll(/^import\b/gmu)].length);
 for(const match of matches){if(!match[2].startsWith('.'))continue;const original=match[1]+match[2]+match[1],start=match.index+match[0].lastIndexOf(original);changes.push({start,end:start+original.length,original,replacement:JSON.stringify(new URL(match[2],origin).href)});}
 if(profile){const original="new URL('./source-profiles/cargo-normal-dependency-unit/',import.meta.url)",start=source.indexOf(original);assert.ok(start>=0);assert.equal(source.indexOf(original,start+1),-1);changes.push({start,end:start+original.length,original,replacement:'new URL('+JSON.stringify(pathToFileURL(profile+'/').href)+')'});}
 changes.sort((a,b)=>a.start-b.start);let copied=source;for(const change of [...changes].reverse())copied=copied.slice(0,change.start)+change.replacement+copied.slice(change.end);let rebuilt=copied,delta=0;const relocations=[];for(const change of changes){relocations.push({...change,copiedStart:change.start+delta,copiedEnd:change.start+delta+change.replacement.length});delta+=change.replacement.length-(change.end-change.start);}for(const change of [...relocations].reverse()){assert.equal(rebuilt.slice(change.copiedStart,change.copiedEnd),change.replacement);rebuilt=rebuilt.slice(0,change.copiedStart)+change.original+rebuilt.slice(change.copiedEnd);}assert.equal(rebuilt,source);
 const path=join(temporary,String(freshLeaf.serial++)+'-'+name);writeFileSync(path,copied,{flag:'wx'});assert.equal(readFileSync(path,'utf8'),copied);return {path,origin:origin.href,source,copied,relocations};
}
freshLeaf.serial=0;
function freshPackageGraph(){
 const names=['extensions/external-trait-sources.mjs','private-cargo-toml.mjs','cargo-invocation-plan.mjs','cargo-normal-dependency-unit.mjs'],files=new Map(names.map(name=>{const origin=new URL('../'+name,import.meta.url).href,path=join(temporary,String(freshLeaf.serial++)+'-package-'+name.replaceAll('/','_'));return [origin,{name,path,url:pathToFileURL(path).href}];})),copies=[];
 for(const [origin,file]of files){const source=readFileSync(new URL(origin),'utf8'),changes=[],matches=[...source.matchAll(/^import\b[^\n]*?\bfrom\s+(['"])([^'"\n]+)\1;/gmu)];assert.equal(matches.length,[...source.matchAll(/^import\b/gmu)].length);
  for(const match of matches){if(!match[2].startsWith('.'))continue;const original=match[1]+match[2]+match[1],start=match.index+match[0].lastIndexOf(original),target=new URL(match[2],origin).href;changes.push({start,end:start+original.length,original,replacement:JSON.stringify(files.get(target)?.url??target)});}
  for(const match of source.matchAll(/import\.meta\.url/gu))changes.push({start:match.index,end:match.index+match[0].length,original:match[0],replacement:JSON.stringify(origin)});
  changes.sort((a,b)=>a.start-b.start);for(let at=1;at<changes.length;at++)assert.ok(changes[at-1].end<=changes[at].start);let copied=source;for(const change of [...changes].reverse())copied=copied.slice(0,change.start)+change.replacement+copied.slice(change.end);
  let delta=0,rebuilt=copied;const relocations=changes.map(change=>{const value={...change,copiedStart:change.start+delta,copiedEnd:change.start+delta+change.replacement.length};delta+=change.replacement.length-(change.end-change.start);return value;});
  for(const change of [...relocations].reverse()){assert.equal(rebuilt.slice(change.copiedStart,change.copiedEnd),change.replacement);rebuilt=rebuilt.slice(0,change.copiedStart)+change.original+rebuilt.slice(change.copiedEnd);}assert.equal(rebuilt,source);writeFileSync(file.path,copied,{flag:'wx'});assert.equal(readFileSync(file.path,'utf8'),copied);copies.push({...file,origin,source,copied,relocations});
 }return {copies,files};
}


test('complete source-bound mode bodies distinguish root Test from conditional dependency Build without inventing a child cfg proof',{timeout:60000},()=>{
 const observations=[];
 for(const [command,mode,testFlag]of [['build','Build',false],['check','Check',false],['test','Test',true]]){
  const row=frame(compilationProfile({flags:{test:testFlag}})),result=unit(row,domain(command));noUnitAuthority(result.facts);
  assert.equal(result.facts.invocation.rootMode,mode);assert.equal(result.facts.invocation.root.compilationProfile.flags.test,testFlag);
  assert.deepEqual(result.facts.conditionalTypedModeTransfer.child,command==='check'?{mode:'Check',test:false}:{mode:'Build'});assert.equal(result.facts.conditionalTypedModeTransfer.rootCfgInherited,false);
  const refused=errorOf(()=>requireOriginalNormalDependencyUnit(result.token,result.invocation.token,row.parser,result.invocation.options));assert.match(refused.error?.message,/manifest deserialization.*unproved/);observations.push({row,result,refused});
 }
 const rawVariants=[{flags:{test:false}},compilationProfile({flags:{test:false}}),{closedKeys:[],values:{},flags:{test:false},schemaVersion:1}];
 const rawObservations=[];for(const raw of rawVariants){const row=frame(raw),configured=row.parser.compilationProfile;row.parser.compilationProfile=raw;assert.equal(row.parser.compilationProfile,raw);const result=unit(row);rawObservations.push({raw,configured,actualRawIdentity:row.parser.compilationProfile===raw,row,result});noUnitAuthority(result.facts);assert.equal(JSON.stringify(result.facts.invocation.root.compilationProfile),JSON.stringify(compilationProfile(raw)));}
 const reorderedDomain=Object.fromEntries(Object.entries(domain()).reverse()),domainRow=frame(),domainResult=unit(domainRow,reorderedDomain);rawObservations.push({kind:'complete-reordered-domain',domainRow,reorderedDomain,domainResult});noUnitAuthority(domainResult.facts);assert.deepEqual(Object.keys(reorderedDomain),Object.keys(domain()).reverse());
 retain('01-full-raw-canonical-reordered-profile-ingress',rawObservations);
 retain('01-full-three-root-modes-conditional-transfer-and-refusals',observations);
});

test('all thirty-nine package originals six dev dependencies and unknown cfg branches remain inputs while normalization is open',{timeout:60000},()=>{
 const row=frame(compilationProfile({flags:{test:true},values:{feature:['unknown-retained-feature']}})),result=unit(row,domain('test')),facts=result.facts;
 retain('02-full-package-dev-source-and-open-normalization',{row,result});noUnitAuthority(facts);assert.equal(facts.originalPackage.sources.length,39);assert.equal(Object.keys(facts.rawManifestBoundary.devDependencies).length,6);
 assert.ok(facts.originalPackage.sources.some(source=>source.path==='src/engine/tests.rs'));assert.ok(facts.sourceProgram.obligations.some(obligation=>obligation.id==='cargo.manifest-deserialization-and-normalization'&&obligation.status==='open'));
 assert.equal(facts.invocation.root.compilationProfile.values.feature[0],'unknown-retained-feature');assert.equal(facts.configuredProfile,null);assert.equal(facts.devDependenciesExcluded,false);
});

test('complete original constructors fields aliases and source bodies are retained and changed archive or registry bytes cannot reissue',{timeout:60000},async()=>{
 const program=originalCargoUnitSourceProgram();assert.equal(assertOriginalCargoUnitSourceProgram(program),program);assert.equal(program.sources.length,17);assert.equal(program.sources.reduce((count,row)=>count+row.bytes,0),696289);
 for(const name of ['TomlDetailedDependency','TomlTarget','default','proc_macro','crate_types','normalized_build','deserialize_toml','normalize_toml','new_override','intern','build_base_args','build_session_options','is_test_crate'])assert.ok(program.selections.some(row=>row.name===name),name);
 for(const row of program.selections){const source=program.sources.find(origin=>origin.sourcePath===row.path);assert.equal(source.source.slice(row.span.start,row.span.end),row.original);if(row.enclosing)assert.equal(source.source.slice(row.enclosing.span.start,row.enclosing.span.end),row.enclosing.original);}
 const sourceRoot=new URL('../source-profiles/cargo-normal-dependency-unit/',import.meta.url),profile=join(temporary,'copied-complete-profile');mkdirSync(profile);const manifest=readFileSync(new URL('manifest.json',sourceRoot)),registry=JSON.parse(manifest);writeFileSync(join(profile,'manifest.json'),manifest,{flag:'wx'});
 for(const row of registry.sources){const path=join(profile,row.archive);mkdirSync(dirname(path),{recursive:true});copyFileSync(new URL(row.archive,sourceRoot),path);}
 const leaf=freshLeaf('cargo-unit-source-semantics.mjs',{profile});retain('03-complete-original-program-and-physical-profile-before-import',{program,registry,leaf});const isolated=await import(pathToFileURL(leaf.path).href),issued=isolated.originalCargoUnitSourceProgram();
 const from=Buffer.from,toString=Object.getOwnPropertyDescriptor(Buffer.prototype,'toString'),define=Object.defineProperty,apply=Reflect.apply,equals=Buffer.prototype.equals;
 const textControls=[];for(const target of [registry.sources.find(row=>row.sourcePath==='src/cargo/core/compiler/unit_dependencies.rs'),{archive:'manifest.json',sha256:program.profileSha256}]){
  const raw=target.archive==='manifest.json'?manifest:Buffer.from(program.sources.find(row=>row.sourcePath===target.sourcePath).source,'utf8'),original=apply(toString.value,raw,['utf8']),forged=(original[0]===' '?'!':' ')+original.slice(1);let calls=0,outcome;
  try{define(Buffer.prototype,'toString',{...toString,value(...args){if(args[0]==='utf8'&&apply(equals,this,[raw])){calls++;return forged;}return apply(toString.value,this,args);}});outcome=errorOf(()=>isolated.originalCargoUnitSourceProgram());}finally{define(Buffer.prototype,'toString',toString);}
  textControls.push({target,original,forged,calls,outcome});
 }
 retain('03-full-selective-source-and-registry-decoding-controls',textControls);for(const result of textControls){assert.ok(result.calls>0);assert.match(result.outcome.error?.message,/complete decoded source text differs/);}
 const lone=errorOf(()=>revalidateOriginalCargoSourceText('\ud800',3,createHash('sha256').update('\ufffd').digest('hex'))),boxed=errorOf(()=>revalidateOriginalCargoSourceText(Object('source'),6,'0'.repeat(64)));retain('03-full-unpaired-and-boxed-source-refusals',{lone,boxed});assert.equal(lone.error?.name,'TypeError');assert.equal(boxed.error?.name,'TypeError');
 const graph=freshPackageGraph();retain('03-full-fresh-package-graph-before-import',{graph:{copies:graph.copies},textControls,lone,boxed});
 const external=await import(graph.files.get(new URL('../extensions/external-trait-sources.mjs',import.meta.url).href).url),planner=await import(graph.files.get(new URL('../cargo-invocation-plan.mjs',import.meta.url).href).url),consumer=await import(graph.files.get(new URL('../cargo-normal-dependency-unit.mjs',import.meta.url).href).url);
 const actual=originalExternalTraitPackageInputs(packageToken),originalRoot=actual.sources.find(row=>row.path===actual.crateRoot),originalText=originalRoot.source,rawRoot=from(originalText,'utf8'),forgedRoot=(originalText[0]===' '?'!':' ')+originalText.slice(1),fromField=Object.getOwnPropertyDescriptor(Buffer,'from');let forgedToken,captureResult,decodeCalls=0,encodeCalls=0;
 retain('03-original-and-crafted-package-root-before-capture',{actual,originalRoot,originalText,forgedRoot});
 try{
  define(Buffer.prototype,'toString',{...toString,value(...args){if(args[0]==='utf8'&&apply(equals,this,[rawRoot])){decodeCalls++;return forgedRoot;}return apply(toString.value,this,args);}});
  define(Buffer,'from',{...fromField,value(...args){if(args[0]===forgedRoot){encodeCalls++;return apply(from,Buffer,[originalText,...args.slice(1)]);}return apply(from,Buffer,args);}});
  captureResult=errorOf(()=>external.captureOriginalExternalTraitPackage(dependencies,'base64'));forgedToken=captureResult.value;
 }finally{define(Buffer.prototype,'toString',toString);define(Buffer,'from',fromField);}
 retain('03-legacy-capture-full-result-before-assertions',{captureResult,decodeCalls,encodeCalls});assert.equal(captureResult.error,undefined);
 const forgedInputs=external.originalExternalTraitPackageInputs(forgedToken),forgedRow=forgedInputs.sources.find(row=>row.path===actual.crateRoot),row=frame(),options={packageToken:forgedToken,domain:domain()},planResult=errorOf(()=>planner.planOriginalCargoInvocation(row.parser,options));retain('03-crafted-package-plan-result-before-assertion',{planResult,forgedInputs});assert.equal(planResult.error,undefined);const planned=planResult.value,packageRefusal=errorOf(()=>consumer.captureOriginalNormalDependencyUnit(planned,row.parser,options));
 retain('03-complete-crafted-private-package-decode-refusal',{graph:{copies:graph.copies},actual,originalRoot,originalText,forgedRoot,forgedInputs,forgedRow,decodeCalls,encodeCalls,packageRefusal,textControls,lone,boxed});
 assert.ok(decodeCalls>0);assert.ok(encodeCalls>0);assert.equal(forgedRow.source,forgedRoot);assert.equal(forgedRow.sha256,originalRoot.sha256);assert.equal(forgedRow.bytes,originalRoot.bytes);assert.notEqual(createHash('sha256').update(forgedRoot).digest('hex'),forgedRow.sha256);assert.match(packageRefusal.error?.message,/complete decoded source text differs/);
 const archive=join(profile,registry.sources.find(row=>row.encoding==='gzip').archive),before=readFileSync(archive),changed=Buffer.from(before);changed[changed.length-1]^=1;let archiveRefusal,registryRefusal,staleRefusal;
 try{writeFileSync(archive,changed);archiveRefusal=errorOf(()=>isolated.originalCargoUnitSourceProgram());}finally{writeFileSync(archive,before);}
 staleRefusal=errorOf(()=>isolated.assertOriginalCargoUnitSourceProgram(issued));
 try{writeFileSync(join(profile,'manifest.json'),Buffer.concat([manifest,Buffer.from(' ')]));registryRefusal=errorOf(()=>isolated.originalCargoUnitSourceProgram());}finally{writeFileSync(join(profile,'manifest.json'),manifest);}
 retain('03-full-archive-registry-and-old-identity-refusals',{before:before.toString('base64'),changed:changed.toString('base64'),archiveRefusal,registryRefusal,staleRefusal});for(const result of [archiveRefusal,registryRefusal,staleRefusal])assert.equal(result.error?.name,'TypeError');
 assert.equal(isolated.originalCargoUnitSourceProgram().normalizationComplete,false);
 const ancestorIssued=isolated.originalCargoUnitSourceProgram(),ancestor=dirname(archive),retainedDirectory=ancestor+'.retained-original-directory',beforeDirectory=lstatSync(ancestor);let moved=false,linked=false,ancestorRefusal,freshAncestorRefusal,during;
 try{renameSync(ancestor,retainedDirectory);moved=true;symlinkSync(retainedDirectory,ancestor,'dir');linked=true;const stat=lstatSync(ancestor);during={symbolicLink:stat.isSymbolicLink(),dev:stat.dev,ino:stat.ino,mode:stat.mode};ancestorRefusal=errorOf(()=>isolated.assertOriginalCargoUnitSourceProgram(ancestorIssued));freshAncestorRefusal=errorOf(()=>isolated.originalCargoUnitSourceProgram());}
 finally{if(linked)unlinkSync(ancestor);if(moved)renameSync(retainedDirectory,ancestor);}
 const afterDirectory=lstatSync(ancestor);retain('03-full-renamed-ancestor-symlink-control-and-restoration',{ancestor,retainedDirectory,before:{dev:beforeDirectory.dev,ino:beforeDirectory.ino,mode:beforeDirectory.mode},during,after:{dev:afterDirectory.dev,ino:afterDirectory.ino,mode:afterDirectory.mode},ancestorRefusal,freshAncestorRefusal});
 assert.equal(during.symbolicLink,true);assert.match(ancestorRefusal.error?.message,/source directory identity changed/);assert.match(freshAncestorRefusal.error?.message,/linked source directory/);assert.equal(afterDirectory.ino,beforeDirectory.ino);assert.equal(isolated.originalCargoUnitSourceProgram().normalizationComplete,false);
});

test('copied programs tokens plans and foreign parser options cannot replay a private pending unit',{timeout:60000},()=>{
 const row=frame(),other=frame(),result=unit(row),observations=[];
 for(const token of [{},structuredClone(result.token),structuredClone(result.facts)]){const error=errorOf(()=>originalNormalDependencyUnitObligations(token,result.invocation.token,row.parser,result.invocation.options));assert.equal(error.error?.name,'TypeError');observations.push(error);}
 for(const [plan,parser,options]of [[structuredClone(result.invocation.token),row.parser,result.invocation.options],[result.invocation.token,other.parser,result.invocation.options],[result.invocation.token,row.parser,{...result.invocation.options}]]){const error=errorOf(()=>originalNormalDependencyUnitObligations(result.token,plan,parser,options));assert.equal(error.error?.name,'TypeError');observations.push(error);}
 assert.throws(()=>assertOriginalCargoUnitSourceProgram(structuredClone(result.facts.sourceProgram)),/copied or foreign/);assert.throws(()=>captureOriginalNormalDependencyUnit(null,row.parser,result.invocation.options),TypeError);
 const raw={schemaVersion:1,flags:{test:false},values:{feature:['z-retained','a-retained']},closedKeys:[]},rawRow=frame(raw),configured=rawRow.parser.compilationProfile;rawRow.parser.compilationProfile=raw;assert.equal(rawRow.parser.compilationProfile,raw);assert.deepEqual(configured.values.feature,['a-retained','z-retained']);retain('04-full-actual-raw-profile-before-issue',{raw,configured,actualRawIdentity:rawRow.parser.compilationProfile===raw,actualProfile:rawRow.parser.compilationProfile});const rawResult=unit(rawRow),initial=rawRow.parser.compilationProfile,profiles=[];
 const reordered={closedKeys:[],values:{feature:['z-retained','a-retained']},flags:{test:false},schemaVersion:1};
 try{rawRow.parser.compilationProfile=reordered;const facts=originalNormalDependencyUnitObligations(rawResult.token,rawResult.invocation.token,rawRow.parser,rawResult.invocation.options);profiles.push({kind:'same-raw-fields-reordered-object-keys',raw:reordered,facts});noUnitAuthority(facts);}finally{rawRow.parser.compilationProfile=initial;}
 for(const [kind,changed]of [['stale-test',{...raw,flags:{test:true}}],['extra-field',{...raw,unsupported:true}],['positional-array',{...raw,values:{feature:['a-retained','z-retained']}}]]){
  let outcome;try{rawRow.parser.compilationProfile=changed;outcome=errorOf(()=>originalNormalDependencyUnitObligations(rawResult.token,rawResult.invocation.token,rawRow.parser,rawResult.invocation.options));}finally{rawRow.parser.compilationProfile=initial;}
  const restored=originalNormalDependencyUnitObligations(rawResult.token,rawResult.invocation.token,rawRow.parser,rawResult.invocation.options);profiles.push({kind,changed,outcome,restored});retain('04-full-raw-profile-'+kind,profiles.at(-1));assert.equal(outcome.error?.name,'TypeError');noUnitAuthority(restored);
 }
 retain('04-full-raw-profile-reordered-restored-and-stale-controls',{rawRow,rawResult,profiles});
 retain('04-full-copy-foreign-and-absent-plan-refusals',{row,other,result,observations});
});

test('root test contradictions self selection examples bench and extra cfg remain refusals independent of conditional child mode',{timeout:60000},()=>{
 const observations=[];
 for(const [command,testFlag]of [['test',false],['build',true],['check',true]]){const row=frame(compilationProfile({flags:{test:testFlag}})),invocation=issue(row,domain(command)),result=errorOf(()=>captureOriginalNormalDependencyUnit(invocation.token,row.parser,invocation.options));assert.match(result.error?.message,/root test profile contradicts/);observations.push({row,invocation,result});}
 const row=frame();for(const argv of [['cargo','test','--package','base64','--lib'],['cargo','test','--package','link-assistant-router','--examples'],['cargo','bench','--package','link-assistant-router','--lib']]){const result=errorOf(()=>issue(row,{...domain(),argv}));assert.equal(result.error?.name,'TypeError');observations.push({argv,result});}
 const result=errorOf(()=>issue(row,{...domain(),rustflags:['--cfg=test']}));assert.equal(result.error?.name,'TypeError');observations.push(result);
 const substituted={...domain()};delete substituted.rustflags;substituted.unknownFlags=[];const substitution=errorOf(()=>issue(row,substituted));observations.push({kind:'same-count-substituted-domain-key',keys:Reflect.ownKeys(substituted),substitution});assert.equal(substitution.error?.name,'TypeError');
 const define=Object.defineProperty,request=domain(),field=Object.getOwnPropertyDescriptor(request,'rustflags');let calls=0,accessor;try{define(request,'rustflags',{get(){calls++;throw Error('domain accessor must not execute');},enumerable:true,configurable:true});accessor=errorOf(()=>issue(row,request));}finally{define(request,'rustflags',field);}observations.push({kind:'same-count-domain-accessor',accessor,calls});retain('05-all-root-role-and-injection-refusals',observations);assert.equal(calls,0);assert.equal(accessor.error?.name,'TypeError');
});

test('all original source hash inputs are observable and mid-reissue domain mutation cannot publish stale pending facts',{timeout:60000},()=>{
 const row=frame(),invocation=issue(row),token=captureOriginalNormalDependencyUnit(invocation.token,row.parser,invocation.options),descriptor=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),apply=Reflect.apply,tape=[];let mutated=false,result;
 try{Object.defineProperty(Hash.prototype,'update',{...descriptor,value(value,...args){const output=apply(descriptor.value,this,[value,...args]);const bytes=Buffer.from(value,typeof args[0]==='string'?args[0]:undefined);tape.push({bytes:bytes.toString('base64'),encoding:args[0]??null});if(!mutated&&bytes.includes(Buffer.from('fn check_or_build_mode'))){mutated=true;invocation.options.domain.argv[1]='test';}return output;}});result=errorOf(()=>originalNormalDependencyUnitObligations(token,invocation.token,row.parser,invocation.options));}finally{Object.defineProperty(Hash.prototype,'update',descriptor);invocation.options.domain.argv[1]='build';}
 retain('06-complete-hash-tape-and-mid-reissue-refusal',{row,invocation,tape,mutated,result});assert.equal(mutated,true);assert.equal(result.error?.name,'TypeError');assert.ok(tape.some(row=>Buffer.from(row.bytes,'base64').includes(Buffer.from('pub fn is_test_crate'))));
 noUnitAuthority(originalNormalDependencyUnitObligations(token,invocation.token,row.parser,invocation.options));
 const define=Object.defineProperty,fieldOf=Object.getOwnPropertyDescriptor,hookControls=[];
 for(const [owner,key]of [[JSON,'parse'],[Object,'getOwnPropertyDescriptor']]){
  const field=fieldOf(owner,key),update=fieldOf(Hash.prototype,'update');let calls=0,installed=false,outcome;
  try{
   define(Hash.prototype,'update',{...update,value(value,...args){const output=apply(update.value,this,[value,...args]);if(!installed&&Buffer.from(value).includes(Buffer.from('complete-cargo-normal-dependency-unit-source-profile-v1'))){installed=true;define(owner,key,{...field,value(){calls++;throw Error('must not enter installed '+key);}});}return output;}});
   outcome=errorOf(()=>originalNormalDependencyUnitObligations(token,invocation.token,row.parser,invocation.options));
  }finally{define(owner,key,field);define(Hash.prototype,'update',update);}
  hookControls.push({key,calls,installed,outcome});
 }
 retain('06-full-hash-installed-parse-and-reflection-guard-controls',hookControls);for(const result of hookControls){assert.equal(result.installed,true);assert.equal(result.calls,0);assert.equal(result.outcome.error?.name,'TypeError');}
});

test('cold and live reflection weak-map proxy accessor and restoration controls execute zero caller hooks',{timeout:60000},async()=>{
 const row=frame(),result=unit(row),descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,observations=[];let calls=0;
 for(const options of [new Proxy(result.invocation.options,{ownKeys(){calls++;throw Error('proxy options');}}),Object.defineProperty({...result.invocation.options},'domain',{get(){calls++;throw Error('getter options');}})]){const outcome=errorOf(()=>captureOriginalNormalDependencyUnit(result.invocation.token,row.parser,options));assert.equal(outcome.error?.name,'TypeError');assert.equal(calls,0);observations.push(outcome);}
 for(const [owner,key]of [[WeakMap.prototype,'get'],[WeakMap.prototype,'set'],[Object,'getOwnPropertyDescriptor'],[Object,'getPrototypeOf'],[Reflect,'ownKeys']]){const before=descriptor(owner,key),outcomes=[];try{define(owner,key,{...before,value(){calls++;throw Error('new native callback');}});outcomes.push(errorOf(()=>originalNormalDependencyUnitObligations(result.token,result.invocation.token,row.parser,result.invocation.options)));}finally{define(owner,key,before);}assert.equal(calls,0);assert.equal(outcomes[0].error?.name,'TypeError');observations.push({key,outcomes});}
 const profileField=descriptor(row.parser,'compilationProfile');let profileGetter,profileCapture;try{define(row.parser,'compilationProfile',{...profileField,value:undefined});define(row.parser,'compilationProfile',{get(){calls++;throw Error('late parser profile getter must not execute');},enumerable:profileField.enumerable,configurable:true});profileGetter=errorOf(()=>originalNormalDependencyUnitObligations(result.token,result.invocation.token,row.parser,result.invocation.options));profileCapture=errorOf(()=>captureOriginalNormalDependencyUnit(result.invocation.token,row.parser,result.invocation.options));}finally{define(row.parser,'compilationProfile',profileField);}retain('07-full-own-parser-profile-accessor-refusal',{profileGetter,profileCapture,calls});assert.equal(profileGetter.error?.name,'TypeError');assert.equal(profileCapture.error?.name,'TypeError');assert.equal(calls,0);noUnitAuthority(originalNormalDependencyUnitObligations(result.token,result.invocation.token,row.parser,result.invocation.options));
 const leaf=freshLeaf('cargo-normal-dependency-unit.mjs');retain('07-full-physical-leaf-and-live-controls-before-import',{leaf,row,result,observations,calls});const before=descriptor(WeakMap.prototype,'get');let cold;
 try{define(WeakMap.prototype,'get',{...before,value(){calls++;throw Error('cold native callback');}});cold=await import(pathToFileURL(leaf.path).href);}finally{define(WeakMap.prototype,'get',before);}
 const refused=errorOf(()=>cold.captureOriginalNormalDependencyUnit(result.invocation.token,row.parser,result.invocation.options));retain('07-sticky-cold-refusal-after-restoration',{refused,calls,distinct:cold.captureOriginalNormalDependencyUnit!==captureOriginalNormalDependencyUnit});assert.equal(calls,0);assert.match(refused.error?.message,/qualified original source operations changed/);assert.notEqual(cold.captureOriginalNormalDependencyUnit,captureOriginalNormalDependencyUnit);
 noUnitAuthority(originalNormalDependencyUnitObligations(result.token,result.invocation.token,row.parser,result.invocation.options));
 const profile=fileURLToPath(new URL('../source-profiles/cargo-normal-dependency-unit/',import.meta.url)),sourceLeaf=freshLeaf('cargo-unit-source-semantics.mjs',{profile}),parseField=descriptor(JSON,'parse');let coldSource,coldParseCalls=0;
 retain('07-full-physical-JSON-source-reader-before-import',{sourceLeaf});
 try{define(JSON,'parse',{...parseField,value(){coldParseCalls++;throw Error('cold source parser must not execute');}});coldSource=await import(pathToFileURL(sourceLeaf.path).href);}finally{define(JSON,'parse',parseField);}
 const parseRefusal=errorOf(()=>coldSource.originalCargoUnitSourceProgram());retain('07-sticky-cold-native-parse-refusal',{parseRefusal,coldParseCalls,distinct:coldSource.originalCargoUnitSourceProgram!==originalCargoUnitSourceProgram});assert.equal(coldParseCalls,0);assert.match(parseRefusal.error?.message,/qualified source operations changed/);assert.notEqual(coldSource.originalCargoUnitSourceProgram,originalCargoUnitSourceProgram);
});

test('complete source evidence serializes and reparses while independent executable JS and strict TypeScript retain original behavior',{timeout:60000},async()=>{
 const row=frame(),result=unit(row),program=result.facts.sourceProgram,evidence=program.serializedCheckedEvidence;
 assert.deepEqual(JSON.parse(evidence.wire),evidence.reparsed);assert.deepEqual(evidence.reparsed.rules.map(rule=>rule.id),['cargo.complete-check-or-build-mode.v1','cargo.complete-is-any-test.v1','rust.complete-session-test-projection.v1']);
 const translation=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>row.source,cargoManifest:cargo.manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}),values=[];
 assert.deepEqual(JSON.parse(JSON.stringify(translation.meta.checkedSemanticProgram)),translation.meta.checkedSemanticProgram);retain('08-full-original-source-program-and-checked-meta',{row,result,translation});
 try{await verifyTypedTargets(translation,api=>{assert.equal(api.choose(false),-6n);assert.equal(api.choose(true),23n);values.push([-6,23]);},{childTimeoutMs:20000});}finally{retain('08-full-independent-target-results',values);}assert.equal(values.length,2);noUnitAuthority(result.facts);
});
