// Independent actual native vector local domains. ALL UNRUN.
// Receiving-first primitive Vec definition bootstrap source cases. UNRUN.
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

import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {proposeOwnedPrimitiveFunctionInsertion} from '../owned-primitive-function-insertion.mjs';
import {proposeOwnedPrimitiveVectorFunctionInsertion} from '../owned-primitive-vector-function-insertion.mjs';
import {proposeOwnedPrimitiveVectorFunctionInsertion as publicVectorInsertion} from '../../source-synchronization.mjs';
import {preparePrimitiveVectorDefinitionSources} from '../../prepare-primitive-vector-definition-sources.mjs';
const route={rustPath:'src/lib.rs',module:['target']},operationImport='import {integerArithmetic as math} from "../runtime/primitive-operator-runtime.mjs";\n';
function emptyFixture(){const input=data('pub fn untouched()->bool{false}\npub mod target { /* original empty module */ }','','');input.vectorBindings=[];return input;}
function installed(input,plan){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const row of plan.outputs)files.set(row.path,row.after);return {...input,vectorBindings:[...input.vectorBindings,...plan.bindings],files:[...files].map(([path,source])=>({path,source}))};}
function receiving(input){const context=createOwnedVectorCandidateContext(input),source=input.files.find(row=>row.path===JS).source,result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});return {input,context,result};}
function insert(input,source,javascript=false){return proposeOwnedPrimitiveVectorFunctionInsertion(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:route,...(javascript?{javascript:source}:{typescript:source})});}

import {checkedPrimitiveExpressionVectorTail,checkedPrimitiveExpressionVectorLocals} from '../owned-primitive-expression-vectors.mjs';
import {prepareVectorLocalDomainsSources} from '../../prepare-vector-local-domains-sources.mjs';
const types='import type {RustU8,RustU16} from "../runtime/primitive-operator-runtime.mjs";\n';
function mixedPair({branch=false,annotation=false}={}){
 const rust='pub fn values(value:u8,other:u16,flag:bool)->Vec<u8>{'+(branch?'let first=if flag{crate::translation_core::vec![other]}else{crate::translation_core::vec![]};let moved=first;':'let first=crate::translation_core::vec![other.checked_add(1).expect("attempt to add with overflow")];')+'crate::translation_core::vec![value]}',body=branch?'const first=flag?[other]:[];const moved=first;return [value];':'const first'+(annotation?':readonly RustU16[]':'')+'=[math(other,1n,16,false,"add")];return [value];',typed=types+operationImport+'export function values(value:RustU8,other:RustU16,flag:boolean):readonly RustU8[]{'+body+'}',source=operationImport+'export function values(value,other,flag){'+body.replace(':readonly RustU16[]','')+'}';return translate(rust,source,typed);
}
for(const annotation of [false,true])test('actual vector local width differs from the returned vector width '+annotation,limits,async t=>{
 const row=mixedPair({annotation});for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,2n,false),[3n]);assert.throws(()=>get('values',3n,65535n,false),/attempt to add with overflow/u);}assert.deepEqual(sync(row).rustEdits,[]);assert.doesNotMatch(JSON.stringify(row.result.program),/@router-private/u);
});
test('independent local vector branches and aliases keep their own type and move state',limits,async t=>{
 const row=mixedPair({branch:true});for(const get of await insertionTargets(t,row))for(const flag of [false,true])assert.deepEqual(get('values',3n,65535n,flag),[3n]);assert.deepEqual(sync(row).rustEdits,[]);
});
test('the original same-result observer keeps its domain while the additive observer checks the complete body',limits,()=>{
 const row=mixedPair(),project=forward(row,{rustEdits:[]}),entries=project.executableDeclarations.filter(item=>item.qualifiedName==='values');assert.equal(entries.length,1);const own=entries[0].checkedSource().declaration;assert.throws(()=>checkedPrimitiveExpressionVectorTail(own));assert.equal(checkedPrimitiveExpressionVectorLocals(own).type.kind,'array');
});
test('receiving-first definitions retain unused different-domain helper failures and actual helper source',limits,async t=>{
 const source=types+operationImport+'export function helper(other:RustU16){return [math(other,1n,16,false,"add")];}export function values(value:RustU8,other:RustU16){const first=helper(other);const moved=first;return [value];}',plan=insert(emptyFixture(),source),row=receiving(installed(emptyFixture(),plan));for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,2n),[3n]);assert.throws(()=>get('values',3n,65535n),/attempt to add with overflow/u);}assert.equal(plan.bindings.length,2);assert.equal(plan.runtimeParity,false);
});
test('all ten independent local widths compose with one exact u8 result in a complete source batch',limits,async t=>{
 const declarations='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n',source=declarations+PRIMITIVE_BITWISE_TYPES.map(row=>'export function values_'+row.name+'(value:RustU8,other:'+row.alias+',flag:boolean){const local=flag?[other]:[];const moved=local;return [value];}').join('\n'),plan=insert(emptyFixture(),source),row=receiving(installed(emptyFixture(),plan));assert.equal(plan.bindings.length,10);for(const get of await insertionTargets(t,row))for(const domain of PRIMITIVE_BITWISE_TYPES)for(const flag of [false,true])assert.deepEqual(get('values_'+domain.name,3n,BigInt(domain.maximum),flag),[3n]);
});
test('independent local domains still refuse element conflicts borrowing mutation and repeated moves',limits,()=>{
 for(const body of [
 'const local=[other];const moved=local;const repeated=local;return [value];',
 'const local=flag?[other]:[value];return [value];',
 'const local=[other,value];return [value];',
 'const local=[other];return local;',
 'const local=[other];local.push(other);return [value];',
 'const local=[];return [value];'
 ])assert.throws(()=>insert(emptyFixture(),types+'export function values(value:RustU8,other:RustU16,flag:boolean):readonly RustU8[]{'+body+'}'));
 const row=mixedPair(),changed={...row.input,files:row.input.files.map(file=>file.path===JS?{...file,source:operationImport+'export function values(value,other,flag){const first=[other];const moved=first;const repeated=first;return [value];}'}:file)};assert.throws(()=>{const context=createOwnedVectorCandidateContext(changed);translateOwnedVectorCandidate(changed.files.find(file=>file.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:TS});});
});
test('ten complete independent-local source equations preserve complete inverses and phases',limits,()=>{
 const plan=prepareVectorLocalDomainsSources();assert.equal(plan.files.length,10);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
