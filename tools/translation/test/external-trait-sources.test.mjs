import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {originalExternalTraitClosure,captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {originalCorePreludeTraitClosure,originalConditionalNamespaceAttribute} from '../extensions/primitive-trait-closure.mjs';
import {originalAnonymousTraitScope} from '../extensions/primitive-anonymous-traits.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts,originalMatchesDependencyProof} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
function retain(name,value){const directory=process.env.ROUTER_EXTERNAL_TRAIT_SOURCE_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}}
function facts(source){const file='src/lib.rs',captured=captureSourceModuleViews({source,sourcePath:file}),modules=captured.views.map(sourceView=>({file,path:[...sourceView.modulePath],source,sourceView})),context=createMatchesMacroContext({modules,deriveDependencies:dependencies}),parser=configureMatchesMacroParser(new HostRustParser(tokenizeRust(source)),context,{file}),state=matchesParserFacts(parser);return {consumer:state.module,facts:state.facts};}

test('private package input capture preserves all thirty-nine complete originals without namespace admission',()=>{
 const token=captureOriginalExternalTraitPackage(dependencies,'base64'),inputs=originalExternalTraitPackageInputs(token);assert.equal(inputs.sources.length,39);assert.equal(inputs.crateRoot,'src/lib.rs');assert.equal(inputs.namespaceComplete,false);assert.equal(inputs.traitCallAuthority,false);assert.equal(inputs.runtimeParity,false);
 assert.equal(inputs.sources.reduce((total,input)=>total+input.bytes,0),404863);for(const input of inputs.sources){assert.equal(Buffer.byteLength(input.source),input.bytes);assert.equal(hash(input.source),input.sha256);assert.equal(Object.isFrozen(input),true);}
 assert.ok(inputs.sources.some(input=>input.path==='LICENSE-MIT'));assert.ok(inputs.sources.some(input=>input.path==='LICENSE-APACHE'));assert.throws(()=>originalExternalTraitPackageInputs(structuredClone(token)),/genuine private capture/u);assert.throws(()=>captureOriginalExternalTraitPackage(structuredClone(dependencies),'base64'),/genuine private dependency proof/u);
 retain('00-complete-package-inputs',{token,inputs});
});

test('complete official locked package follows the original public Engine route and every member and Send Sync owner',{timeout:15000},()=>{
 const directory=new URL('../source-profiles/external-traits/',import.meta.url),profile=JSON.parse(readFileSync(new URL('manifest.json',directory),'utf8')),pin=profile.packages[0],archive=readFileSync(new URL(pin.archive,directory)),proof=originalExternalTraitClosure(dependencies,['base64','Engine']);
 retain('01-full-originals',{manifest,lock,profile,completeArchiveBase64:archive.toString('base64'),proof});assert.equal(archive.length,93605);assert.equal(hash(archive),'ac07cdecf99051d9a5238b80f35af32cdeba5b336e55d957b318b50137e18da5');assert.equal(pin.members.length,39);
 const closure=proof.declaration;assert.equal(closure.source,'src/engine/mod.rs');assert.equal(closure.sourceSha256,'6ce97ed46c6548e97e45d5b67ad41a2028ff2353f0311ed32317e9fe3b83532b');assert.equal(closure.originalRoute.length,1);assert.equal(closure.originalRoute[0].source,'src/lib.rs');
 assert.deepEqual(closure.originalMemberNames,[{kind:'type',name:'Config'},{kind:'type',name:'DecodeEstimate'},...['internal_encode','internal_decoded_len_estimate','internal_decode','config','encode','encode_string','encode_slice','decode','decode_vec','decode_slice','decode_slice_unchecked','padding'].map(name=>({kind:'fn',name}))]);
 assert.deepEqual(closure.supertraits.map(row=>row.closure.name),['Send','Sync']);for(const row of closure.supertraits){assert.equal(row.closure.source,'library/core/src/marker.rs');assert.deepEqual(row.closure.originalMemberNames,[]);assert.equal(row.closure.wholeTraitAuthority,false);}
 assert.ok(closure.memberConditions.some(row=>row.status==='unknown'));assert.ok(closure.memberConditions.every(row=>row.availabilitySelected===false));for(const field of ['wholeTraitAuthority','runtimeParity'])assert.equal(proof[field],false);
});

