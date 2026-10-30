// Actual existing helper source closure and private bootstrap regression drafts. ALL UNRUN.
// Exact definition literal/header regression source drafts. ALL UNRUN.
// Actual written unit definition and source-only regression drafts. ALL UNRUN.
// Explicit private primitive definition source profile drafts. ALL UNRUN.
// Fixed-width pure scalar unit rules, independent ABI boundaries. ALL UNRUN.
// Automatic native-to-paired module discovery cases. SOURCE ONLY; ALL UNRUN.
// Qualified scalar local annotation and receiving fixed point. ALL UNRUN.
// Pure primitive source-unit bulk cases. SOURCE ONLY; ALL UNRUN.
// JSON-input primitive return families. SOURCE ONLY; ALL UNRUN.
// Owned canonical JSON return shape batches. SOURCE ONLY; ALL UNRUN.
// Borrowed native string input family. SOURCE ONLY; ALL UNRUN.
// Exact native integer parameters in JSON-vector units. ALL UNRUN.
// Standard JSON optional reader bulk source cases. ALL UNRUN.
// Whole JSON copy/control native synchronization independent cases. ALL UNRUN.
// Independent source re-entry of bounded native JSON locals. ALL UNRUN.
// Independent actual original JSON-vector reverse source; ALL UNRUN.
// Independent actual parameterized reverse cases. SOURCE ONLY; ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {rustPackageSourcePath} from '../../repository-layout.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../../router-core-source-data.mjs';
import {ownedBulkRuntimeSources as ownedCoreRuntimeSources} from '../owned-vector-candidate-source.mjs';
import {prepareOwnedVectorCandidateSources} from '../prepare-owned-vector-candidate.mjs';
import {createOwnedVectorCandidateContext,translateOwnedVectorCandidate,parseOwnedVectorCandidateMeta,emitOwnedVectorCandidateRust,prepareOwnedVectorCandidateRuntime,evaluateOwnedVectorCandidate} from '../owned-vector-candidate.mjs';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),JS='app/src/list.mjs',TS='typed/src/list.mts',limits={timeout:60000},C='crate::translation_core::';
const original=path=>readFileSync(join(ROOT,rustPackageSourcePath(ROOT,path)),'utf8');
function data(rust,source,typed){return {runtimeRoot:'app/runtime',declarationRoot:'typed/runtime',vectorBindings:[{javascriptPath:JS,javascriptName:'values',rustPath:'src/lib.rs',rustName:'values'}],files:[...ownedCoreRuntimeSources('app/runtime','typed/runtime'),{path:'src/lib.rs',source:'pub mod translation_core;\n'+rust},{path:'src/translation_core.rs',source:facade},{path:'src/translation_core/primitives.rs',source:primitives},{path:'src/translation_core/ranges.rs',source:ranges},{path:'src/translation_core/base64.rs',source:base64},{path:'src/translation_core/json_collections.rs',source:collections},{path:'Cargo.toml',source:original('Cargo.toml')},{path:'Cargo.lock',source:original('Cargo.lock')},{path:JS,source},{path:TS,source:typed}]};}
function translate(rust,source,typed){const input=data(rust,source,typed),context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});return {input,context,result};}
function write(root,path,source){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}
async function targets(t,row){
 const folder=mkdtempSync(join(tmpdir(),'owned-vector-candidate-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 for(const file of row.input.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(folder,file.path,file.source);
 for(const file of row.input.files.filter(file=>file.path.startsWith('typed/runtime/')&&file.path.endsWith('.mts')))write(folder,'app/runtime/'+file.path.slice('typed/runtime/'.length),file.source);
 write(folder,'typed/src/reverse.mts',row.result.typescript);
 execFileSync(process.execPath,[join(ROOT,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',folder,'--outDir',join(folder,'out'),join(folder,TS),join(folder,'typed/src/reverse.mts')],{cwd:ROOT,encoding:'utf8',stdio:'pipe',timeout:20000});
 for(const file of row.input.files.filter(file=>file.path.startsWith('app/runtime/'))){write(folder,'out/'+file.path,file.source);write(folder,'out/typed/runtime/'+file.path.slice('app/runtime/'.length),file.source);}
 const javascript=await import(pathToFileURL(join(folder,JS)).href),typed=await import(pathToFileURL(join(folder,'out/typed/src/list.mjs')).href),reverse=await import(pathToFileURL(join(folder,'out/typed/src/reverse.mjs')).href),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);
 return [(...args)=>javascript.values(...args),(...args)=>typed.values(...args),(...args)=>reverse.values(...args),(...args)=>evaluateOwnedVectorCandidate(row.result.program,'values',args,runtime)];
}


import {json_macro_null as nullValue,json_macro_string as stringValue,json_macro_array as arrayValue} from '../../json-macro-runtime.mjs';
import {prepareVectorJsonReverseSources} from '../../prepare-vector-json-reverse-sources.mjs';
const T=C+'Json',typeImport='import type {JsonValue} from "../runtime/json-macro-runtime.mjs";\n';
function pair(rust,body,{args='',typedArgs='',imports=''}={}){return translate(rust,imports+'export function values('+args+'){'+body+'}',typeImport+imports+'export function values('+typedArgs+'):readonly JsonValue[]{'+body+'}');}

import {BOUNDED_JSON_CORE_SOURCE} from '../../bounded-json-core-source-data.mjs';
import {prepareVectorJsonOriginLocalsSources} from '../../prepare-vector-json-origin-locals-sources.mjs';
const B='crate::translation_json_core::';
function nativePair(rust,body,{args='',typedArgs='',imports=''}={}){const source=imports+'export function values('+args+'){'+body+'}',typed=typeImport+imports+'export function values('+typedArgs+'):readonly JsonValue[]{'+body+'}',input=data(rust,source,typed);input.files.find(row=>row.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(row=>row.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});return {input,context,result};}
import {proposeOwnedVectorNativeSynchronization} from '../owned-vector-native-synchronization.mjs';
import {requestedNativeJsonVectorTree,actualNativeJsonVectorTree} from '../owned-vector-native-json-control.mjs';
import {prepareVectorNativeJsonControlSources} from '../../prepare-vector-native-json-control-sources.mjs';
import {translateProject} from '../../project.mjs';
import {PRODUCTION_PROFILE} from '../../cfg-profile.mjs';
import {jsonMacroDependencyProfile} from '../../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../../derive-dependencies.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
function sync(row,javascript=false){return proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,...(javascript?{javascript:row.input.files.find(file=>file.path===JS).source}:{typescript:row.result.typescript})});}
function forward(row,proposal,change=source=>source){const files=new Map(row.input.files.map(file=>[file.path,file.source]));for(const edit of proposal.rustEdits)files.set(edit.path,change(edit.after));const dependencies={manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')};return translateProject({entry:'src/lib.rs',paths:[...files.keys()].filter(path=>path.endsWith('.rs')),readSource:path=>files.get(path),compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependencies.manifest,jsonMacroDependencies:jsonMacroDependencyProfile(dependencies).proof,deriveDependencies:deriveDependencyProfile(dependencies).proof});}
import {prepareVectorJsonStandardOptionsSources} from '../../prepare-vector-json-standard-options-sources.mjs';
import {nativeJsonOptionalReaderSource} from '../owned-vector-json-predicate-native.mjs';
import {ownedJsonReaderOperation,ownedJsonOptionalPayload} from '../owned-json-source.mjs';
import {json_macro_object as objectValue,json_macro_bool as boolValue,json_macro_u64 as unsignedValue,json_macro_i64 as signedValue} from '../../json-macro-runtime.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../../json-fields-native-source.mjs';
import {prepareVectorJsonIntegerInputsSources} from '../../prepare-vector-json-integer-inputs-sources.mjs';
import {prepareVectorJsonStringInputsSources} from '../../prepare-vector-json-string-inputs-sources.mjs';
import {prepareVectorJsonOwnedValuesSources} from '../../prepare-vector-json-owned-values-sources.mjs';
import {originalJsonOwnedValueDomain} from '../owned-vector-json-native.mjs';
import {prepareVectorJsonScalarReturnsSources} from '../../prepare-vector-json-scalar-returns-sources.mjs';
import {originalJsonScalarDomain} from '../owned-vector-json-native.mjs';
import {preparePrimitiveScalarUnitsSources} from '../../prepare-primitive-scalar-units-sources.mjs';
import {originalPrimitiveScalarDomain} from '../owned-vector-json-native.mjs';



async function insertionTargets(t,row){
 const folder=mkdtempSync(join(tmpdir(),'owned-vector-candidate-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 for(const file of row.input.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(folder,file.path,file.source);
 for(const file of row.input.files.filter(file=>file.path.startsWith('typed/runtime/')&&file.path.endsWith('.mts')))write(folder,'app/runtime/'+file.path.slice('typed/runtime/'.length),file.source);
 write(folder,'typed/src/reverse.mts',row.result.typescript);
 execFileSync(process.execPath,[join(ROOT,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',folder,'--outDir',join(folder,'out'),join(folder,TS),join(folder,'typed/src/reverse.mts')],{cwd:ROOT,encoding:'utf8',stdio:'pipe',timeout:20000});
 for(const file of row.input.files.filter(file=>file.path.startsWith('app/runtime/'))){write(folder,'out/'+file.path,file.source);write(folder,'out/typed/runtime/'+file.path.slice('app/runtime/'.length),file.source);}
 const javascript=await import(pathToFileURL(join(folder,JS)).href),typed=await import(pathToFileURL(join(folder,'out/typed/src/list.mjs')).href),reverse=await import(pathToFileURL(join(folder,'out/typed/src/reverse.mjs')).href),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);
 return [(name,...args)=>javascript[name](...args),(name,...args)=>typed[name](...args),(name,...args)=>reverse[name](...args),(name,...args)=>evaluateOwnedVectorCandidate(row.result.program,name,args,runtime)];
}



import {prepareOwnedVectorModulePair} from '../owned-vector-module-pair.mjs';




import {prepareOwnedPrimitiveExistingHelperSource,originalExistingPrimitiveHelperNames} from '../owned-existing-helper-bootstrap.mjs';
import {prepareExistingHelperBootstrapSources} from '../../prepare-existing-helper-bootstrap-sources.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {checkOwnedCoreProgram} from '../owned-vector-candidate-operations.mjs';
const existingHelperRoute={rustPath:'src/lib.rs',module:['target']};
function boolHelperFixture(){const input=data('pub mod target {pub fn existing(value:bool)->bool{value}\npub fn indirect(value:bool)->bool{existing(value)}\npub fn unused(value:bool)->bool{!value}}','export function existing(value){return value;}export function indirect(value){return existing(value);}export function unused(value){return !value;}','export function existing(value:boolean):boolean{return value;}export function indirect(value:boolean):boolean{return existing(value);}export function unused(value:boolean):boolean{return !value;}');input.vectorBindings=['existing','indirect','unused'].map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:'target.'+name}));return input;}
function helperRequest(authority){return {sourcePath:JS,typescriptPath:TS,nativeRoute:existingHelperRoute,[authority]:authority==='javascript'?'/** @param {boolean} value @returns {boolean} */\nexport function added(value){return indirect(value);}':'export function added(value:boolean):boolean{return indirect(value);}'};}
function canonicalBootstrap(plan){const pair=prepareOwnedVectorModulePair(JS,TS,plan.typescript),files=new Map(plan.bootstrapInput.files.map(row=>[row.path,row.source]));files.set(JS,pair.javascript.source);files.set(TS,pair.typescript.source);const input={...plan.bootstrapInput,files:[...files].map(([path,source])=>({path,source}))},context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(pair.javascript.source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const authority of ['javascript','typescript'])test('fresh '+authority+' existing helper bootstrap reconstructs only actual transitive helper bodies and privately checks complete definitions',limits,async t=>{
 const input=boolHelperFixture(),before=JSON.stringify(input),request=helperRequest(authority),plan=prepareOwnedPrimitiveExistingHelperSource(input,request);assert.equal(JSON.stringify(input),before);assert.deepEqual(plan.helperRoots,['indirect']);assert.deepEqual(plan.supportBindings.map(row=>row.javascriptName).sort(),['existing','indirect']);assert.deepEqual(plan.bootstrapProgram.map(row=>row.javascript).sort(),['added','existing','indirect']);assert.equal(plan.bootstrapProgram.some(row=>row.javascript==='unused'),false);
 const runtime=await prepareOwnedVectorCandidateRuntime(plan.bootstrapProgram);for(const value of [true,false])assert.equal(evaluateOwnedVectorCandidate(plan.bootstrapProgram,'added',[value],runtime),value);const row=canonicalBootstrap(plan),getters=await insertionTargets(t,row);for(const get of getters)for(const value of [true,false])assert.equal(get('added',value),value);const rust=emitOwnedVectorCandidateRust(row.result.program);assert.ok(rust.includes('fn existing'));assert.ok(rust.includes('fn added'));assert.ok(!rust.includes('unimplemented!'));
 for(const key of ['sourceAuthority','semanticAuthority','productionSelected','nativeInstalled','nativeFreshnessQualified','receivingExecuted','runtimeParity','wholeRouterSynchronization','crossInvocationCache','rustExecuted'])assert.equal(plan[key],false);
});
for(const authority of ['javascript','typescript'])test('all ten fixed existing helper domains retain complete typed or canonical JSDoc bodies during bootstrap '+authority,limits,async()=>{
 for(const domain of PRIMITIVE_BITWISE_TYPES){const typed='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\nexport function existing(value:'+domain.alias+'):'+domain.alias+'{return value;}',input=data('pub mod target {pub fn existing(value:'+domain.name+')->'+domain.name+'{value}}','export function existing(value){return value;}',typed);input.vectorBindings=[{javascriptPath:JS,javascriptName:'existing',rustPath:'src/lib.rs',rustName:'target.existing'}];const source=authority==='javascript'?'/** @param {import("../runtime/primitive-operator-runtime.mjs").'+domain.alias+'} value @returns {import("../runtime/primitive-operator-runtime.mjs").'+domain.alias+'} */\nexport function added(value){return existing(value);}':'import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\nexport function added(value:'+domain.alias+'):'+domain.alias+'{return existing(value);}',plan=prepareOwnedPrimitiveExistingHelperSource(input,{sourcePath:JS,typescriptPath:TS,[authority]:source}),runtime=await prepareOwnedVectorCandidateRuntime(plan.bootstrapProgram);
  for(const value of [domain.signed?-BigInt(domain.minimumAbs):0n,0n,BigInt(domain.maximum)])assert.equal(evaluateOwnedVectorCandidate(plan.bootstrapProgram,'added',[value],runtime),value);assert.ok(plan.typescript.includes(domain.alias));assert.equal(plan.supportBindings.length,1);
 }
});
test('syntactic call-name selection never grants scope or semantic permission',limits,()=>{
 const input=boolHelperFixture(),bindings=input.vectorBindings;assert.deepEqual(originalExistingPrimitiveHelperNames('/* indirect(value) */\nexport function added(value){return value;}',JS,'JavaScript',bindings),[]);const source='/** @param {boolean} indirect @returns {boolean} */\nexport function added(indirect){return indirect(true);}';assert.deepEqual(originalExistingPrimitiveHelperNames(source,JS,'JavaScript',bindings),['indirect']);assert.throws(()=>prepareOwnedPrimitiveExistingHelperSource(input,{sourcePath:JS,typescriptPath:TS,javascript:source}));assert.throws(()=>prepareOwnedPrimitiveExistingHelperSource(input,{sourcePath:JS,typescriptPath:TS,typescript:'export function added(value:boolean):boolean{return value;}'}));
});
test('missing actual declarations wrong native bindings effects aliases and discarded unit helper calls retain refusals',limits,()=>{
 const input=boolHelperFixture();for(const source of ['export function added(value:boolean):boolean{return missing(value);}','export function added(value:boolean):boolean{console.log(value);return indirect(value);}','export function added(value:bigint):boolean{return indirect(value);}','export function added(value:boolean):boolean{return indirect(value);}export function indirect(value:boolean):boolean{return value;}'])assert.throws(()=>prepareOwnedPrimitiveExistingHelperSource(input,{sourcePath:JS,typescriptPath:TS,typescript:source}));
 const changed=structuredClone(input);changed.vectorBindings[1].rustName='target.missing';assert.throws(()=>prepareOwnedPrimitiveExistingHelperSource(changed,helperRequest('typescript')));
 const alias=structuredClone(input);alias.vectorBindings[0].javascriptName='renamed';alias.files.find(row=>row.path===JS).source=alias.files.find(row=>row.path===JS).source.replaceAll('existing','renamed');alias.files.find(row=>row.path===TS).source=alias.files.find(row=>row.path===TS).source.replaceAll('existing','renamed');assert.throws(()=>prepareOwnedPrimitiveExistingHelperSource(alias,{sourcePath:JS,typescriptPath:TS,typescript:'export function added(value:boolean):boolean{return renamed(value);}'}));
});
test('public helper and definition DATA cannot replace either current original source issuer',limits,()=>{
 const plan=prepareOwnedPrimitiveExistingHelperSource(boolHelperFixture(),helperRequest('typescript')),fake=structuredClone(plan.supportProgram);fake[0].body[0].value={kind:'bool',value:false,type:'bool',root:null};assert.throws(()=>checkOwnedCoreProgram(fake));const input=structuredClone(plan.bootstrapInput);input.files.find(row=>row.path===JS).source=input.files.find(row=>row.path===JS).source.replace('return value;','return false;');const context=createOwnedVectorCandidateContext(input);assert.throws(()=>parseOwnedVectorCandidateMeta(plan.bootstrapMeta,{context}));
});
test('two complete existing helper source equations retain originals inverses and fixed phases',limits,()=>{
 const plan=prepareExistingHelperBootstrapSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
