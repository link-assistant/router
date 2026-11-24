// Standalone scalar/unit definition source cases. ALL UNRUN.
// Actual scalar-return Vec local receiving/native wiring. ALL UNRUN.
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


import {proposeOwnedPrimitiveEffectFunctionInsertion as effectInsert} from '../owned-primitive-effect-function-insertion.mjs';
import {proposeOwnedPrimitiveEffectFunctionExtension as extend,proposeOwnedPrimitiveEffectFunctionRemoval as remove,proposeOwnedPrimitiveEffectFunctionReconciliation as reconcile,prepareOwnedPrimitiveEffectExistingHelperSource as helpers} from '../owned-primitive-effect-definition-lifecycle.mjs';
import {proposeOwnedPrimitiveEffectUnitAdoption as adopt} from '../owned-primitive-effect-unit-adoption.mjs';
import {proposeOwnedVectorBulkModuleSynchronization as bulk} from '../owned-vector-bulk-module-synchronization.mjs';
import {receivingPrimitiveValueDefinitionFamily as family} from '../owned-unit-definition-routing.mjs';
import {receivingPrimitiveVectorDefinitionsRequested as oldVectorRequest} from '../owned-vector-definition-routing.mjs';
import {proposeOwnedPrimitiveEffectFunctionInsertion as publicEffect} from '../../source-synchronization.mjs';
import {prepareUnitDefinitionRoutingSources} from '../../prepare-unit-definition-routing-sources.mjs';
const types='import type {RustU8} from "../runtime/primitive-operator-runtime.mjs";\n';
function options(source,javascript=false){return {sourcePath:JS,typescriptPath:TS,nativeRoute:route,...(javascript?{javascript:source}:{typescript:source})};}
function apply(input,plan){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const row of plan.outputs)files.set(row.path,row.after);return {...input,vectorBindings:[...input.vectorBindings.filter(row=>row.javascriptPath!==JS),...plan.bindings],files:[...files].map(([path,source])=>({path,source}))};}
function source(javascript=false){return javascript?operationImport+'/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} value */\nexport function check(value){const checked=math(value,1n,8,false,"add");return;}\n/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} value @param {boolean} flag */\nexport function values(value,flag){check(value);return flag;}':types+operationImport+'export function check(value:RustU8){const checked=math(value,1n,8,false,"add");return;}export function values(value:RustU8,flag:boolean):boolean{check(value);return flag;}';}
for(const javascript of [false,true])test('standalone scalar/unit modules insert from '+(javascript?'JavaScript':'TypeScript')+' with no Vec or written unit result',limits,async t=>{
 const input=emptyFixture(),requested=source(javascript),plan=effectInsert(input,options(requested,javascript)),row=receiving(apply(input,plan));assert.equal(plan.bindings.length,2);assert.equal(plan.schema,'router-owned-primitive-effect-function-insertion-v1');assert.equal(row.result.program.find(item=>item.javascript==='check').returns,'unit');
 for(const get of await insertionTargets(t,row)){assert.equal(get('check',3n),undefined);assert.equal(get('values',3n,false),false);assert.equal(get('values',3n,true),true);assert.throws(()=>get('values',255n,false),/attempt to add with overflow/u);}
 assert.equal(sync(row).selectedFunctions.length,2);assert.equal(plan.rustExecuted,false);assert.equal(plan.runtimeParity,false);assert.strictEqual(publicEffect,effectInsert);assert.throws(()=>insert(input,requested,javascript));
});
test('bulk dispatch selects scalar/unit insertion without requiring an artificial vector',limits,()=>{
 const requested=source(),plan=bulk(emptyFixture(),[options(requested)]);assert.equal(plan.modules.length,1);assert.equal(plan.modules[0].bindings.length,2);assert.equal(plan.modules[0].newNativeFunctions,true);assert.equal(plan.rustExecuted,false);
 assert.equal(family(options(requested)),'unit-call');assert.equal(oldVectorRequest(options(requested)),false);assert.equal(family(options('export function values(value:boolean){return [value];}')),'vector');assert.equal(family(options('export function values(value:boolean){return value;}')),'scalar');
});
test('a module containing only unit helpers retains implicit empty and explicit bare returns',limits,async t=>{
 const requested='export function check(value:boolean){}export function relay(value:boolean){check(value);}',input=emptyFixture(),plan=effectInsert(input,options(requested)),row=receiving(apply(input,plan));assert.equal(plan.bindings.length,2);assert.deepEqual(row.result.program.map(item=>item.returns),['unit','unit']);
 for(const get of await insertionTargets(t,row)){assert.equal(get('check',true),undefined);assert.equal(get('relay',false),undefined);assert.throws(()=>get('relay',1));}
 assert.equal(family(options(requested)),'unit-call');assert.equal(sync(row).selectedFunctions.length,2);
});
test('one standalone unit helper supports every exact primitive scalar return width',limits,async t=>{
 const imports='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n',requested=imports+operationImport+'export function check(value:RustU8){const checked=math(value,1n,8,false,"add");}'+PRIMITIVE_BITWISE_TYPES.map(domain=>'export function scalar_'+domain.name+'(value:'+domain.alias+',input:RustU8):'+domain.alias+'{check(input);return value;}').join('\n'),input=emptyFixture(),plan=effectInsert(input,options(requested)),row=receiving(apply(input,plan));
 assert.equal(plan.bindings.length,11);for(const get of await insertionTargets(t,row))for(const domain of PRIMITIVE_BITWISE_TYPES){const value=BigInt(domain.maximum);assert.equal(get('scalar_'+domain.name,value,3n),value);assert.throws(()=>get('scalar_'+domain.name,value,255n),/attempt to add with overflow/u);}
});
test('standalone unit helpers extend, bootstrap, reconcile and remove with complete caller checks',limits,async t=>{
 const original=emptyFixture(),initial=effectInsert(original,options(source())),input=apply(original,initial),extra='export function added(value:RustU8):void{check(value);return;}',extension=extend(input,options(source()+extra));assert.equal(extension.addedBindings.length,1);const extended=apply(input,extension),row=receiving(extended);for(const get of await insertionTargets(t,row)){assert.equal(get('added',3n),undefined);assert.throws(()=>get('added',255n),/attempt to add with overflow/u);}
 const helper=helpers(input,options(types+'export function added(value:RustU8):void{check(value);return;}'));assert.ok(helper.supportProgram.some(item=>item.javascript==='check'&&item.returns==='unit'));
 const removed=remove(extended,options(source()));assert.equal(removed.removedBindings.length,1);assert.equal(removed.removedBindings[0].javascriptName,'added');const mixed=reconcile(extended,options(source()+'export function replacement(value:RustU8):void{check(value);return;}'));assert.equal(mixed.addedBindings[0].javascriptName,'replacement');assert.equal(mixed.removedBindings[0].javascriptName,'added');
 const external={...extended,files:extended.files.map(file=>file.path==='src/lib.rs'?{...file,source:file.source+'\npub fn outside(value:u8){target::added(value)}'}:file)};assert.throws(()=>remove(external,options(source())));
});
test('standalone unit source adopts a genuinely absent receiving/native module',limits,()=>{
 const input=emptyFixture();input.vectorBindings=[];input.files=input.files.filter(row=>row.path!==JS&&row.path!==TS);input.files.find(row=>row.path==='src/lib.rs').source=input.files.find(row=>row.path==='src/lib.rs').source.replace('pub mod target { /* original empty module */ }','');
 const requested=source(),plan=adopt(input,options(requested));assert.equal(plan.bindings.length,2);assert.ok(plan.outputs.some(row=>row.path==='src/lib.rs'&&row.after.includes('pub mod target')));assert.equal(plan.rustExecuted,false);
 const routed=bulk(input,[{...options(requested),newNativeModule:true}]);assert.equal(routed.modules[0].newNativeModule,true);assert.equal(routed.modules[0].bindings.length,2);
});
test('unit source routing ignores comments, nested declarations and nested class bodies',limits,()=>{
 for(const requested of ['// function check():void{} check();\nexport function values(value:boolean){return value;}','export function values(value:boolean){function check():void{}check();return value;}','export function values(value:boolean){class Nested{check():void{}}return value;}'])assert.equal(family(options(requested)),'scalar');
 const malformed='export function values(';assert.throws(()=>family(options(malformed)));assert.throws(()=>family({sourcePath:JS,typescriptPath:TS,typescript:17}));
});
test('syntactic unit inference never erases valued returns or grants arbitrary effect permission',limits,()=>{
 for(const requested of ['export function check(value:boolean){return value;}export function values(value:boolean):boolean{check(value);return value;}','export function check(value:boolean){console.log(value);}export function values(value:boolean):boolean{check(value);return value;}','export function check(value:boolean){return;}export function values(value:boolean):boolean{check(1n);return value;}','export function check(value:boolean){check(value);}export function values(value:boolean):boolean{check(value);return value;}','export function check(value:boolean){return;}export function values(value:boolean):boolean{const check=()=>undefined;check();return value;}']){const input=emptyFixture(),before=JSON.stringify(input);assert.throws(()=>effectInsert(input,options(requested)));assert.equal(JSON.stringify(input),before);}
});
test('nine complete source equations preserve originals, whole inverses and both rule sequences',limits,()=>{
 const plan=prepareUnitDefinitionRoutingSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
