// Independent owning-field resource/source inverse cases. Entirely UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../../json-fields-native-source.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},keys=['0','a/b','~é😀','last'],specs=[1,2,3,4].flatMap(depth=>[false,true].map(empty=>({depth,empty,name:'json_text_field'+(depth===1?'':depth)+(empty?'_or_empty':'')}))),wrap=(depth,leaf)=>keys.slice(0,depth).reduceRight((value,key)=>object([[key,value]]),leaf);
const source="import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\nimport {"+specs.map(row=>'router_field_'+row.name+' as '+row.name).join(',')+"} from './runtime/json-fields-runtime.mjs';\n"+specs.map(row=>'/** @param {Parameters<typeof '+row.name+'>[0]} value */\nexport function '+row.name+'Value(value){const owner=copy(value);return '+row.name+'(owner,'+keys.slice(0,row.depth).map(key=>JSON.stringify(key)).join(',')+');}\n').join('');
function input(value=source,sourcePath='caller.mjs'){const data=httpResourceReceivingData([{path:sourcePath,source:value}]);data.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_json_fields_core;\n';data.files.push({path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE});return {sourcePath,...data};}
test('every owned field result releases its local JSON lifetime in the complete resource checker JS strict TS and full native inverse',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.ok(JSON.parse(result.meta).functions.every(row=>row.flow.returnRoots.length===0));await verifyHttpResourceTargets(result,async api=>{for(const spec of specs){assert.deepEqual(api[spec.name+'Value'](wrap(spec.depth,text('é😀'))),spec.empty?'é😀':{$:'Some',field0:'é😀'});assert.deepEqual(api[spec.name+'Value'](nil()),spec.empty?'':{$:'None'});}});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);
});
