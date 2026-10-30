// Independent regression source only. Run after the entire bulk draft exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createOwnedStateContext,ownedStateRuntimeSources,translateOwnedStateJavaScript,prepareOwnedStateRuntime,evaluateOwnedState,evaluateOwnedStateBatch} from '../owned-state.mjs';
import {translateOwnedStateRust} from '../owned-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../../json-state-native-source.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../../json-iteration-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../../router-core-source-data.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../../json-macro-runtime.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60_000};
const source=`import {router_state_json_with_index as replace,router_state_json_merge as merge,router_state_json_without_field as without,router_state_json_from_values as fromValues,router_state_json_values_copy as valuesCopy} from './runtime/json-state-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {json_macro_string as string} from './runtime/json-macro-runtime.mjs';
import {router_core_json_filter as filter,router_core_json_fold as fold} from './runtime/json-iteration-runtime.mjs';
import {serde_json_value_is_null as isNull} from './runtime/json-runtime.mjs';
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} base */
export function replaceFirst(base){return replace(base,0n,string('old'));}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} base @param {import('./runtime/json-macro-runtime.mjs').JsonValue} patch @param {string} key */
export function mergedValue(base,patch,key){const next=merge(base,patch);return without(next,key);}
/** @param {Parameters<typeof fromValues>[0]} values */
export function ownedValues(values){return fromValues(valuesCopy(values));}
/** @param {Parameters<typeof fromValues>[0]} values */
export function filteredValues(values){return filter(values,value=>{return !isNull(value);});}
/** @param {Parameters<typeof fromValues>[0]} values @param {import('./runtime/json-macro-runtime.mjs').JsonValue} initial */
export function foldedValues(values,initial){return fold(values,initial,(accumulator,value)=>{return copy(value);});}
`;
function input(javascript=source){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[
 ...ownedStateRuntimeSources(),
 {path:'src/lib.rs',source:'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n'},
 {path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},
 {path:'src/translation_collections_core.rs',source:JSON_ITERATION_NATIVE_SOURCE},{path:'src/translation_state_core.rs',source:JSON_STATE_NATIVE_SOURCE},
 {path:'Cargo.toml',source:readFileSync(root+'rust/Cargo.toml','utf8')},{path:'Cargo.lock',source:readFileSync(root+'Cargo.lock','utf8')},{path:'caller.mjs',source:javascript},
 ]};}
function inverse(change=value=>value){const data=input(),first=translateOwnedStateJavaScript(source,{context:createOwnedStateContext(data),sourcePath:'caller.mjs'}),rust=change(first.rust);data.files.push({path:'caller.rs',source:rust});const context=createOwnedStateContext(data),result=translateOwnedStateRust(rust,{context,sourcePath:'caller.rs',javascriptPath:'caller.mjs'});return {data,first,rust,context,result};}
test('canonical owned state and iteration Rust must reproduce every input token through fresh checked source',limits,async()=>{
 const {rust,result}=inverse(),token=await prepareOwnedStateRuntime(result.program),requests=[['replaceFirst',[array([nil(),bool(false)])]],['mergedValue',[object([['keep',nil()]]),object([['add',bool(true)]]),'keep']],['ownedValues',[[nil(),text('λ😀')]]],['filteredValues',[[nil(),bool(false),text('')]]],['foldedValues',[[nil(),text('last')],bool(true)]]];
 const expected=[array([text('old'),bool(false)]),object([['add',bool(true)]]),array([nil(),text('λ😀')]),[bool(false),text('')],text('last')];
 assert.equal(sameRustSourceSyntax(rust,result.rust),true);assert.deepEqual(requests.map(([name,args])=>evaluateOwnedState(result.program,name,args,token)),expected);assert.deepEqual(evaluateOwnedStateBatch(result.program,requests,token),expected);
 assert.ok(result.javascript.includes('function replaceFirst('));assert.equal(result.ownedRustSourceHistory.equation.inverse,rust);assert.deepEqual(result.ownedRustRuleTrace.map(row=>row.phase).filter((value,index,values)=>values.indexOf(value)===index),['language','repository']);assert.equal(result.runtimeParity,false);assert.equal(result.rustExecuted,false);
});
test('a real Rust source edit drives new behavior while old paired bodies are proposals only',limits,async()=>{
 const {rust,result}=inverse(value=>value.replace('"old"','"new"')),token=await prepareOwnedStateRuntime(result.program);assert.ok(rust.includes('"new"'));assert.deepEqual(evaluateOwnedState(result.program,'replaceFirst',[array([nil()])],token),array([text('new')]));assert.equal(result.ownedRustSourceHistory.previousJavaScript,source);
});
test('changed omitted guards helpers attributes or extra effects cannot survive complete reproduction',limits,()=>{
 const initial=input(),first=translateOwnedStateJavaScript(source,{context:createOwnedStateContext(initial),sourcePath:'caller.mjs'});
 const mutations=[value=>value.replace('owned JSON state list bound','changed budget'),value=>value.replace('nodes <= 4096','nodes <= 8192'),value=>value+'\nconst EXTRA: u64 = 1;\n',value=>value.replace('#[must_use]','#[inline]'),value=>value.replace('return { let __ro_state_','return { panic!("effect"); let __ro_state_')];
 for(const mutate of mutations){const rust=mutate(first.rust);assert.notEqual(rust,first.rust);const data=structuredClone(initial);data.files.push({path:'caller.rs',source:rust});assert.throws(()=>translateOwnedStateRust(rust,{context:createOwnedStateContext(data),sourcePath:'caller.rs',javascriptPath:'caller.mjs'}));}
});
test('authoritative source paths private contexts and original native libraries remain required',limits,()=>{
 const {data,rust,context}=inverse();assert.throws(()=>translateOwnedStateRust(rust+'\n',{context,sourcePath:'caller.rs',javascriptPath:'caller.mjs'}));assert.throws(()=>translateOwnedStateRust(rust,{context:{},sourcePath:'caller.rs',javascriptPath:'caller.mjs'}));assert.throws(()=>translateOwnedStateRust(rust,{context,sourcePath:'src/translation_state_core.rs',javascriptPath:'caller.mjs'}));
 const changed=structuredClone(data);changed.files.find(row=>row.path==='runtime/json-state-runtime.mjs').source+='\n// changed\n';assert.throws(()=>createOwnedStateContext(changed));
});
