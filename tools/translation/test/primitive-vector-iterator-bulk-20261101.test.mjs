// Independent complete caller expectations. Draft only: execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposePrimitiveVectorIteratorBulk as propose} from '../primitive-vector-iterator-bulk-20261101.mjs';
import {primitiveVectorLiteralReceivingData as receiving} from '../js-to-rust/test/primitive-vector-literal-receiving-data.mjs';
import * as outcome from '../js-to-rust/owned-outcome.mjs';
import * as cancellation from '../js-to-rust/owned-cancellation.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
const limits={timeout:60000};
const u64="import('./runtime/primitive-operator-runtime.mjs').RustU64";
function caller(typed=false){
 const doc=typed?'':'/** @param {readonly ('+u64+')[]} input */\n';
 const parameter=typed?'input: readonly ('+u64+')[]':'input';
 return doc+'export function copied('+parameter+'){const values=[];for(const item of input){values.push(item);}return values;}\n'+
  doc+'export function filtered('+parameter+'){const values=[];for(const item of input){if(item>1n){values.push(item);}}return values;}\n'+
  doc+'export function first('+parameter+'){const values=[];for(const item of input){values.push(item);break;}return values;}\n';
}
const vectors=['copied','filtered','first'].map(name=>({function:name,local:'values',domain:'u64'}));
function options(family,path='caller.mjs'){
 return {family,modules:[{sourcePath:path,rustPath:'caller.rs',vectors}]};
}
for(const family of ['outcome','cancellation'])for(const typed of [false,true])test(family+' complete '+(typed?'TypeScript':'JavaScript')+' copied/filter/early-stop collection callers compose with both canonical directions',limits,async()=>{
 const path=typed?'caller.mts':'caller.mjs',text=caller(typed),data=receiving(family,text,path),proposal=propose(data,options(family,path));
 assert.equal(data.files.find(row=>row.path===path).source,text);
 assert.deepEqual(proposal.ruleTrace.map(row=>row.phase),['language','repository']);
 assert.equal(proposal.modules.length,1);
 const module=proposal.modules[0],api=family==='outcome'?outcome:cancellation,token=await api.prepareOwnedOutcomeRuntime(module.program);
 const inputs=[Object.freeze([]),Object.freeze([0n]),Object.freeze([0n,2n,18446744073709551615n])];
 const expected=[{copied:[],filtered:[],first:[]},{copied:[0n],filtered:[],first:[0n]},
  {copied:[0n,2n,18446744073709551615n],filtered:[2n,18446744073709551615n],first:[0n]}];
 for(let at=0;at<inputs.length;at++)for(const name of ['copied','filtered','first'])assert.deepEqual(api.evaluateOwnedOutcome(module.program,name,[inputs[at]],token),expected[at][name]);
 assert.equal(module.before,text);assert.equal(module.inverse,text);
 assert.equal(module.equations[0].inverse,text);
 assert.equal(module.equations[1].inverse,module.canonicalRust);
 assert.ok(sameRustSourceSyntax(module.canonicalRust,module.equations[1].after));
 assert.equal(module.artifacts.length,3);
 for(const artifact of module.artifacts){assert.equal(artifact.source,artifact.inverse);assert.equal(typeof artifact.concreteSyntax,'string');}
 assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.runtimeParity,false);
 assert.equal(proposal.originalBodyEquivalenceQualified,false);assert.equal(proposal.wholeRouterSynchronization,false);
});
test('two complete independent modules retain original order and complete individual inverse histories',limits,()=>{
 const text=caller(),family='outcome',data=receiving(family,text),other=text.replaceAll('copied','otherCopied').replaceAll('filtered','otherFiltered').replaceAll('first','otherFirst');
 const input={...data,files:[...data.files,{path:'other.mjs',source:other}]};
 const request={family,modules:[...options(family).modules,{sourcePath:'other.mjs',rustPath:'other.rs',vectors:['otherCopied','otherFiltered','otherFirst'].map(name=>({function:name,local:'values',domain:'u64'}))}]};
 const result=propose(input,request);
 assert.deepEqual(result.files.map(row=>[row.path,row.inverse]),[['caller.mjs',text],['other.mjs',other]]);
 assert.deepEqual(result.modules.map(row=>row.rustPath),['caller.rs','other.rs']);
 assert.equal(input.files.find(row=>row.path==='other.mjs').source,other);
});
for(const family of ['outcome','cancellation'])test(family+' Boolean scalar iteration retains false values and conditional collection',limits,async()=>{
 const source='/** @param {readonly boolean[]} input */\nexport function truthy(input){const values=[false];for(const item of input){if(item){values.push(item);}}return values;}',
  data=receiving(family,source),result=propose(data,{family,modules:[{sourcePath:'caller.mjs',rustPath:'caller.rs',vectors:[{function:'truthy',local:'values',domain:'bool'}]}]}),
  api=family==='outcome'?outcome:cancellation,module=result.modules[0],token=await api.prepareOwnedOutcomeRuntime(module.program);
 assert.deepEqual(api.evaluateOwnedOutcome(module.program,'truthy',[Object.freeze([])],token),[false]);
 assert.deepEqual(api.evaluateOwnedOutcome(module.program,'truthy',[Object.freeze([false,true,false,true])],token),[false,true,true]);
 assert.equal(result.lengthRepresentationChanged,false);
});
test('a later unsupported capture refuses the complete transaction without rewriting the first source',limits,()=>{
 const family='outcome',text=caller(),data=receiving(family,text),bad='export function bad(){const values=[];const capture=()=>values;values.push(1n);return capture();}';
 const input={...data,files:[...data.files,{path:'later.mjs',source:bad}]},before=input.files.map(row=>({...row}));
 assert.throws(()=>propose(input,{family,modules:[...options(family).modules,{sourcePath:'later.mjs',rustPath:'later.rs',vectors:[{function:'bad',local:'values',domain:'u64'}]}]}));
 assert.deepEqual(input.files,before);
});
test('source destinations paired edits and request data cannot act as ownership or spelling authority',limits,()=>{
 const family='outcome',text=caller(),data=receiving(family,text),request=options(family);
 assert.throws(()=>propose(data,{...request,modules:[request.modules[0],request.modules[0]]}));
 assert.throws(()=>propose(data,{...request,modules:[{...request.modules[0],rustPath:'src/lib.rs'}]}));
 assert.throws(()=>propose({...data,files:[...data.files,{path:'caller.mts',source:caller(true)}]},request));
 assert.throws(()=>propose(data,{...request,modules:[]}));
 let reads=0;const getter={family,modules:request.modules};Object.defineProperty(getter,'family',{get(){reads++;throw Error('must not run');},enumerable:true});
 assert.throws(()=>propose(data,getter));assert.equal(reads,0);
 const forged=text.replace('item>1n','item>"1"');
 assert.throws(()=>propose(receiving(family,forged),request));
});
test('original primitive-vector resource and element domains remain complete caller obligations',limits,async()=>{
 const family='outcome',result=propose(receiving(family,caller()),options(family)),module=result.modules[0],token=await outcome.prepareOwnedOutcomeRuntime(module.program);
 const full=Object.freeze(Array(4096).fill(9n));
 assert.deepEqual(outcome.evaluateOwnedOutcome(module.program,'copied',[full],token),Array(4096).fill(9n));
 assert.throws(()=>outcome.evaluateOwnedOutcome(module.program,'copied',[Object.freeze(Array(4097).fill(9n))],token));
 assert.throws(()=>outcome.evaluateOwnedOutcome(module.program,'copied',[Object.freeze([-1n])],token));
 assert.throws(()=>outcome.evaluateOwnedOutcome(module.program,'copied',[Object.freeze([18446744073709551616n])],token));
 assert.throws(()=>outcome.evaluateOwnedOutcome(module.program,'copied',[Object.freeze([1])],token));
});
