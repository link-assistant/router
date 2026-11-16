// Primitive constant value and source-linked selection drafts. ALL UNRUN.
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



import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {prepareNativeConstantValuesSources} from '../../prepare-native-constant-values-sources.mjs';
function constantValues(domain){const type=domain.name,literal=value=>value+'_'+type,rows=[
 ['equal','bool','('+literal(3)+'+'+literal(4)+')=='+literal(7),true],
 ['different','bool','('+literal(3)+'+'+literal(4)+')!='+literal(7),false],
 ['less','bool','('+literal(3)+'*'+literal(2)+')<'+literal(7),true],
 ['less_equal','bool','('+literal(3)+'+'+literal(4)+')<='+literal(7),true],
 ['greater','bool','('+literal(3)+'+'+literal(4)+')>'+literal(7),false],
 ['greater_equal','bool','('+literal(3)+'+'+literal(4)+')>='+literal(7),true],
 ['logical','bool','!(false || true) && true',false],
 ['boolean_bits','bool','(true ^ false) & true',true],
 ['choice',type,'if ('+literal(3)+'+'+literal(4)+')=='+literal(7)+' {'+literal(5)+'*'+literal(2)+'} else {'+literal(0)+'}',10n],
 ['local',type,'{let count='+literal(3)+'+'+literal(4)+';count*'+literal(2)+'}',14n],
 ['and',type,'('+literal(3)+'+'+literal(4)+') & '+literal(3),3n],
 ['or',type,'('+literal(3)+'+'+literal(4)+') | '+literal(8),15n],
 ['xor',type,'('+literal(3)+'+'+literal(4)+') ^ '+literal(3),4n],
 ['not',type,'!('+literal(3)+'+'+literal(4)+')',domain.signed?-8n:BigInt(domain.maximum)-7n],
 ['cast',type,'(255_u8 as '+type+')',domain.signed&&domain.bits===8?-1n:255n],
 ['saturating_add',type,'('+domain.maximum+'_'+type+').saturating_add('+literal(1)+')',BigInt(domain.maximum)],
 ['saturating_sub',type,'('+literal(0)+').saturating_sub('+literal(1)+')',domain.signed?-1n:0n],
 ['saturating_mul',type,'('+domain.maximum+'_'+type+').saturating_mul('+literal(2)+')',BigInt(domain.maximum)],
 ['wrapping_add',type,'('+domain.maximum+'_'+type+').wrapping_add('+literal(1)+')',domain.signed?-BigInt(domain.minimumAbs):0n],
 ['wrapping_sub',type,'('+literal(0)+').wrapping_sub('+literal(1)+')',domain.signed?-1n:BigInt(domain.maximum)],
 ],valueSource=value=>typeof value==='boolean'?String(value):value+'n',source=rows.map(([name,, ,value])=>'export function constant_'+name+'(){return '+valueSource(value)+';}').join('\n'),typed='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n'+rows.map(([name,result,,value])=>'export function constant_'+name+'():'+(result==='bool'?'boolean':domain.alias)+'{return '+valueSource(value)+';}').join('\n'),rust=rows.map(([name,result,expression])=>'pub const VALUE_'+name.toUpperCase()+':'+result+' = '+expression+';pub fn constant_'+name+'()->'+result+'{VALUE_'+name.toUpperCase()+'}').join('\n'),input=data(rust,source,typed);input.vectorBindings=rows.map(([name])=>({javascriptPath:JS,javascriptName:'constant_'+name,rustPath:'src/lib.rs',rustName:'constant_'+name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result,rows};}
for(const domain of PRIMITIVE_BITWISE_TYPES)test('complete primitive constant selections and total operations preserve original '+domain.name+' source observations',limits,async()=>{const row=constantValues(domain),original=forward(row,{rustEdits:[]});for(const item of row.result.program){const entry=original.executableDeclarations.find(entry=>entry.qualifiedName===item.javascript);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower()),requestedNativeJsonVectorTree(item));}const input=structuredClone(row.input);input.files=input.files.filter(file=>file.path!==JS&&file.path!==TS);input.vectorBindings=[];const discovery=proposeOwnedNativeBulkDiscovery(input),module=discovery.modules.find(row=>row.rustSource==='src/lib.rs');assert.ok(module);assert.equal(module.bindings.length,row.rows.length);let project;for(const authority of ['javascript','typescript']){const proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,[authority]:row.input.files.find(file=>file.path===(authority==='javascript'?JS:TS)).source});assert.equal(proposal.selectedFunctions.length,row.rows.length);project=forward(row,proposal);assert.equal(proposal.rustExecuted,false);}await verifyTypedTargets(project,api=>{for(const [name,,,value]of row.rows)assert.equal(api['constant_'+name](),value);},{childTimeoutMs:20000});assert.equal(discovery.runtimeParity,false);});
test('constant rules retain mutable pointer float borrowed and unsupported failure protocols',limits,()=>{for(const [type,expression]of [['u8','{let mut value=1_u8;value=2_u8;value}'],['u8','if true {1_u8}else{1_u8/0_u8}'],['u8','1_u8 << 8_u8'],['f64','1.5_f64'],['usize','1_usize'],["&'static str",'"text"']]){const input=data('pub const VALUE:'+type+'='+expression+';pub fn values()->'+type+'{VALUE}','','');input.vectorBindings=[];const plan=proposeOwnedNativeBulkDiscovery(input);assert.equal(plan.modules.some(module=>module.bindings.some(row=>row.rustName==='values')),false);assert.ok(plan.refusals.some(row=>row.name==='values'));assert.equal(plan.runtimeParity,false);}});
test('three complete constant-value source equations preserve full inverse and fixed phases',limits,()=>{const plan=prepareNativeConstantValuesSources();assert.equal(plan.files.length,3);for(const file of plan.files){assert.equal(file.current,file.currentAfter);assert.equal(file.inverse,file.before);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
