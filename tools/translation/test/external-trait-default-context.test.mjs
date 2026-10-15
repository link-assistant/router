import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {captureOriginalExternalTraitDefaultContext,requireOriginalExternalTraitDefaultContext} from '../extensions/external-trait-default-context.mjs';
import {originalExternalTraitClosure,captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {originalAnonymousTraitScope} from '../extensions/primitive-anonymous-traits.mjs';
import {captureSourceConversionScope} from '../extensions/source-conversion-scope.mjs';
import {capturePrimitiveBoolFromScope} from '../extensions/primitive-bool-from-source.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {PRODUCTION_PROFILE,compilationProfile,evaluateConfiguration} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {rustFixedType} from '../checked-types.mjs';

const root=new URL('../../../',import.meta.url),base=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const cargo={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},dependencies=loadDeriveDependencyProof(cargo),path=['base64','Engine'];
const caller='use base64::Engine as _;pub fn flag(v:bool)->u64{u64::from(v)}pub fn identity(v:u8)->u8{v.into()}';
const directory=realpathSync(mkdtempSync(join(tmpdir(),'router-external-default-context-')));after(()=>rmSync(directory,{recursive:true,force:true}));
function retain(name,value){const output=process.env.ROUTER_EXTERNAL_DEFAULT_CONTEXT_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json.gz'),gzipSync(JSON.stringify(value)+'\n'),{flag:'wx'});}}
function frame(source=caller,profile=null){
 const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file,compilationProfile:profile}),modules=capture.views.map(sourceView=>({source,file,path:[...sourceView.modulePath],sourceView,compilationProfile:profile,configurationCondition:sourceView.configurationCondition})),context=createMatchesMacroContext({modules,deriveDependencies:dependencies,compilationProfile:profile}),parser=new HostRustParser(tokenizeRust(source));
 parser.compilationProfile=profile;configureMatchesMacroParser(parser,context,{file});const state=matchesParserFacts(parser);return {source,profile,capture,modules,context,parser,state};
}
function proof(row,selected=path){const token=captureOriginalExternalTraitDefaultContext(row.parser,selected),value=originalExternalTraitClosure(dependencies,selected,token);return {token,value};}
function noAuthority(value){for(const key of ['attributeOwnerResolved','stdPreludeAuthority','namespaceAuthority','runtimeAuthority'])assert.equal(value[key],false,key);}
function errorOf(action){try{return {value:action()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function relocatedLeaf(source,origin){
 const imports=[...source.matchAll(/^import\b[^\n]*?\bfrom\s+(['"])([^'"\n]+)\1;/gmu)],changes=[];assert.equal(imports.length,[...source.matchAll(/^import\b/gmu)].length);
 for(const match of imports){if(!match[2].startsWith('.'))continue;const original=match[1]+match[2]+match[1],start=match.index+match[0].lastIndexOf(original);changes.push({start,end:start+original.length,original,replacement:JSON.stringify(new URL(match[2],origin).href)});}
 for(const match of source.matchAll(/\bimport\.meta\.url\b/gu))changes.push({start:match.index,end:match.index+match[0].length,original:match[0],replacement:JSON.stringify(origin.href)});
 changes.sort((left,right)=>left.start-right.start);let copied='',cursor=0;const relocations=[];
 for(const change of changes){assert.ok(change.start>=cursor);assert.equal(source.slice(change.start,change.end),change.original);copied+=source.slice(cursor,change.start);const copiedStart=copied.length;copied+=change.replacement;relocations.push({...change,copiedStart,copiedEnd:copied.length});cursor=change.end;}copied+=source.slice(cursor);
 let restored=copied;for(const change of [...relocations].reverse()){assert.equal(restored.slice(change.copiedStart,change.copiedEnd),change.replacement);restored=restored.slice(0,change.copiedStart)+change.original+restored.slice(change.copiedEnd);}assert.equal(restored,source);return {source,copied,relocations,completeReverseReadback:true};
}

test('genuine parser Cargo and all package originals refine one exact unknown crate-root predicate with std only',{timeout:60000},()=>{
 const row=frame(),originals=originalExternalTraitPackageInputs(captureOriginalExternalTraitPackage(dependencies,'base64')),observations=[];assert.equal(originals.sources.length,39);
 for(const selected of [path,['base64','engine','Engine']]){
  const legacy=originalExternalTraitClosure(dependencies,selected),current=proof(row,selected),projection=requireOriginalExternalTraitDefaultContext(current.token,dependencies,selected),refinement=projection.refinement;assert.deepEqual(current.value.originalDefaultNamespace,projection.evidence);
  retain('01-route-'+selected.length,{row,originals,legacy,current,projection});assert.deepEqual(current.value.declaration,legacy.declaration);assert.deepEqual(projection.features,['std']);assert.deepEqual(projection.defaults.positiveFeatures,['alloc','simd-unsafe','std']);assert.equal(projection.defaults.rootManifest,cargo.manifest);assert.equal(projection.defaults.rootLock,cargo.lock);assert.equal(projection.source,originals.sources.find(source=>source.path===originals.crateRoot));
  assert.equal(refinement.before.value,null);assert.equal(refinement.after.value,false);assert.deepEqual(refinement.before.diagnostics,[]);assert.deepEqual(refinement.after.diagnostics,[]);assert.equal(refinement.original,projection.source.source.slice(refinement.item.start,refinement.item.end));assert.equal(refinement.observation.original,projection.source.source.slice(refinement.observation.span.start,refinement.observation.span.end));assert.deepEqual(refinement.payload.map(row=>row.tokens),[['no_std']]);assert.equal(refinement.condition.attributes[0].evaluation.expansion,'absent');noAuthority(projection);assert.equal(current.value.wholeTraitAuthority,false);assert.equal(current.value.runtimeParity,false);observations.push(current);
 }
 retain('01-complete-both-routes-and-originals',{row,originals,observations});
});

test('both actual conversion consumers use the real parser context and preserve checked JS and strict TypeScript behavior',{timeout:60000},async()=>{
 const row=frame(caller,PRODUCTION_PROFILE),bool=capturePrimitiveBoolFromScope(row.parser,{...rustFixedType('u64'),rustPrimitiveName:'u64'},caller.indexOf('u64::from')),conversion=captureSourceConversionScope(row.parser,caller.indexOf('into'));
 for(const declarations of [bool.anonymousOriginalTraits,conversion.anonymousTraits]){assert.equal(declarations.length,1);const declaration=declarations[0].declaration;assert.ok(declaration.originalDefaultNamespace);noAuthority(declaration.originalDefaultNamespace);assert.equal(declaration.originalDefaultNamespace.refinement.after.value,false);assert.equal(declaration.originalMemberNames.some(member=>member.name==='from'||member.name==='into'),false);}
 const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>caller,cargoManifest:cargo.manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});retain('02-complete-real-consumers-and-checked-program',{row,bool,conversion,caller,result});assert.deepEqual(result.meta.refused.filter(item=>item.term==='fn'),[]);assert.deepEqual(result.meta.refused.map(item=>item.term),['use']);assert.deepEqual(JSON.parse(JSON.stringify(result.meta.checkedSemanticProgram)),result.meta.checkedSemanticProgram);
 const observations=[];try{await verifyTypedTargets(result,api=>{assert.equal(api.flag(false),0n);assert.equal(api.flag(true),1n);for(const value of [0n,1n,127n,255n])assert.equal(api.identity(value),value);for(const value of [-1n,256n,1,null,{}])assert.throws(()=>api.identity(value));observations.push({flags:[api.flag(false).toString(),api.flag(true).toString()],identity:api.identity(255n).toString()});},{childTimeoutMs:20000});}finally{retain('02-full-independent-target-results',observations);}assert.equal(observations.length,2);
});

test('root test OS and target alternatives do not become dependency flags or closed feature knowledge',{timeout:60000},()=>{
 const observations=[];
 for(const profile of [null,PRODUCTION_PROFILE,compilationProfile({flags:{test:true,unix:true},values:{target_arch:['x86_64']}})]){
  const row=frame(caller,profile),current=proof(row),projection=requireOriginalExternalTraitDefaultContext(current.token,dependencies,path);noAuthority(projection);assert.equal(projection.refinement.before.value,null);assert.equal(projection.refinement.after.value,false);assert.deepEqual(projection.defaults.project.compilationProfile,profile);for(const key of ['closedFeatureKey','testConfigurationProved','operatingSystemProved','dependencyUnitRoleProved'])assert.equal(projection.defaults[key],false,key);
  assert.ok(projection.observed.conditions.some(condition=>condition.original==='test'&&condition.evaluation.value===null));observations.push({row,current,projection});
 }
 assert.deepEqual(observations[0].current.value.declaration,observations[2].current.value.declaration);const overridden=frame(caller,compilationProfile({values:{feature:['std']}}));assert.throws(()=>captureOriginalExternalTraitDefaultContext(overridden.parser,path),/feature override/);retain('03-full-root-profile-alternatives',{observations,overridden});
});

test('copied foreign replaced and callback-mutated genuine parser frames cannot replay the optional private context',{timeout:60000},()=>{
 const row=frame(),foreign=frame(),current=proof(row),observations=[];
 for(const parser of [{},new Proxy(row.parser,{}),Object.assign(Object.create(Object.getPrototypeOf(row.parser)),row.parser)]){const result=errorOf(()=>captureOriginalExternalTraitDefaultContext(parser,path));assert.equal(result.error?.name,'TypeError');observations.push(result);}
 assert.throws(()=>originalAnonymousTraitScope(row.state.facts,row.state.module,foreign.parser),/foreign original parser/);
 for(const [owner,key,replacement]of [[row.parser,'modulePath',['foreign']],[row.parser,'compilationProfile',compilationProfile({flags:{test:true}})],[row.state.facts,'modules',[...row.state.facts.modules]]]){
  const before=Object.getOwnPropertyDescriptor(owner,key);try{Object.defineProperty(owner,key,{...before,value:replacement});const result=errorOf(()=>originalExternalTraitClosure(dependencies,path,current.token));assert.equal(result.error?.name,'TypeError');observations.push({key,result});}finally{Object.defineProperty(owner,key,before);}assert.deepEqual(originalExternalTraitClosure(dependencies,path,current.token),current.value);
 }
 const update=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),apply=Reflect.apply,originalModulePath=row.parser.modulePath;let mutated=false,error;
 try{Object.defineProperty(Hash.prototype,'update',{...update,value(value,...args){const result=apply(update.value,this,[value,...args]);if(!mutated&&value===cargo.manifest){mutated=true;row.parser.modulePath=['late'];}return result;}});try{originalExternalTraitClosure(dependencies,path,current.token);}catch(cause){error={name:cause.name,message:cause.message};}}finally{Object.defineProperty(Hash.prototype,'update',update);row.parser.modulePath=originalModulePath;}
 retain('04-full-frame-negatives-and-late-crypto-mutation',{row,foreign,current,observations,mutated,error});assert.equal(mutated,true);assert.equal(error?.name,'TypeError');assert.deepEqual(originalExternalTraitClosure(dependencies,path,current.token),current.value);
});

test('public source span predicate payload and fact copies never become a private optional context or replace its original input',{timeout:60000},()=>{
 const row=frame(),current=proof(row),projection=current.value.originalDefaultNamespace,observations=[];
 const candidates=[{},structuredClone(current.token),structuredClone(projection),{...current.token,source:{...projection.source,source:projection.source.source+' '}},{...projection,refinement:{...projection.refinement,item:{...projection.refinement.item,start:projection.refinement.item.start+1}}},{...projection,refinement:{...projection.refinement,observation:{...projection.refinement.observation,original:'not(test)'}}},{...projection,refinement:{...projection.refinement,payload:[{tokens:['allow','(', 'dead_code',')']}]}}];
 for(const candidate of candidates){const result=errorOf(()=>originalExternalTraitClosure(dependencies,path,candidate));assert.equal(result.error?.name,'TypeError');observations.push({candidate,result});}
 for(const candidate of [undefined,null])assert.throws(()=>originalExternalTraitClosure(dependencies,path,candidate),TypeError);
 for(const parser of [undefined,null,{}])assert.throws(()=>originalAnonymousTraitScope(row.state.facts,row.state.module,parser),TypeError);
 assert.throws(()=>requireOriginalExternalTraitDefaultContext(current.token,structuredClone(dependencies),path),TypeError);assert.throws(()=>originalExternalTraitClosure(dependencies,['base64','engine','Engine'],current.token),TypeError);
 const edited=requireOriginalExternalTraitDefaultContext(current.token,dependencies,path);edited.refinement.item.start++;edited.refinement.observation={...edited.refinement.observation,tokens:structuredClone(edited.refinement.observation.tokens)};edited.refinement.observation.tokens[0].text='forged';assert.deepEqual(originalExternalTraitClosure(dependencies,path,current.token),current.value);
 const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,hooks=[];let calls=0;
 for(const [owner,key]of [[WeakMap.prototype,'get'],[WeakMap.prototype,'set'],[globalThis,'WeakMap'],[Object,'getOwnPropertyDescriptor'],[Object,'getPrototypeOf'],[Reflect,'ownKeys']]){
  const before=descriptor(owner,key),errors=[];try{define(owner,key,{...before,value(){calls++;throw 'new private context hook';}});for(const action of [()=>captureOriginalExternalTraitDefaultContext(row.parser,path),()=>requireOriginalExternalTraitDefaultContext(current.token,dependencies,path),()=>originalExternalTraitClosure(dependencies,path,current.token)])errors.push(errorOf(action));}finally{define(owner,key,before);}for(const result of errors)assert.equal(result.error?.name,'TypeError');assert.equal(calls,0);assert.deepEqual(originalExternalTraitClosure(dependencies,path,current.token),current.value);hooks.push({key,errors});
 }
 retain('05-complete-public-source-and-context-forgeries',{row,current,observations,edited,hooks,calls});
});

test('the complete old member and supertrait closure and every unrelated condition remain unselected',{timeout:60000},()=>{
 const row=frame(),legacy=originalExternalTraitClosure(dependencies,path),current=proof(row),projection=requireOriginalExternalTraitDefaultContext(current.token,dependencies,path),conditions=[];
 assert.deepEqual(current.value.declaration,legacy.declaration);assert.deepEqual(current.value.declaration.supertraits.map(item=>item.closure.name),['Send','Sync']);assert.ok(current.value.declaration.memberConditions.some(condition=>condition.status==='unknown'));assert.ok(current.value.declaration.memberConditions.every(condition=>condition.availabilitySelected===false));
 for(const condition of projection.observed.conditions){if(condition.attributeSpan.start===projection.refinement.item.start)continue;conditions.push(condition);assert.equal(condition.availabilitySelected,false);assert.equal(condition.attributeOwnerResolved,false);assert.equal(condition.unknownBranchesRetained,true);}
 const testAtom=[{text:'test'}],target=[{text:'target_arch'},{text:'='},{text:'"x86_64"'}],alloc=[{text:'feature'},{text:'='},{text:'"alloc"'}],stdOnly=compilationProfile({values:{feature:projection.features}});for(const tokens of [testAtom,target,alloc])assert.equal(evaluateConfiguration(tokens,stdOnly).value,null);
 assert.equal(projection.defaults.stdPreludeAuthority,false);assert.equal(projection.defaults.attributeOwnerResolved,false);retain('06-complete-retained-independent-obligations',{row,legacy,current,projection,conditions});
});

test('caller shadows unknown imports cfg globs disabled preludes and other producers retain their original refusals',{timeout:60000},()=>{
 const sources=['mod base64{}'+caller,'#[cfg(feature="unknown")]use base64::Engine as _;pub fn flag(v:bool)->u64{u64::from(v)}','use unknown::Engine as _;pub fn flag(v:bool)->u64{u64::from(v)}','use missing::*;'+caller,'#![no_implicit_prelude]'+caller,'#![no_core]'+caller,'macro_rules! emit{()=>{trait From{fn from(v:bool)->u64;}}}emit!();'+caller],observations=[];
 for(const source of sources){const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:cargo.manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});retain('07-complete-refusal-'+observations.length,{source,result});assert.equal(result.meta.executable.some(item=>item.name==='flag'),false,source);assert.ok(result.meta.refused.length>0);observations.push({source,result});}
 retain('07-full-caller-refusals',observations);
});

test('legacy two-argument complete outputs refusals and cold live crypto JSON callback reports remain exact',{timeout:60000},()=>{
 const fixture=new URL('./fixtures/external-trait-default-context/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8')),originalURL=new URL('../extensions/external-trait-sources.mjs',import.meta.url),originalRow=manifest.sources.find(row=>row.path.endsWith('external-trait-sources.mjs')),old=readFileSync(new URL(originalRow.storedPath,fixture),'utf8'),current=readFileSync(originalURL,'utf8');
 for(const row of manifest.sources){const bytes=readFileSync(new URL(row.storedPath,fixture));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);}
 const sets={};for(const [which,source]of [['old',old],['current',current]]){const copied=relocatedLeaf(source,originalURL),path=join(directory,which+'-external-traits.mjs');writeFileSync(path,copied.copied,{flag:'wx'});assert.equal(readFileSync(path,'utf8'),copied.copied);sets[which]={...copied,url:pathToFileURL(path).href};}
 retain('08-complete-original-current-fixtures',{manifest,sets,cargo});
 const observations=[];for(const mode of ['ordinary','late-hash','late-json','cold-json','cold-freeze']){
  const pair={};for(const which of ['old','current']){
   const code=`import {gzipSync} from 'node:zlib';import {Hash,createHash} from 'node:crypto';await import(${JSON.stringify(originalURL.href)});await import(${JSON.stringify(new URL('../original-json-intrinsics.mjs',import.meta.url).href)});const {loadDeriveDependencyProof}=await import(${JSON.stringify(new URL('../derive-dependencies.mjs',import.meta.url).href)}),dependencies=loadDeriveDependencyProof(${JSON.stringify(cargo)}),mode=${JSON.stringify(mode)},apply=Reflect.apply,define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor,json=JSON.stringify,tape=[],subjectURL=${JSON.stringify(sets[which].url)};let subject,restore=()=>{};const invoke=path=>{try{return {value:subject.originalExternalTraitClosure(dependencies,path)};}catch(error){return {error:{name:error.name,message:error.message}};}};if(!mode.startsWith('cold-')){subject=await import(subjectURL);invoke(['base64','Engine']);}if(mode==='late-hash'){const prior=descriptor(Hash.prototype,'update');define(Hash.prototype,'update',{...prior,value(value,...args){const result=apply(prior.value,this,[value,...args]);tape.push({bytes:Buffer.from(value,typeof args[0]==='string'?args[0]:undefined).toString('base64'),encoding:args[0]??null});return result;}});restore=()=>define(Hash.prototype,'update',prior);}if(mode==='late-json'||mode==='cold-json'){const prior=descriptor(JSON,'stringify');define(JSON,'stringify',{...prior,value(...args){const result=apply(prior.value,this,args);tape.push({result});return result;}});restore=()=>define(JSON,'stringify',prior);}if(mode==='cold-freeze'){const prior=descriptor(Object,'freeze');define(Object,'freeze',{...prior,value(value){const result=apply(prior.value,this,[value]);tape.push({argument:json(value),same:result===value});return result;}});restore=()=>define(Object,'freeze',prior);}if(mode==='late-hash')createHash('sha256').update('observer-probe');if(mode==='late-json'||mode==='cold-json')JSON.stringify({probe:true});if(mode==='cold-freeze')Object.freeze({probe:true});const probe=tape.slice();tape.length=0;let values;try{subject??=await import(subjectURL);values=[['base64','Engine'],['base64','engine','Engine'],['base64','Missing'],['base64','engine','Missing']].map(invoke);}finally{restore();}process.stdout.write(gzipSync(json({mode,values,tape,probe})));`;
   const script=join(directory,'08-'+mode+'-'+which+'.mjs');writeFileSync(script,code,{flag:'wx'});retain('08-'+mode+'-'+which+'-complete-script',{code,sets:sets[which]});let wire;
   try{wire=execFileSync(process.execPath,[script],{timeout:10000,maxBuffer:8*1024*1024});}catch(error){retain('08-'+mode+'-'+which+'-full-failed-streams',{code,error:{name:error.name,message:error.message,status:error.status,signal:error.signal},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64')});throw error;}
   const transport={code,wire:{bytes:wire.length,sha256:hash(wire),base64:wire.toString('base64')}};retain('08-'+mode+'-'+which+'-complete-wire',transport);const decoded=gunzipSync(wire,{maxOutputLength:64*1024*1024}),result=JSON.parse(decoded.toString('utf8'));pair[which]={transport,result};
  }
  retain('08-'+mode+'-complete-pair',pair);assert.deepEqual(pair.current.result,pair.old.result);if(mode!=='ordinary')assert.ok(pair.current.result.probe.length>0);if(mode==='late-hash'||mode==='cold-freeze')assert.ok(pair.current.result.tape.length>0);observations.push(pair);
 }
 retain('08-complete-legacy-observer-reports',observations);
});
