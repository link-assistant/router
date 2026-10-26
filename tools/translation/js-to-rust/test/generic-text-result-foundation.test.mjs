// Independent shared Result ABI SOURCE. All implementation and cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {router_text_result_identity} from '../../owned-result-runtime.mjs';
import {requireGenericTextResultIdentitySources} from '../owned-result-source-contracts.mjs';
import {httpResourceReceivingData} from './http-resource-receiving-data.mjs';
import {translateHttpResourceCallerJavaScript} from '../http-resource-callers.mjs';
import {prepareGenericTextResultLibrary} from '../../prepare-generic-text-result-library.mjs';
import {prepareGenericTextResultFoundationSources} from '../../prepare-generic-text-result-foundation-sources.mjs';
import {prepareOwnedResultNativeCopy} from '../../prepare-owned-result-native-copy.mjs';
import {emitOwnedResultDeclarations,OWNED_RESULT_CONTRACTS} from '../../owned-result-contracts.mjs';
import {OWNED_RESULT_NATIVE_SOURCE,OWNED_RESULT_RUNTIME_SOURCE,OWNED_RESULT_DECLARATIONS_SOURCE} from '../../owned-result-native-source.mjs';
const limits={timeout:60000};
test('whole generic Results preserve opaque success payloads and exact String error values',()=>{
 const payload=new Proxy({},{get(){throw Error('payload must stay opaque');},ownKeys(){throw Error('payload must stay opaque');}}),success=Object.freeze({$:'Ok',field0:payload});assert.strictEqual(router_text_result_identity(success),success);assert.strictEqual(router_text_result_identity(success).field0,payload);for(const message of ['','é😀','\0']){const failure=Object.freeze({$:'Err',field0:message});assert.strictEqual(router_text_result_identity(failure),failure);assert.equal(router_text_result_identity(failure).field0,message);}
});
test('actual native JS and strict declaration proofs rejoin complete original source additions',limits,()=>{
 const files=new Map(httpResourceReceivingData().files.map(row=>[row.path,row.source])),records=requireGenericTextResultIdentitySources(files,{runtimeRoot:'runtime',declarationRoot:'runtime'});for(const path of ['src/translation_owned_results_core.rs','runtime/owned-result-runtime.mjs','runtime/owned-result-runtime.d.mts']){assert.ok(records.some(row=>row.path===path));const changed=new Map(files);changed.set(path,changed.get(path)+'\n');assert.throws(()=>requireGenericTextResultIdentitySources(changed,{runtimeRoot:'runtime',declarationRoot:'runtime'}));}for(const row of records){assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);}assert.equal(OWNED_RESULT_CONTRACTS.length,120);assert.equal(emitOwnedResultDeclarations(),OWNED_RESULT_DECLARATIONS_SOURCE);
});
test('signature-only Result ABI metadata cannot authorize an ordinary unchecked value call',limits,()=>{
 const source='import {router_text_result_identity as identity} from "./runtime/owned-result-runtime.mjs";\n/** @param {boolean} value */ export function bad(value){return identity(value);}',input={sourcePath:'caller.mjs',...httpResourceReceivingData([{path:'caller.mjs',source}])};assert.throws(()=>translateHttpResourceCallerJavaScript(source,input),/qualified type queries/u);
});
test('copied three-language library producer retains complete originals and matching current mirrors',limits,()=>{
 const plan=prepareGenericTextResultLibrary();assert.equal(plan.files.length,3);const expected=[OWNED_RESULT_NATIVE_SOURCE,OWNED_RESULT_RUNTIME_SOURCE,OWNED_RESULT_DECLARATIONS_SOURCE];for(const [at,row]of plan.files.entries()){assert.equal(row.after,expected[at]);assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.equation.inverse,row.before);assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.rustExecuted,false);assert.equal(plan.receivingExecuted,false);
});
test('original native primitive-to-owned history remains exact before its complete generic suffix',limits,()=>{
 const plan=prepareOwnedResultNativeCopy(),row=plan.files[0];assert.equal(row.currentAfter,OWNED_RESULT_NATIVE_SOURCE);assert.equal(row.current,row.currentAfter);assert.notEqual(row.after,row.currentAfter);assert.ok(row.currentAfter.startsWith(row.after));assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.laterHistories.length,1);const later=row.laterHistories[0];assert.equal(later.before,row.after);assert.equal(later.after,row.currentAfter);assert.equal(later.equation.inverse,row.after);assert.deepEqual(later.stages.map(stage=>stage.phase),['language','repository']);assert.equal(readFileSync(new URL('../../../../rust/src/translation_owned_results_core.rs',import.meta.url),'utf8'),row.currentAfter);
});
test('ten full foundation compiler equations retain original native owners both phases and whole inverses',limits,()=>{
 const plan=prepareGenericTextResultFoundationSources();assert.equal(plan.files.length,10);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
