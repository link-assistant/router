// Contextual default-sized choice local source cases. ALL UNRUN.
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


import {prepareContextualChoiceInferenceSources} from '../../prepare-contextual-choice-inference-sources.mjs';
import {createPrimitiveScalarInference as oldInference} from '../owned-primitive-scalar-inference.mjs';
import {createPrimitiveContextualInference as currentInference} from '../owned-primitive-contextual-inference.mjs';
import {createOwnedNativeBitwiseHistory as oldHistory} from '../owned-native-bitwise-source.mjs';
import {createOwnedContextualBitwiseHistory as currentHistory} from '../owned-native-contextual-history.mjs';
import {ownershipCompiler} from '../vendor/module-syntax.mjs';
const typeImport='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n';
function inserted(source,javascript=false){const input=emptyFixture(),plan=insert(input,source,javascript);return {...receiving(installed(input,plan)),plan};}
test('default-sized choice locals and aliases use actual vector domains for all ten widths',limits,async t=>{
 const requested=typeImport+PRIMITIVE_BITWISE_TYPES.map(domain=>'export function values_'+domain.name+'(value:'+domain.alias+',flag:boolean):readonly '+domain.alias+'[]{const selected=flag?0n:1n;const copied=selected;return [copied,selected,value];}').join('\n'),row=inserted(requested);
 assert.equal(row.plan.bindings.length,10);for(const get of await insertionTargets(t,row))for(const domain of PRIMITIVE_BITWISE_TYPES)for(const flag of [false,true])assert.deepEqual(get('values_'+domain.name,BigInt(domain.maximum),flag),[flag?0n:1n,flag?0n:1n,BigInt(domain.maximum)]);assert.equal(sync(row).selectedFunctions.length,10);
});
test('raw fixed-width bitwise operands use the same actual contextual join across all ten widths',limits,async t=>{
 const requested=typeImport+PRIMITIVE_BITWISE_TYPES.map(domain=>'export function values_'+domain.name+'(value:'+domain.alias+',flag:boolean):readonly '+domain.alias+'[]{const selected=flag?0n:1n;const result=selected&value;return [result,value];}').join('\n'),row=inserted(requested);
 for(const get of await insertionTargets(t,row))for(const domain of PRIMITIVE_BITWISE_TYPES)for(const flag of [false,true])assert.deepEqual(get('values_'+domain.name,BigInt(domain.maximum),flag),[flag?0n:1n,BigInt(domain.maximum)]);assert.equal(sync(row).selectedFunctions.length,10);
});
test('a signed default choice promotes only through the actual narrower signed use',limits,async t=>{
 const requested=typeImport+'export function values(value:RustI8,flag:boolean):readonly RustI8[]{const first=flag?-1n:-2n;const second=flag?-2n:-1n;const equal=first===second;return [first,second,value];}',row=inserted(requested),item=row.result.program[0];
 for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,true),[-1n,-2n,3n]);assert.deepEqual(get('values',3n,false),[-2n,-1n,3n]);}assert.equal(sync(row).selectedFunctions.length,1);
});
test('contextual choices pass real typed helper arguments and join actual scalar return domains',limits,async t=>{
 const requested=typeImport+'export function identity(value:RustU8):RustU8{return value;}export function scalar(value:RustU8,flag:boolean,select:boolean){const choice=flag?0n:1n;if(select){return choice;}else{return value;}}export function values(value:RustU8,flag:boolean):readonly RustU8[]{const choice=flag?0n:1n;return [identity(choice),scalar(value,flag,true),value];}',row=inserted(requested);
 for(const get of await insertionTargets(t,row))for(const flag of [false,true]){assert.equal(get('scalar',3n,flag,true),flag?0n:1n);assert.equal(get('scalar',3n,flag,false),3n);assert.deepEqual(get('values',3n,flag),[flag?0n:1n,flag?0n:1n,3n]);}assert.equal(sync(row).selectedFunctions.length,3);
});
test('an unpromoted default choice keeps the existing default scalar result',limits,async t=>{
 const requested='export function scalar(flag:boolean){const selected=flag?0n:1n;return selected;}export function values(value:boolean){return [value];}',row=inserted(requested);for(const get of await insertionTargets(t,row)){assert.equal(get('scalar',true),0n);assert.equal(get('scalar',false),1n);assert.deepEqual(get('values',true),[true]);}
});
test('JavaScript/JSDoc default choices preserve exact typed uses without local annotations',limits,async t=>{
 const requested='/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} value @param {boolean} flag */\nexport function values(value,flag){const selected=flag?0n:1n;const copied=selected;return [copied,value];}',row=inserted(requested,true);for(const get of await insertionTargets(t,row))for(const flag of [false,true])assert.deepEqual(get('values',3n,flag),[flag?0n:1n,3n]);
});
test('contextual choice candidates refuse width conflicts, absent anchors and literal-only signed anchors',limits,()=>{
 for(const requested of [typeImport+'export function signed(value:RustI8):RustI8{return value;}export function values(value:RustU8,flag:boolean):readonly RustU8[]{const choice=flag?0n:1n;const consumed=signed(choice);return [choice,value];}',typeImport+'export function values(flag:boolean){const choice=flag?0n:1n;return [choice];}',typeImport+'export function values(value:RustU8,flag:boolean){const choice=flag?-1n:-2n;return [choice,value];}',typeImport+'export function values(flag:boolean){const small=flag?-1n:-2n;const big=flag?-18446744073709551616n:0n;return [small,big];}']){const input=emptyFixture(),before=JSON.stringify(input);assert.throws(()=>insert(input,requested));assert.equal(JSON.stringify(input),before);}
});
test('choice handles belong only to their current inference and original APIs stay separate',limits,()=>{
 const first=currentInference(),second=currentInference(),definition={kind:'choose',cond:{kind:'bool',value:true,type:'bool',root:null},then:{kind:'integer',value:'0',type:'usize',root:null},else:{kind:'integer',value:'1',type:'usize',root:null},type:'usize',root:null},handle=first.choiceCandidate(definition),reference={kind:'variable',name:'selected',type:'usize',root:null};assert.ok(handle);assert.throws(()=>second.choiceReference(handle,{...reference}));assert.throws(()=>first.choiceReference({...handle},{...reference}));assert.equal(first.choiceReference(handle,reference).type,'usize');assert.equal(first.choiceReference(handle,{...reference},'u8').type,'u8');assert.equal(reference.type,'u8');assert.throws(()=>first.choiceReference(handle,{...reference},'u16'));assert.equal(typeof oldInference().choiceCandidate,'undefined');
});
test('contextual history captures final live domains once while old history retains its original immediate contract',limits,()=>{
 const ts=ownershipCompiler(),file=ts.createSourceFile('history.mts','left===right;',ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),node=file.statements[0].expression,left={kind:'variable',name:'left',type:'i64',root:null},right={kind:'variable',name:'right',type:'i64',root:null},value={kind:'binary',op:'===',left,right,type:'bool',root:null},old=oldHistory(),current=currentHistory();old.retain(node,file,value);current.retain(node,file,value);assert.equal(old.rows[0].domain,'i64');assert.equal(current.rows.length,0);left.type='i8';right.type='i8';current.finalize();assert.equal(current.rows[0].domain,'i8');assert.equal(old.rows[0].domain,'i64');assert.equal(current.rows[0].sourceAuthority,false);assert.equal(current.rows[0].semanticAuthority,false);assert.throws(()=>current.finalize());assert.throws(()=>current.retain(node,file,value));
});
test('four complete source equations retain whole originals, inverses and both ordered sequences',limits,()=>{
 const plan=prepareContextualChoiceInferenceSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
