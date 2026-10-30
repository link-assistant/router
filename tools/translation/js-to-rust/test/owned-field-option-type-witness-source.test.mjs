// Independent actual field-only type-source/receiving cases. ALL execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as outcome from '../owned-outcome.mjs';
import * as cancellation from '../owned-cancellation.mjs';
import {translateOwnedStateRust as inverseOutcome} from '../owned-outcome-rust.mjs';
import {translateOwnedStateRust as inverseCancellation} from '../owned-cancellation-rust.mjs';
import {projectOwnedRustFunctions as projectOutcome} from '../owned-outcome-rust-projection.mjs';
import {projectOwnedRustFunctions as projectCancellation} from '../owned-cancellation-rust-projection.mjs';
import {readOwnedRustFunction} from '../owned-primitive-vector-rust-syntax.mjs';
import {sourceItems} from '../../rust-structure.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {ownedFieldTextOptionTypeWitness,ownedFieldTextOptionTypeLibrary} from '../owned-field-option-type-witness.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../../json-fields-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../../primitive-option-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../../integer-native-source.mjs';
import {prepareOwnedFieldOptionTypeWitnessSources} from '../../prepare-owned-field-option-type-witness-sources.mjs';
import {json_macro_null as nil,json_macro_bool as boolean,json_macro_string as text,json_macro_object as object,json_macro_u64 as unsigned} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url)),none={$:'None'},some=field0=>({$:'Some',field0});
const source="import {router_field_json_text_field as field,router_field_json_text_field2 as nested} from './runtime/json-fields-runtime.mjs';\n"+
 '/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function one(value){return field(value,"error_code");}\n'+
 '/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function two(value){return nested(value,"details","error_code");}\n'+
 '/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value */\nexport function choose(value){const first=two(value);if(first.$==="Some"){return first;}const second=one(value);if(second.$==="Some"){return second;}return field(value,"code");}\n';
function data(family,files=[{path:'caller.mjs',source}]){const input=(family==='outcome'?ownedStateReceivingData:ownedCancellationReceivingData)(files);input.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_json_fields_core;\npub mod translation_text_core;\npub mod translation_primitive_option_core;\npub mod translation_integer_core;\n';input.files.push({path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE},{path:'src/translation_text_core.rs',source:TEXT_NATIVE_SOURCE},{path:'src/translation_primitive_option_core.rs',source:PRIMITIVE_OPTION_NATIVE_SOURCE},{path:'src/translation_integer_core.rs',source:INTEGER_NATIVE_SOURCE});return input;}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-json-fields-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const file of row.input.files.filter(file=>/\.(mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20_000});for(const file of row.input.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];
}

