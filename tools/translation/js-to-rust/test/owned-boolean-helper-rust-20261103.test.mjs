// Full canonical inverse and edited-Rust receiving source. No local Rust runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {translateOwnedBooleanHelperSource20261103} from '../owned-boolean-helper-profile-20261103.mjs';
import {translateOwnedBooleanHelperRust20261103} from '../owned-boolean-helper-rust-20261103.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
const doc='/** @param {boolean} a @param {boolean} b @returns {boolean} */\n';
const caller='import {chosen} from "./barrel.mjs";\n'+doc+'export function caller(a,b){return chosen(a,b);}\n';
const helper=doc+'export function predicate(a,b){return a && b;}\n';
async function fixture(variant){
 const syntax=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-source.mjs');
 const original=ownedStateReceivingData([{path:'caller.mjs',source:caller},{path:'helper.mjs',source:helper},{path:'barrel.mjs',source:'export {predicate as chosen} from "./helper.mjs";\n'}]);
 const input={...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat(syntax.ownedCoreRuntimeSources()),...(variant==='vector'?{vectorBindings:[]}: {})};
 const forward=translateOwnedBooleanHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input});
 return {syntax,input,forward,options:{variant,sourcePath:'sync/caller.rs',javascriptPath:'caller.mjs',input:{...input,files:input.files.concat([{path:'sync/caller.rs',source:forward.rust}])}}};
}
for(const variant of ['core','vector']){
 test(variant+' canonical Rust restores complete helper and barrel sources through fresh meta',{timeout:60000},async()=>{
  const {forward,options}=await fixture(variant),result=translateOwnedBooleanHelperRust20261103(forward.rust,options);
  assert.equal(result.helperNetworkRestored,true);assert.deepEqual(result.sourceConflicts,[]);assert.equal(result.javascript,caller);
  assert.deepEqual(result.program,forward.program);
  const restored=new Map(result.restoredSources.map(row=>[row.path,row.source]));assert.equal(restored.get('caller.mjs'),caller);assert.equal(restored.get('helper.mjs'),helper);assert.ok(restored.has('barrel.mjs'));
  for(const row of result.restoredSources)assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);
  assert.equal(result.ownedRustRuleHistory.equation.inverse,forward.rust);assert.equal(result.ownedRustRuleHistory.sourceEquation.inverse,caller);
  assert.equal(result.rustExecuted,false);assert.equal(result.wholeRouterSynchronization,false);
 });
 test(variant+' edited Rust yields a newly checked caller while retaining the shared original helper',{timeout:60000},async()=>{
  const {forward,options}=await fixture(variant),rust=forward.rust.replace('(a && b)','(a || b)');assert.notEqual(rust,forward.rust);
  const input={...options.input,files:options.input.files.map(row=>row.path==='sync/caller.rs'?{...row,source:rust}:row)};
  const result=translateOwnedBooleanHelperRust20261103(rust,{...options,input});
  assert.equal(result.helperNetworkRestored,false);assert.equal(result.sourceConflicts.length,1);assert.equal(result.sourceConflicts[0].requiresReconciliation,true);
  assert.equal(sameRustSourceSyntax(rust,result.rust),true);assert.match(result.javascript,/\|\|/);assert.match(result.typescript,/boolean/);
  assert.equal(input.files.find(row=>row.path==='helper.mjs').source,helper);assert.deepEqual(result.restoredSources,[]);
  assert.equal(result.ownedRustRuleHistory.sourceEquation.inverse,caller);
  const operations=await import('../owned-vector-candidate-operations.mjs'),token=await operations.prepareOwnedCoreRuntime(result.program);
  for(const [a,b,wanted] of [[false,false,false],[false,true,true],[true,false,true],[true,true,true]])assert.equal(operations.evaluateOwnedCoreProgram(result.program,'caller',[a,b],token),wanted);
 });
 test(variant+' complete original support, signatures and source path remain required',{timeout:60000},async()=>{
  const {forward,options}=await fixture(variant);
  assert.throws(()=>translateOwnedBooleanHelperRust20261103(forward.rust+'\n',options),TypeError);
  for(const rust of [forward.rust.replace('nodes <= 4096','nodes <= 4097'),forward.rust.replace('fn caller(a: bool','fn caller(a: u64'),forward.rust+'\nconst EXTRA: bool = true;\n']){
   assert.notEqual(rust,forward.rust);const input={...options.input,files:options.input.files.map(row=>row.path==='sync/caller.rs'?{...row,source:rust}:row)};
   assert.throws(()=>translateOwnedBooleanHelperRust20261103(rust,{...options,input}),TypeError);
  }
  assert.throws(()=>translateOwnedBooleanHelperRust20261103(forward.rust,{...options,sourcePath:'rust/src/lib.rs'}),TypeError);
  assert.throws(()=>translateOwnedBooleanHelperRust20261103(forward.rust,{...options,nativeBindingQualified:true}),TypeError);
 });
 test(variant+' canonical restoration retains checked caller and helper TypeScript pairs',{timeout:60000},async()=>{
  const {forward,options}=await fixture(variant);
  const typedCaller=caller.replace('function caller(a,b)','function caller(a:boolean,b:boolean):boolean');
  const typedHelper=helper.replace('function predicate(a,b)','function predicate(a:boolean,b:boolean):boolean');
  const input={...options.input,files:options.input.files.concat([{path:'caller.mts',source:typedCaller},{path:'helper.mts',source:typedHelper}])};
  const result=translateOwnedBooleanHelperRust20261103(forward.rust,{...options,input});
  assert.equal(result.helperNetworkRestored,true);
  const sources=new Map(result.restoredSources.map(row=>[row.path,row]));
  assert.equal(sources.get('caller.mts').source,typedCaller);assert.equal(sources.get('helper.mts').source,typedHelper);
  for(const path of ['caller.mts','helper.mts'])assert.equal(transportConcreteSyntaxMeta(sources.get(path).concreteSyntax).document.language,'TypeScript');
  const inconsistent={...input,files:input.files.map(row=>row.path==='helper.mts'?{...row,source:typedHelper.replace('a && b','a || b')}:row)};
  assert.throws(()=>translateOwnedBooleanHelperRust20261103(forward.rust,{...options,input:inconsistent}),TypeError);
 });
}
