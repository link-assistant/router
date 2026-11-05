// Independent error adaptation regression SOURCE; all cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {router_http_deadline_flatten_open as opened,router_http_deadline_flatten_read as read,router_http_deadline_flatten_send as send} from '../http-deadline-result-runtime.mjs';
import {emitHttpDeadlineResultDeclarations} from '../http-deadline-result-contracts.mjs';
import {HTTP_DEADLINE_RESULT_NATIVE_SOURCE} from '../http-deadline-result-native-source.mjs';
import {httpDeadlineResultRuntimeSources} from '../http-deadline-result-runtime-sources.mjs';
import {observeHttpDeadlineResultSources} from '../http-deadline-result-native-inputs.mjs';
import {httpResourceReceivingData} from '../js-to-rust/test/http-resource-receiving-data.mjs';
import {prepareHttpDeadlineResultCore} from '../prepare-http-deadline-result-core.mjs';
import {prepareHttpDeadlineResultSources} from '../prepare-http-deadline-result-sources.mjs';
const limits={timeout:60000};
test('five independently specified errors have exact strings and transport outcomes remain whole',limits,()=>{
 const cases=[['Cancelled','HTTP operation cancelled'],['Timeout','HTTP operation timed out'],['Closed','HTTP operation channel closed'],['Resource','HTTP operation resource limit'],['InvalidInput','HTTP operation invalid input']];
 for(const flatten of [opened,read,send]){for(const [kind,message]of cases)assert.deepEqual(flatten({$:'Err',field0:{$:kind}}),{$:'Err',field0:message});const failure={$:'Err',field0:'original provider error'},success={$:'Ok',field0:{$:'None'}};assert.equal(flatten({$:'Ok',field0:failure}),failure);assert.equal(flatten({$:'Ok',field0:success}),success);}
});
test('malformed nested data proxies inherited fields and accessors refuse without invocation',limits,()=>{
 let calls=0;const accessor={get $(){calls++;return 'Ok';},field0:{$:'Ok',field0:null}},inherited=Object.create({$:'Ok'});inherited.field0={$:'Ok',field0:null};for(const value of [null,{},{$:'Other',field0:null},{$:'Err',field0:{$:'Other'}},{$:'Err',field0:{$:'Cancelled',field0:0}},{$:'Ok',field0:{$:'Err',field0:1}},{$:'Ok',field0:{$:'Ok',field0:null,extra:0}},accessor,inherited,new Proxy({$:'Ok',field0:null},{get(){calls++;return null;}})])assert.throws(()=>send(value));assert.equal(calls,0);
});
test('additive receiving source retains original deadlines and complete native roots without authority',limits,()=>{
 const rows=httpDeadlineResultRuntimeSources();for(const name of ['runtime/http-deadline-runtime.mjs','runtime/http-deadline-result-runtime.mjs','runtime/http-deadline-result-runtime.d.mts','runtime/http-transport-runtime.mjs'])assert.ok(rows.some(row=>row.path===name),name);assert.equal(readFileSync(new URL('../http-deadline-result-runtime.d.mts',import.meta.url),'utf8'),emitHttpDeadlineResultDeclarations());assert.equal(readFileSync(new URL('../../../rust/src/translation_http_deadline_results_core.rs',import.meta.url),'utf8'),HTTP_DEADLINE_RESULT_NATIVE_SOURCE);
 const data=httpResourceReceivingData(),observed=observeHttpDeadlineResultSources(new Map(data.files.map(row=>[row.path,row.source])),data);assert.equal(observed.sourceAuthority,false);assert.equal(observed.semanticAuthority,false);assert.equal(observed.runtimeParity,false);for(const path of ['src/translation_http_deadline_results_core.rs','runtime/http-deadline-result-runtime.mjs','runtime/http-deadline-result-runtime.d.mts']){const changed=httpResourceReceivingData();changed.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>observeHttpDeadlineResultSources(new Map(changed.files.map(row=>[row.path,row.source])),changed));}
 const core=prepareHttpDeadlineResultCore();assert.equal(core.files.length,2);assert.equal(core.files[1].inverse,null);assert.equal(core.rustExecuted,false);const source=prepareHttpDeadlineResultSources();assert.equal(source.files.length,11);for(const row of source.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
