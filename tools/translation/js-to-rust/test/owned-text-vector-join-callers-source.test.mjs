// Complete additive source profiles; all execution remains deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as outcome from '../owned-text-vector-join-outcome.mjs';
import * as cancellation from '../owned-text-vector-join-cancellation.mjs';
import * as originalOutcome from '../owned-text-vector-outcome.mjs';
import * as originalCancellation from '../owned-text-vector-cancellation.mjs';
import {translateOwnedOutcomeRust as inverseOutcome} from '../owned-text-vector-join-outcome-rust.mjs';
import {translateOwnedCancellationRust as inverseCancellation} from '../owned-text-vector-join-cancellation-rust.mjs';
import {ownedTextVectorJoinReceivingData as receiving} from './owned-text-vector-join-receiving-data.mjs';
import {targets} from './owned-text-vector-kernel-adoption-targets.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareOwnedTextVectorJoinCallerSources} from '../../prepare-owned-text-vector-join-caller-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_owned_text_vec_join as joined} from './runtime/owned-text-vector-join-runtime.mjs';
import {router_owned_text_vec_literal as literal} from './runtime/owned-text-vector-literal-runtime.mjs';
import {router_owned_text_vec_len as length,router_owned_text_vec_push as pushed,router_owned_text_vec_truncate as truncated} from './runtime/owned-text-vector-runtime.mjs';
import {router_text_to_owned as copied} from './runtime/text-runtime.mjs';
`;
const application=imports+`/** @param {string} input @param {string} separator */
export function built(input,separator){const values=literal(copied(input),copied('é'));return joined(values,separator);}
/** @param {Parameters<typeof joined>[0]} input @param {string} separator */
export function borrowed(input,separator){const guard=length(input);return joined(input,separator);}
/** @param {string} input @param {ReturnType<typeof copied>} separator */
export function reused(input,separator){const values=literal(copied(input));const result=joined(values,separator);return literal(separator,result);}
`;
for(const family of ['outcome','cancellation']){
 const api=family==='outcome'?outcome:cancellation,old=family==='outcome'?originalOutcome:originalCancellation,inverse=family==='outcome'?inverseOutcome:inverseCancellation;
 function checked(source=application,path='caller.mjs'){const data=receiving(family,source,path),context=api.createOwnedOutcomeContext(data),result=api[path.endsWith('.mjs')?'translateOwnedOutcomeJavaScript':'translateOwnedOutcomeTypeScript'](source,{context,sourcePath:path});return {data,context,result};}
 test(family+' actual imported kernel callers privately reissue, serialize/reparse and execute through both complete interpreters and strict targets',limits,async t=>{
  const {data,context,result}=checked(),token=await api.prepareOwnedOutcomeRuntime(result.program),modules=await targets(t,data,{...result,files:[{after:application}]}),reissued=api.readOwnedOutcomeMeta(result.meta,{context});assert.deepEqual(reissued,result.program);assert.ok(result.program.some(item=>item.hostCalls.some(call=>call.name==='router_owned_text_vec_join')));assert.ok(result.rust.includes('fn router_kernel_text_join('));assert.equal(result.rust.split('fn router_kernel_text_join(').length-1,1);assert.ok(result.typescript.includes('owned-text-vector-join-runtime.mjs'));assert.ok(result.typescript.includes('__ro_router_owned_text_vec_join('));
  for(const input of ['', '🦀\u0000文'])for(const separator of ['', ',', '\n\n']){const expected=[input,'é'].join(separator);for(const module of modules)assert.equal(module.built(input,separator),expected);assert.equal(api.evaluateOwnedOutcome(result.program,'built',[input,separator],token),expected);assert.deepEqual(api.evaluateOwnedOutcome(result.program,'reused',[input,separator],token),[separator,input]);const frozen=Object.freeze([input,'é']);assert.equal(api.evaluateOwnedOutcome(result.program,'borrowed',[frozen,separator],token),expected);assert.deepEqual(frozen,[input,'é']);assert.deepEqual(api.evaluateOwnedOutcomeBatch(result.program,[['built',[input,separator]],['borrowed',[frozen,separator]]],token),[expected,expected]);}
  assert.throws(()=>old.translateOwnedOutcomeJavaScript(application,{context:old.createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));assert.equal(result.runtimeParity,false);assert.equal(result.wholeRouterSynchronization,false);
 });
 test(family+' complete canonical Rust helper inverse retains source/CST and reproduces the authoritative module',limits,()=>{
  const {data,result}=checked();data.files.push({path:'caller.rs',source:result.rust});const context=api.createOwnedOutcomeContext(data),reverse=inverse(result.rust,{context,sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.equal(sameRustSourceSyntax(reverse.rust,result.rust),true);assert.equal(reverse.originalRust,result.rust);assert.equal(reverse.ownedRustSourceHistory.equation.inverse,result.rust);assert.ok(reverse.javascript.includes('owned-text-vector-join-runtime.mjs'));assert.equal(reverse.runtimeParity,false);
  const changed=result.rust.replace('index = index + 1u64;','index = index + 2u64;'),tampered={...data,files:data.files.map(row=>row.path==='caller.rs'?{...row,source:changed}:row)};assert.throws(()=>inverse(changed,{context:api.createOwnedOutcomeContext(tampered),sourcePath:'caller.rs',javascriptPath:'caller.mjs'}));assert.throws(()=>inverse(result.rust,{context,sourcePath:'src/translation_owned_text_vectors_core.rs',javascriptPath:'caller.mjs'}));
 });
 test(family+' fresh generated helper names avoid genuine original function bindings',limits,()=>{
  const source=application+'\nexport function router_kernel_text_join(){return copied(\'original\');}\n',result=checked(source).result;assert.ok(result.rust.includes('fn router_kernel_text_join_0('));assert.equal(result.rust.split('fn router_kernel_text_join_0(').length-1,1);assert.ok(result.rust.includes('fn router_kernel_text_join('));
 });
 test(family+' strict written utility types bind to the actual join ABI',limits,()=>{
  const source=imports+`export function typed(input: Parameters<typeof joined>[0],separator: string): ReturnType<typeof joined>{const guard=length(input);return joined(input,separator);}`,result=checked(source,'caller.mts').result;assert.ok(result.typescript.includes('function typed('));assert.ok(result.rust.includes('router_kernel_text_join('));assert.equal(result.originalTypeScript,source);
 });
 test(family+' first borrowed argument remains live through later String construction and move failures refuse',limits,async()=>{
  const helper=imports+`/** @param {ReturnType<typeof literal>} input */
