// Unrun regression source for canonical scalar Rust synchronization.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateJavaScript} from '../translator.mjs';
import {translatePortableRust,UnsupportedPortableRustSource} from '../portable-rust.mjs';
import {transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
import {preparePortableRustInverse} from '../../prepare-portable-rust-inverse.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
const limits={timeout:60_000};
const twice=()=>translateJavaScript('/** @param {number} value @returns {number} */ export function twice(value){return value*2;}');
test('complete emitted scalar Rust crosses both actual meta checks and retains full source inverse',limits,async()=>{
 const original=twice(),result=translatePortableRust(original.rust,{sourcePath:'rust/src/twice.rs'}),history=result.portableRustSourceHistory;
 assert.equal(result.rust,original.rust);assert.equal(history.equation.inverse,original.rust);assert.equal(transportConcreteSyntaxMeta(history.originalRustConcreteSyntax).source,original.rust);assert.ok(history.originalDecodedMeta);assert.equal(history.checkedJavaScriptMeta,result.meta);assert.equal(history.semanticAuthority,false);assert.equal(result.wholeRouterSynchronization,false);
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const value of [0,-0,1,-2,0.5,Number.MAX_VALUE,Infinity,-Infinity,NaN])assert.ok(Object.is(module.twice(value),value*2));},{childTimeoutMs:20_000});
});
test('an actual canonical Rust body edit becomes new JavaScript behavior without a persisted meta result',limits,async()=>{
 const original=twice(),changed=original.rust.replace('* 2.0','* 3.0');assert.notEqual(changed,original.rust);const result=translatePortableRust(changed);
 assert.equal(result.portableRustSourceHistory.equation.inverse,changed);assert.notEqual(result.meta,translatePortableRust(original.rust).meta);
 await verifyTypedTargets(result,(_api,_result,module)=>{for(const value of [0,1,-1,0.5])assert.equal(module.twice(value),value*3);},{childTimeoutMs:20_000});
});
test('original robust Rust CST retains nested comments without exposing comment text as code',limits,()=>{
 const source='/* outer /* pub fn hidden()->f64{99.0} */ still comment */\n'+twice().rust,result=translatePortableRust(source);
 assert.equal(result.portableRustSourceHistory.equation.inverse,source);assert.equal(result.program.some(row=>row.name==='hidden'),false);
});
test('closed scalar strings and booleans use the same complete source roundtrip',limits,async()=>{
 const original=translateJavaScript('/** @param {boolean} flag @param {string} yes @param {string} no @returns {string} */ export function choose(flag,yes,no){if(flag){return yes;}return no;}'),result=translatePortableRust(original.rust);
 await verifyTypedTargets(result,(_api,_result,module)=>{assert.equal(module.choose(true,'λ😀','no'),'λ😀');assert.equal(module.choose(false,'yes',''),'');},{childTimeoutMs:20_000});
});
test('unrelated declarations and lossy Rust syntax normalization cannot borrow canonical admission',limits,()=>{
 const original=twice().rust;
 for(const source of ['mod unknown;\n'+original,'macro_rules! hidden {()=>{}}\n'+original,'#[unknown_attribute]\n'+original,original.replace('value * 2.0','value.as_str() * 2.0'),original+'\npub fn twice(value:f64)->f64{value}\n'])assert.throws(()=>translatePortableRust(source),UnsupportedPortableRustSource);
});
test('complete copied Rust frontend and synchronizer retain both source rule sequences',limits,()=>{
 const plan=preparePortableRustInverse();assert.equal(plan.files.length,2);
 for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
});