const examples=[
 [object([['details',object([['error_code',text('nested')]])],['error_code',text('flat')],['code',text('last')]]),some('nested')],
 [object([['details',object([['error_code',text('')]])],['error_code',text('flat')]]),some('')],
 [object([['details',object([['error_code',boolean(false)]])],['error_code',text('flat')]]),some('flat')],
 [object([['details',object([['error_code',unsigned(0n)]])],['error_code',boolean(false)],['code',text('last')]]),some('last')],
 [object([['details',nil()],['error_code',text('')],['code',text('last')]]),some('')],
 [object([['details',object([['error_code',text('λ😀')]])]]) ,some('λ😀')],
 [nil(),none],[boolean(false),none],[object([]),none],
];
for(const family of ['outcome','cancellation'])test(family+' field-only optional owned text signatures use actual field ABI without unrelated Result core dependencies',limits,async t=>{
 const api=family==='outcome'?outcome:cancellation,input=data(family),context=api.createOwnedOutcomeContext(input),result=api.translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'});assert.equal(input.files.some(row=>row.path==='src/translation_primitive_results_core.rs'||row.path==='src/translation_owned_results_core.rs'),false);assert.match(result.typescript,/ReturnType<typeof __ro_router_field_json_text_field>/u);assert.doesNotMatch(result.typescript,/(?:primitive-result|owned-result)-runtime/u);const modules=await targets(t,{input,result}),token=await api.prepareOwnedOutcomeRuntime(result.program);for(const module of modules)for(const [value,wanted]of examples)assert.deepEqual(module.choose(value),wanted);for(const [value,wanted]of examples)assert.deepEqual(api.evaluateOwnedOutcome(result.program,'choose',[value],token),wanted);assert.deepEqual(api.evaluateOwnedOutcomeBatch(result.program,examples.map(([value])=>['choose',[value]]),token),examples.map(row=>row[1]));
 const reissued=api.readOwnedOutcomeMeta(result.meta,{context});assert.equal(api.emitOwnedOutcomeRust(reissued),result.rust);assert.equal(api.translateOwnedOutcomeConcreteSyntaxMeta(result.concreteSyntax.meta,{context,sourcePath:'caller.mjs'}).rust,result.rust);const typed=api.translateOwnedOutcomeTypeScript(result.typescript,{context:api.createOwnedOutcomeContext(data(family,[{path:'caller.mts',source:result.typescript}])),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,result.rust));
 const native={...input,files:input.files.concat([{path:'caller.rs',source:result.rust}])},inverse=(family==='outcome'?inverseOutcome:inverseCancellation)(result.rust,{context:api.createOwnedOutcomeContext(native),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,result.rust);assert.doesNotMatch(inverse.javascript,/(?:primitive-result|owned-result)-runtime/u);assert.equal(inverse.wholeRouterSynchronization,false);assert.equal(result.runtimeParity,false);
 const functions=sourceItems(result.rust).filter(item=>item.term==='fn'&&['one','two','choose'].includes(item.name)).map(item=>readOwnedRustFunction(result.rust.slice(item.start,item.end))),project=family==='outcome'?projectOutcome:projectCancellation,legacy=project(functions,{javascriptPath:'caller.mjs',runtimeRoot:'runtime'}),field=project(functions,{javascriptPath:'caller.mjs',runtimeRoot:'runtime',textOptionTypeLibrary:'json-fields'});assert.match(legacy.javascript,/primitive-result-runtime/u);assert.doesNotMatch(field.javascript,/primitive-result-runtime/u);assert.equal(legacy.sourceAuthority,false);assert.equal(field.semanticAuthority,false);assert.throws(()=>project(functions,{javascriptPath:'caller.mjs',runtimeRoot:'runtime',textOptionTypeLibrary:'forged'}));
});
for(const family of ['outcome','cancellation'])test(family+' type witness selection rejoins complete native runtime declaration root and genuine source caller',limits,()=>{const api=family==='outcome'?outcome:cancellation,input=data(family),context=api.createOwnedOutcomeContext(input),result=api.translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'});assert.equal(ownedFieldTextOptionTypeWitness(result.program,input),'router_field_json_text_field');assert.equal(ownedFieldTextOptionTypeLibrary(new Map(input.files.map(row=>[row.path,row.source])),input),'json-fields');for(const path of ['src/translation_json_fields_core.rs','runtime/json-fields-runtime.mjs','runtime/json-fields-runtime.d.mts']){const bad=data(family);bad.files.find(row=>row.path===path).source+='\n// changed actual source\n';assert.throws(()=>api.translateOwnedOutcomeJavaScript(source,{context:api.createOwnedOutcomeContext(bad),sourcePath:'caller.mjs'}));assert.throws(()=>ownedFieldTextOptionTypeLibrary(new Map(bad.files.map(row=>[row.path,row.source])),bad));}const missing=data(family);missing.files=missing.files.filter(row=>row.path!=='src/translation_json_fields_core.rs');assert.throws(()=>ownedFieldTextOptionTypeLibrary(new Map(missing.files.map(row=>[row.path,row.source])),missing));const forged=structuredClone(result.program);forged[0].body={kind:'string',value:'counterfeit',type:'text-owned-option',root:null};assert.throws(()=>api.emitOwnedOutcomeRust(forged));});
test('eight complete source equations retain original projection defaults both fixed phases and full current inverses',limits,()=>{const plan=prepareOwnedFieldOptionTypeWitnessSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
