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


import {prepareWideScalarUnitsSources} from '../../prepare-wide-scalar-units-sources.mjs';
import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {proposeOwnedNativeBulkSynchronization} from '../owned-native-bulk-composition.mjs';
import {proposeOwnedNativeBulkModuleRefresh} from '../owned-native-bulk-module-refresh.mjs';
import {ownedIntegerLiteral,narrowOwnedNumericLiteral} from '../owned-numeric-literals.mjs';
const wideTypes=['u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'],typedScalar=type=>type==='bool'?'boolean':'bigint';
function range(type){const bits=BigInt(type.slice(1)),signed=type[0]==='i',limit=1n<<(signed?bits-1n:bits);return {min:signed?-limit:0n,max:limit-1n};}
const wideRows=wideTypes.flatMap(type=>[
 {name:'identity_'+type,type,params:[['value',type]],body:'return value;',rust:'value'},
 {name:'choose_'+type,type,params:[['flag','bool'],['value',type]],body:'return flag?value:0n;',rust:'if flag { value } else { 0_'+type+' }'},
 {name:'compare_'+type,type:'bool',params:[['left',type],['right',type]],body:'return left<right;',rust:'left < right'},
 {name:'local_'+type,type,params:[['value',type]],body:'const copy=value;return copy;',rust:'let copy=value;copy'},
]);
function wideFixture(rows=wideRows){const source=rows.map(row=>'export function '+row.name+'('+row.params.map(([name])=>name).join(',')+'){'+row.body+'}').join('\n'),typed=rows.map(row=>'export function '+row.name+'('+row.params.map(([name,type])=>name+':'+typedScalar(type)).join(',')+'):'+typedScalar(row.type)+'{'+row.body+'}').join('\n'),rust=rows.map(row=>'pub fn '+row.name+'('+row.params.map(([name,type])=>name+':'+type).join(',')+')->'+row.type+' { '+row.rust+' }').join('\n'),input=data(rust,source,typed);input.vectorBindings=rows.map(row=>({javascriptPath:JS,javascriptName:row.name,rustPath:'src/lib.rs',rustName:row.name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const javascript of [false,true])test('ten exact native scalar widths preserve identities locals branches and comparisons authority '+javascript,limits,async()=>{
 const row=wideFixture(),proposal=sync(row,javascript),project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,40);assert.ok(proposal.typescript.includes('RustU8'));assert.ok(proposal.typescript.includes('RustI128'));const runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);
 await verifyTypedTargets(project,api=>{for(const type of wideTypes){const {min,max}=range(type);for(const value of [min,0n,max]){assert.equal(api['identity_'+type](value),value);assert.equal(api['local_'+type](value),value);assert.equal(api['choose_'+type](true,value),value);assert.equal(api['choose_'+type](false,value),0n);assert.equal(evaluateOwnedVectorCandidate(row.result.program,'identity_'+type,[value],runtime),value);}assert.equal(api['compare_'+type](min,max),min<max);assert.throws(()=>evaluateOwnedVectorCandidate(row.result.program,'identity_'+type,[min-1n],runtime));assert.throws(()=>evaluateOwnedVectorCandidate(row.result.program,'identity_'+type,[max+1n],runtime));}},{childTimeoutMs:20000});assert.equal(proposal.rustExecuted,false);assert.equal(proposal.runtimeParity,false);
});
test('actual native scalar widths enter automatic discovery and a fresh Rust refresh',limits,()=>{const row=wideFixture(wideRows.filter(row=>row.name.startsWith('identity_'))),input=structuredClone(row.input);input.files=input.files.filter(file=>![JS,TS].includes(file.path));input.vectorBindings=[];const first=proposeOwnedNativeBulkSynchronization(input),module=first.modules.find(row=>row.rustSource==='src/lib.rs');assert.equal(module.bindings.length,10);const files=new Map(input.files.map(row=>[row.path,row.source]));for(const edit of [...first.nativeEdits,...first.outputs])files.set(edit.path,edit.after);const installed={...input,vectorBindings:first.modules.flatMap(row=>row.bindings),files:[...files].map(([path,source])=>({path,source}))},sourcePath=module.bindings[0].javascriptPath,typescriptPath=sourcePath.replace('app/','typed/').replace(/\.mjs$/u,'.mts'),again=proposeOwnedNativeBulkModuleRefresh(installed,[{sourcePath,typescriptPath}]);assert.deepEqual(again.nativeEdits,[]);assert.ok(again.outputs.every(row=>row.before===row.after));});
test('all actual fixed-width literal boundaries are parsed with exact ranges and narrow immutably known values',limits,()=>{for(const type of wideTypes){const {min,max}=range(type);for(const value of [min,max]){const negative=value<0n,parsed=ownedIntegerLiteral((negative?-value:value)+'n',{negative,domain:type});assert.equal(parsed.type,type);assert.equal(parsed.value,value.toString());}assert.throws(()=>ownedIntegerLiteral((max+1n)+'n',{domain:type}));if(min<0n)assert.throws(()=>ownedIntegerLiteral((-min+1n)+'n',{negative:true,domain:type}));const value={kind:'integer',value:'1',type:'usize',root:null};assert.equal(narrowOwnedNumericLiteral(value,type).type,type);}});
test('qualified wide local witnesses permit high literals and retain strict imported declaration ownership',limits,()=>{const imports='import type {RustU128} from "../runtime/primitive-operator-runtime.mjs";\n',source='export function high(){const huge=340282366920938463463374607431768211455n;return huge>0n;}',typed=imports+'export function high():boolean {const huge:RustU128=340282366920938463463374607431768211455n;return huge>0n;}',input=data('pub fn high()->bool { false }',source,typed);input.vectorBindings=[{javascriptPath:JS,javascriptName:'high',rustPath:'src/lib.rs',rustName:'high'}];const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});assert.ok(result.typescript.includes('RustU128'));const changed=structuredClone(input);changed.files.find(row=>row.path==='typed/runtime/primitive-operator-runtime.d.mts').source+='\n// forged declaration';assert.throws(()=>createOwnedVectorCandidateContext(changed));});
test('wide helpers remain complete same-module pure source calls',limits,()=>{const rows=[{name:'wide_leaf',type:'u32',params:[['value','u32']],body:'return value;',rust:'value'},{name:'wide_caller',type:'u32',params:[['value','u32']],body:'return wide_leaf(value);',rust:'0_u32'}],row=wideFixture(rows),proposal=sync(row);assert.ok(proposal.rustEdits[0].after.includes('crate::wide_leaf(value)'));assert.equal(proposal.rustExecuted,false);});
test('float pointer borrowed generic and cross-width implicit conversion remain separate source contracts',limits,()=>{for(const row of [{name:'bad',type:'u8',params:[['value','u16']],body:'return value;',rust:'0_u8'},{name:'bad',type:'i8',params:[],body:'return 128n;',rust:'0_i8'},{name:'bad',type:'u8',params:[],body:'return -1n;',rust:'0_u8'}])assert.throws(()=>wideFixture([row]));});
test('sixteen complete wide scalar source equations retain exact phase order and inverses',limits,()=>{const plan=prepareWideScalarUnitsSources();assert.equal(plan.files.length,16);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
