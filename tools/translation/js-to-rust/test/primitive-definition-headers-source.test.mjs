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


import {preparePrimitiveDefinitionHeadersSources} from '../../prepare-primitive-definition-headers-sources.mjs';
import {emitOwnedCoreProgram,checkOwnedCoreProgram} from '../owned-vector-candidate-operations.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
const aliases='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n';
function definedHeaders(typed){const pair=prepareOwnedVectorModulePair(JS,TS,typed),input=data('pub fn native_anchor()->bool{true}',pair.javascript.source,typed);input.vectorBindings=[];input.primitiveOperators=true;input.primitiveDefinitions=true;const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(pair.javascript.source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
test('actual written fixed definition results narrow all ten literal boundary domains through complete meta and strict paired targets',limits,async t=>{
 const typed=aliases+PRIMITIVE_BITWISE_TYPES.map(row=>'export function minimum_'+row.name+'():'+row.alias+'{return '+(row.signed?'-'+row.minimumAbs:'0')+'n;}\nexport function maximum_'+row.name+'():'+row.alias+'{return '+row.maximum+'n;}').join('\n'),row=definedHeaders(typed),getters=await insertionTargets(t,row);assert.equal(row.result.program.length,20);assert.equal(parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context}).length,20);
 for(const domain of PRIMITIVE_BITWISE_TYPES)for(const get of getters){assert.equal(get('minimum_'+domain.name),domain.signed?-BigInt(domain.minimumAbs):0n);assert.equal(get('maximum_'+domain.name),BigInt(domain.maximum));}assert.equal(row.result.runtimeParity,false);
});
test('fixed conditional literal results and written local constants retain exact source type witnesses',limits,async t=>{
 const row=definedHeaders(aliases+'export function select(flag:boolean):RustI8{return flag?-128n:127n;}\nexport function local():RustI16{const minimum:RustI16=-32768n;return minimum;}'),getters=await insertionTargets(t,row);for(const get of getters){assert.equal(get('select',true),-128n);assert.equal(get('select',false),127n);assert.equal(get('local'),-32768n);}assert.ok(row.result.typescript.includes('minimum: RustI16'));
});
test('fixed definition result annotations cannot enlarge a literal domain or rewrite a nonliteral ABI',limits,()=>{
 for(const domain of PRIMITIVE_BITWISE_TYPES)for(const value of [BigInt(domain.maximum)+1n,domain.signed?-BigInt(domain.minimumAbs)-1n:-1n])assert.throws(()=>definedHeaders(aliases+'export function outside():'+domain.alias+'{return '+value+'n;}'));
 assert.throws(()=>definedHeaders(aliases+'export function wrong(value:RustU16):RustU8{return value;}'));assert.throws(()=>definedHeaders(aliases+'export function arithmetic(value:RustU8):RustU8{return value+1n;}'));
});
function nativeHeader(domain){const source='export function values(value){const copy=value;return copy;}',typed='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\nexport function values(value:'+domain.alias+'):'+domain.alias+'{const copy:'+domain.alias+'=value;return copy;}',input=data('pub fn values(value:'+domain.name+')->'+domain.name+'{value}',source,typed),context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
test('precise native definition headers preserve genuine primitive ABI and local widths for fresh definition re-entry',limits,async()=>{
 for(const domain of PRIMITIVE_BITWISE_TYPES){const native=nativeHeader(domain),ordinary=emitOwnedCoreProgram(native.result.program,'typescript',{outputPath:TS}),unchanged=emitOwnedCoreProgram(native.result.program,'typescript',{outputPath:TS,primitiveDefinitionHeaders:false});assert.equal(ordinary,unchanged);const precise=emitOwnedCoreProgram(native.result.program,'typescript',{outputPath:TS,primitiveDefinitionHeaders:true});assert.ok(precise.includes('value: '+domain.alias));assert.ok(precise.includes('copy: '+domain.alias));const row=definedHeaders(precise),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);for(const value of [domain.signed?-BigInt(domain.minimumAbs):0n,0n,BigInt(domain.maximum)])assert.equal(evaluateOwnedVectorCandidate(row.result.program,'values',[value],runtime),value);}
});
test('precise header output is formatting DATA and cannot admit forged empty or nongenuine source families',limits,()=>{
 const row=nativeHeader(PRIMITIVE_BITWISE_TYPES[0]);assert.throws(()=>emitOwnedCoreProgram(row.result.program,'rust',{primitiveDefinitionHeaders:true}));assert.throws(()=>emitOwnedCoreProgram(row.result.program,'typescript',{primitiveDefinitionHeaders:'true'}));assert.throws(()=>emitOwnedCoreProgram([],'typescript',{primitiveDefinitionHeaders:true}));const defined=definedHeaders('export function identity(value:boolean):boolean{return value;}');assert.throws(()=>emitOwnedCoreProgram(defined.result.program,'typescript',{primitiveDefinitionHeaders:true}));const fake=structuredClone(row.result.program);fake[0].params[0].type='bool';assert.throws(()=>checkOwnedCoreProgram(fake,row.context));assert.throws(()=>emitOwnedCoreProgram(fake,'typescript',{primitiveDefinitionHeaders:true}));
});
test('three complete precise header and definition literal equations retain whole inverses and fixed phases',limits,()=>{
 const plan=preparePrimitiveDefinitionHeadersSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
