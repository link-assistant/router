// Complete source observation regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {observeHttpDeadlineSources} from '../../http-deadline-native-inputs.mjs';
import {prepareOwnedOutcomeRuntime} from '../owned-outcome.mjs';
import {httpDeadlineReceivingData} from './http-deadline-receiving-data.mjs';
const limits={timeout:60000};
test('complete current native and runtime observations retain CST source but cannot issue executable authority',limits,async()=>{
 const data=httpDeadlineReceivingData(),observed=observeHttpDeadlineSources(new Map(data.files.map(row=>[row.path,row.source])),data);assert.equal(observed.sourceAuthority,false);assert.equal(observed.semanticAuthority,false);assert.equal(observed.callerOwnerResolved,false);assert.equal(observed.nativeRustGrammarChecked,false);assert.equal(observed.runtimeParity,false);assert.ok(observed.records.some(row=>row.path==='src/translation_http_deadline_core.rs'));assert.ok(observed.records.some(row=>row.path==='runtime/http-deadline-runtime.mjs'));await assert.rejects(()=>prepareOwnedOutcomeRuntime(observed));
 for(const path of ['src/translation_http_deadline_core.rs','runtime/http-deadline-runtime.mjs','runtime/http-deadline-runtime.d.mts','src/translation_http_transport_core.rs','src/translation_async_control_core.rs']){const changed=httpDeadlineReceivingData();changed.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>observeHttpDeadlineSources(new Map(changed.files.map(row=>[row.path,row.source])),changed));}
 const duplicate=httpDeadlineReceivingData();duplicate.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_http_deadline_core;';assert.throws(()=>observeHttpDeadlineSources(new Map(duplicate.files.map(row=>[row.path,row.source])),duplicate));
});
