// Independent owning-value-field resource/source inverse cases. Entirely UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../../json-fields-native-source.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object} from '../../json-macro-runtime.mjs';
import {json_macro_array as array,json_macro_bool as bool,json_macro_u64 as unsigned} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},keys=['0','a/b','~é😀','last'],wrap=(depth,leaf)=>depth?keys.slice(0,depth).reduceRight((value,key)=>object([[key,value]]),leaf):array([leaf]);
const specs=[0,1,2,3,4].flatMap(depth=>['borrowed-null','owned-option','owned-null'].map(mode=>({depth,mode,name:'json_'+(mode==='borrowed-null'?'':'owned_')+(depth?'field'+(depth===1?'':depth):'index')+(mode.endsWith('null')?'_or_null':'')})));
const source="import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\nimport {"+specs.map(row=>'router_field_'+row.name+' as '+row.name).join(',')+"} from './runtime/json-fields-runtime.mjs';\n"+specs.map(row=>'/** @param {Parameters<typeof '+row.name+'>[0]} value */\nexport function '+row.name+'Value(value){'+(row.mode==='borrowed-null'?'':'const owner=copy(value);')+'return '+row.name+'('+(row.mode==='borrowed-null'?'value':'owner')+','+(row.depth?keys.slice(0,row.depth).map(key=>JSON.stringify(key)).join(','):'0n')+');}\n').join('');
function input(value=source,sourcePath='caller.mjs'){const data=httpResourceReceivingData([{path:sourcePath,source:value}]);data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_json_fields_core;\n';data.files.push({path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE});return {sourcePath,...data};}

test('all15 selected value/optional/default contracts receive JS strict TS and complete native inverse without borrowed escapes',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{for(const spec of specs)for(const leaf of [nil(),bool(false),unsigned(18446744073709551615n),text('é😀'),object([['nested',array([text('é😀')])]])]){assert.deepEqual(api[spec.name+'Value'](wrap(spec.depth,leaf)),spec.mode==='owned-option'?{$:'Some',field0:leaf}:leaf);assert.deepEqual(api[spec.name+'Value'](nil()),spec.mode==='owned-option'?{$:'None'}:nil());}});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);
});
for(const operation of ['json_field_or_null','json_index_or_null'])test(operation+' still refuses returning a view of a local JSON owner',limits,()=>{
 const source="import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\nimport {router_field_"+operation+" as field} from './runtime/json-fields-runtime.mjs';\n/** @param {Parameters<typeof field>[0]} value */\nexport function escape(value){const local=copy(value);return field(local,"+(operation.includes('index')?'0n':"'name'")+");}";assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)),/loan|root|borrow|escape/u);
});