export function consume(input){const bounded=truncated(input,18446744073709551615n);return copied(length(bounded)>0n?'yes':'no');}
`,valid=checked(helper),token=await api.prepareOwnedOutcomeRuntime(valid.result.program);assert.equal(api.evaluateOwnedOutcome(valid.result.program,'consume',[Object.freeze(['x'])],token),'yes');const bad=helper+`/** @param {string} input */
export function bad(input){const values=literal(copied(input));return joined(values,consume(values));}`;assert.throws(()=>checked(bad),/loan|borrow|moved/iu);
  for(const body of ["const values=literal(copied(input));return joined(values,1n);","const values=literal(copied(input));return joined(values);","return joined(true,input);","const values=literal(copied(input));const moved=pushed(values,copied(input));return joined(values,input);"]){const source=imports+'/** @param {string} input */\nexport function bad(input){'+body+'}';assert.throws(()=>checked(source));}
 });
 test(family+' full 4096-element and 1MiB kernel path retains raw synchronous deadline and all refusal bounds',limits,async t=>{
  const {result}=checked(),token=await api.prepareOwnedOutcomeRuntime(result.program),values=Object.freeze(Array.from({length:4096},()=> 'é'.repeat(128))),expected='é'.repeat(524288),started=performance.now(),actual=api.evaluateOwnedOutcome(result.program,'borrowed',[values,''],token),elapsed=performance.now()-started;t.diagnostic(JSON.stringify({family,completeCase:'privately-issued-join-kernel-4096-elements-1MiB',milliseconds:elapsed,deadlineMilliseconds:60000,executed:true}));assert.equal(actual,expected);assert.ok(elapsed<60000,'full synchronous privately issued join must retain its original deadline');assert.throws(()=>api.evaluateOwnedOutcome(result.program,'borrowed',[values,'x'],token));assert.throws(()=>api.evaluateOwnedOutcome(result.program,'borrowed',[Object.freeze(Array(4097).fill('')),''],token));assert.throws(()=>api.evaluateOwnedOutcome(result.program,'borrowed',[Object.freeze(['\ud800']),''],token));
 });
 test(family+' stale kernel/text/declaration sources, fabricated IR and foreign runtime/meta contexts remain refused',limits,async()=>{
  const {data,context,result}=checked(),token=await api.prepareOwnedOutcomeRuntime(result.program);for(const path of ['runtime/owned-text-vector-join-runtime.mjs','runtime/owned-text-vector-join-runtime.d.mts','src/translation_text_core.rs']){const stale={...data,files:data.files.map(row=>row.path===path?{...row,source:row.source+'\n// stale\n'}:row)};assert.throws(()=>api.translateOwnedOutcomeJavaScript(application,{context:api.createOwnedOutcomeContext(stale),sourcePath:'caller.mjs'}));}
  const forged=JSON.parse(JSON.stringify(result.program));forged[0].privateCallerBindingQualified=true;assert.throws(()=>api.emitOwnedOutcomeRust(forged));const other=family==='outcome'?cancellation:outcome,otherContext=other.createOwnedOutcomeContext(data);assert.throws(()=>other.readOwnedOutcomeMeta(result.meta,{context:otherContext}));assert.throws(()=>other.evaluateOwnedOutcome(result.program,'built',['x',''],token));assert.throws(()=>api.translateOwnedOutcomeJavaScript(application.replace('joined(values,separator)','joined(values,true)'),{context,sourcePath:'caller.mjs'}));
 });
}
test('complete additive source copies retain every original body, both phases and open receiving status',limits,()=>{const plan=prepareOwnedTextVectorJoinCallerSources();assert.ok(plan.files.some(row=>row.path==='tools/translation/js-to-rust/owned-text-vector-join-cancellation-source.mjs'));assert.ok(plan.files.some(row=>row.path==='tools/translation/js-to-rust/owned-text-vector-join-outcome-rust.mjs'));assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.inverse,row.before);assert.ok(row.after.split('\n').length-(row.after.endsWith('\n')?1:0)<1000);}});
