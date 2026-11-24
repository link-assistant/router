// Independent complete reverse/meta/interpreter/native inverse case SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {json_macro_string as text,json_macro_object as object} from '../../json-macro-runtime.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const source='import {router_state_json_rewrite_model_alias as rewritten} from "./runtime/json-state-runtime.mjs";\n/** @param {Parameters<typeof rewritten>[0]} value @param {string} upstream @param {string} visible */\nexport function rewrite(value,upstream,visible){return rewritten(value,upstream,visible);}\n';
for(const stem of ['owned-outcome','owned-cancellation','owned-text-vector-outcome','owned-text-vector-cancellation','owned-text-vector-join-outcome','owned-text-vector-join-cancellation'])test(stem+' complete alias caller retains original native/source/meta/inverse checks',{timeout:60000,concurrency:false},async()=>{
 const api=await import('../'+stem+'.mjs'),family=stem.endsWith('cancellation')?'cancellation':'outcome';let data;
 if(stem.includes('-join-')){const {ownedTextVectorJoinReceivingData}=await import('./owned-text-vector-join-receiving-data.mjs');data=ownedTextVectorJoinReceivingData(family,source);}
 else if(stem.includes('-text-vector-')){const {ownedTextVectorReceivingData}=await import('./owned-text-vector-receiving-data.mjs');data=ownedTextVectorReceivingData(family,source);}
 else if(family==='cancellation'){const {ownedCancellationReceivingData}=await import('./owned-cancellation-receiving-data.mjs');data=ownedCancellationReceivingData([{path:'caller.mjs',source}]);}
 else{data=ownedStateReceivingData([{path:'caller.mjs',source}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(api.ownedOutcomeRuntimeSources());}
 const context=api.createOwnedOutcomeContext(data),result=api.translateOwnedOutcomeJavaScript(source,{context,sourcePath:'caller.mjs'}),program=api.readOwnedOutcomeMeta(result.meta,{context}),token=await api.prepareOwnedOutcomeRuntime(program),value=object([['model',text('native')],['message',object([['model',text('models/native')]])]]),expected=object([['model',text('visible')],['message',object([['model',text('visible')]])]]);
 assert.deepEqual(api.evaluateOwnedOutcome(program,'rewrite',[value,'models/native','visible'],token),expected);assert.deepEqual(api.evaluateOwnedOutcomeBatch(program,[['rewrite',[value,'models/native','visible']]],token),[expected]);
 const typedData={...data,files:data.files.filter(row=>row.path!=='caller.mjs').concat([{path:'caller.mts',source:result.typescript}])},typed=api.translateOwnedOutcomeTypeScript(result.typescript,{context:api.createOwnedOutcomeContext(typedData),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,result.rust));
 const rust=await import('../'+stem+'-rust.mjs'),inverse=rust.translateOwnedOutcomeRust(result.rust,{context:api.createOwnedOutcomeContext({...data,files:data.files.concat([{path:'caller.rs',source:result.rust}])}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));
 const changed={...data,files:data.files.map(row=>row.path==='src/translation_state_core.rs'?{...row,source:row.source+'\n// changed native implementation\n'}:row)};assert.throws(()=>api.translateOwnedOutcomeJavaScript(source,{context:api.createOwnedOutcomeContext(changed),sourcePath:'caller.mjs'}));
});