test('private complete Cargo inputs and unique actual source routes cannot be replaced by copied proof fields',()=>{
 for(const [index,value]of [null,{},structuredClone(dependencies),{...dependencies,verified:true}].entries())assert.throws(()=>originalExternalTraitClosure(value,['base64','Engine']),/genuine private dependency proof/u,'copied '+index);
 for(const path of [['base64','Missing'],['base64','engine','Missing'],['base64'],['unknown','Engine'],['base64','..','Engine'],['base64','engine','Config','Other']])assert.throws(()=>originalExternalTraitClosure(dependencies,path),/Original external trait source/u);
 const first=originalExternalTraitClosure(dependencies,['base64','Engine']),second=originalExternalTraitClosure(dependencies,['base64','engine','Engine']);assert.deepEqual(first.declaration.originalMemberNames,second.declaration.originalMemberNames);first.declaration.originalMemberNames[0].name='is_finite';assert.equal(originalExternalTraitClosure(dependencies,['base64','Engine']).declaration.originalMemberNames[0].name,'Config');retain('02-independent-closures',{first,second});
});

test('actual anonymous source import retains its original dependency and refuses root shadows or unrelated aliases',()=>{
 const source='use base64::Engine as _;pub fn value()->u8{1u8}',actual=facts(source),proof=originalAnonymousTraitScope(actual.facts,actual.consumer);retain('03-full-anonymous',{source,proof});assert.equal(proof.length,1);assert.deepEqual(proof[0].originalImport.segments,['base64','Engine']);assert.equal(proof[0].declaration.originalDependency.archiveSha256,'ac07cdecf99051d9a5238b80f35af32cdeba5b336e55d957b318b50137e18da5');
 const shadow=facts('mod base64{}'+source);assert.throws(()=>originalAnonymousTraitScope(shadow.facts,shadow.consumer),/root is shadowed/u);
 assert.throws(()=>originalMatchesDependencyProof(structuredClone(actual.facts)),/genuine private source facts/u);
 for(const source of ['use unknown::Engine as _;','use alias::Engine as _;','#[cfg(feature="unknown")]use base64::Engine as _;']){const actual=facts(source);assert.throws(()=>originalAnonymousTraitScope(actual.facts,actual.consumer),/original|Original|condition/u);}
});

test('conditional namespace union accepts only complete inert alternatives and original core auto trait declarations',()=>{
 const conditional=tokens=>({name:'cfg_attr',tokens:['#','[','cfg_attr','(',...tokens,')',']']});
 assert.equal(originalConditionalNamespaceAttribute(conditional(['feature','=','"alloc"',',','doc','=','"```"'])),true);
 assert.equal(originalConditionalNamespaceAttribute(conditional(['feature','=','"std"',',','no_std'])),false);
 assert.equal(originalConditionalNamespaceAttribute(conditional(['feature','=','"std"',',','no_std']),{allowNoStd:true}),true);
 for(const tokens of [['feature','=','"x"',',','custom'],['feature','=','"x"',',','doc','=','include_str','!','(','"x"',')'],['feature','=','"x"',',','derive','(','Other',')'],['feature','=','"x"',',','cfg','(','test',')'],['feature','=','"x"',',','doc','=','"x"',',','custom']])assert.equal(originalConditionalNamespaceAttribute(conditional(tokens)),false);
 for(const name of ['Send','Sync']){const proof=originalCorePreludeTraitClosure(name);assert.equal(proof.closure.name,name);assert.deepEqual(proof.closure.originalMemberNames,[]);retain('04-original-core-'+name,proof);}
});

test('genuine authored caller keeps checked meta and JavaScript strict TypeScript behavior with the original external anonymous trait',{timeout:60000},async()=>{
 const source='use base64::Engine as _;pub fn identity(value:u8)->u8{u8::from(value)}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies});retain('05-checked-caller',{source,result});assert.deepEqual(result.meta.refused.filter(row=>row.term==='fn'),[]);assert.ok(result.meta.executable.some(row=>row.name==='identity'));assert.equal(result.meta.refused.length,1);assert.equal(result.meta.refused[0].term,'use');assert.equal(result.meta.refused[0].name,'base64');await verifyTypedTargets(result,api=>{for(const value of [0n,1n,127n,255n])assert.equal(api.identity(value),value);for(const value of [-1n,256n,1,null,{}])assert.throws(()=>api.identity(value),TypeError);},{childTimeoutMs:20000});
});
