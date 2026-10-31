// Independently expected caller and refusal source; all execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCollectionCallbackBulk as propose} from '../collection-callback-bulk-20261101.mjs';
import {primitiveVectorLiteralReceivingData as receiving} from '../js-to-rust/test/primitive-vector-literal-receiving-data.mjs';
import {proposePrimitiveVectorLiteralCalls as oldProposal} from '../js-to-rust/primitive-vector-literal-proposals.mjs';
import * as outcome from '../js-to-rust/owned-outcome.mjs';
import * as cancellation from '../js-to-rust/owned-cancellation.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
const limits={timeout:60000},u64="import('./runtime/primitive-operator-runtime.mjs').RustU64";
function source(typed=false){
 const head=(name,role)=>typed?'export function '+name+'(input: readonly ('+role+')[])':'/** @param {readonly ('+role+')[]} input */\nexport function '+name+'(input)';
 return head('mapped',u64)+'{const values=input.map(item=>item+2n);return values;}\n'+
  head('selected',u64)+'{const values=input.filter(item=>item>1n);return values;}\n'+
  head('conditional',u64)+'{const values=input.map(item=>item===0n?7n:item);return values;}\n'+
  head('truthy','boolean')+'{const values=input.filter(item=>item);return values;}\n';
}
const selections=[{function:'mapped',local:'values',domain:'u64'},{function:'selected',local:'values',domain:'u64'},{function:'conditional',local:'values',domain:'u64'},{function:'truthy',local:'values',domain:'bool'}];
const options=(family,path='caller.mjs',callbacks=selections)=>({family,modules:[{sourcePath:path,rustPath:'caller.rs',callbacks}]});
for(const family of ['outcome','cancellation'])for(const typed of [false,true])test(family+' real scalar map/filter lowering from '+(typed?'TypeScript':'JavaScript')+' passes complete checked canonical directions',limits,async()=>{
 const path=typed?'caller.mts':'caller.mjs',text=source(typed),data=receiving(family,text,path),result=propose(data,options(family,path)),module=result.modules[0],checked=module.checked,
  api=family==='outcome'?outcome:cancellation,token=await api.prepareOwnedOutcomeRuntime(checked.program);
 assert.deepEqual(result.ruleTrace.map(row=>[row.phase,row.id]),[["language","collection-callback:lower-capture-free-scalar-map-filter-through-complete-CST"],["language","collection-callback:reissue-complete-scalar-loops-owned-vectors-meta-types-and-native-inverse"],["repository","router:retain-original-callback-equations-and-explicit-input-contract-change"]]);
 assert.deepEqual(module.callbacks.map(row=>row.operation),['map','filter','map','filter']);
 const vectors=[['mapped',Object.freeze([]),[]],['mapped',Object.freeze([0n,1n,10n]),[2n,3n,12n]],
  ['selected',Object.freeze([0n,2n,1n,18446744073709551615n]),[2n,18446744073709551615n]],
  ['conditional',Object.freeze([0n,2n,0n]),[7n,2n,7n]],['truthy',Object.freeze([false,true,false,true]),[true,true]];
 for(const [name,input,expected]of vectors)assert.deepEqual(api.evaluateOwnedOutcome(checked.program,name,[input],token),expected);
 assert.equal(module.before,text);assert.equal(module.inverse,text);
 assert.equal(module.histories[0].inverse,text);assert.equal(module.histories[2].inverse,text);
 assert.equal(module.histories[1].inverse,module.lowered);
 assert.match(module.lowered,/for\(const item of input\)/);
 assert.match(module.after,/primitive-owned-vector-runtime/);
 assert.match(checked.canonicalRust,/\.iter\(\)\.copied\(\)/);
 assert.ok(sameRustSourceSyntax(checked.canonicalRust,checked.equations[1].after));
 assert.equal(data.files.find(row=>row.path===path).source,text);
 assert.equal(result.sourceInstalled,false);assert.equal(result.originalArrayMethodOwnerQualified,false);
 assert.equal(result.originalBodyEquivalenceQualified,false);assert.equal(result.callbackCaptureSemantics,false);
});
test('existing literal-only proposer still refuses actual map/filter initializers',limits,()=>{
 const text=source(),data=receiving('outcome',text);
 assert.throws(()=>oldProposal(data,{family:'outcome',sourcePath:'caller.mjs',vectors:selections}));
 assert.equal(propose(data,options('outcome')).modules[0].callbacks.length,4);
});
for(const family of ['outcome','cancellation'])for(const typed of [false,true])test(family+' separate written input and selected output domains lower actual checked arithmetic',limits,async()=>{
 const path=typed?'caller.mts':'caller.mjs',numeric=typed?'export function compared(input: readonly ('+u64+')[])':'/** @param {readonly ('+u64+')[]} input */\nexport function compared(input)',
  boolean=typed?'export function chosen(input: readonly boolean[])':'/** @param {readonly boolean[]} input */\nexport function chosen(input)',
  text=numeric+'{const values=input.map(item=>item+1n>2n);return values;}\n'+boolean+'{const values=input.map(flag=>flag?2n+3n:7n);return values;}\n',
  result=propose(receiving(family,text,path),options(family,path,[{function:'compared',local:'values',domain:'bool'},{function:'chosen',local:'values',domain:'u64'}])),checked=result.modules[0].checked,
  api=family==='outcome'?outcome:cancellation,token=await api.prepareOwnedOutcomeRuntime(checked.program);
 assert.deepEqual(api.evaluateOwnedOutcome(checked.program,'compared',[Object.freeze([0n,2n,1n])],token),[false,true,false]);
 assert.deepEqual(api.evaluateOwnedOutcome(checked.program,'chosen',[Object.freeze([false,true,false])],token),[7n,5n,7n]);
 assert.deepEqual(result.modules[0].callbacks.map(row=>row.inputDomainCandidate),['u64','bool']);
 assert.match(result.modules[0].lowered,/integerArithmetic/);
});
test('capture callbacks writes effects thisArg index callbacks mutable references and lazy chains remain refused',limits,()=>{
 const prefix='/** @param {readonly ('+u64+')[]} input @param {'+u64+'} captured */\nexport function bad(input,captured){',
  request=options('outcome','caller.mjs',[{function:'bad',local:'values',domain:'u64'}]);
 const initializers=['input.map(item=>item+captured)','input.map((item,index)=>item)','input.map(async item=>item)',
  'input.map(item=>{return item;})','input.map(item=>item++)','input.map(item=>captured(item))',
  'input.map(item=>input[0])','input.map(item=>this.value)','input.map(item=>item, captured)',
  'input?.map(item=>item)','input.map(item=>item).filter(item=>true)','input.filter(item=>item)',
  'input.map(item=>"coerce")','input.map(item=>({...item}))','input.map(item=>[item])'];
 for(const initializer of initializers){const text=prefix+'const values='+initializer+';return values;}';assert.throws(()=>propose(receiving('outcome',text),request),initializer);}
 const reused=prefix+'input=input;const values=input.map(item=>item);return values;}';
 assert.throws(()=>propose(receiving('outcome',reused),request));
});
test('full primitive scalar callback resource and integer limits retain the existing bounds',limits,async()=>{
 const result=propose(receiving('outcome',source()),options('outcome')),checked=result.modules[0].checked,token=await outcome.prepareOwnedOutcomeRuntime(checked.program);
 assert.deepEqual(outcome.evaluateOwnedOutcome(checked.program,'selected',[Object.freeze(Array(4096).fill(3n))],token),Array(4096).fill(3n));
 assert.throws(()=>outcome.evaluateOwnedOutcome(checked.program,'selected',[Object.freeze(Array(4097).fill(3n))],token));
 assert.throws(()=>outcome.evaluateOwnedOutcome(checked.program,'mapped',[Object.freeze([-1n])],token));
 assert.throws(()=>outcome.evaluateOwnedOutcome(checked.program,'mapped',[Object.freeze([1])],token));
});
test('a second bad module refuses the full original-source transaction',limits,()=>{
 const text=source(),data=receiving('outcome',text),bad='export function bad(){const values=input.map(item=>captured);return values;}',input={...data,files:[...data.files,{path:'bad.mjs',source:bad}]},before=input.files.map(row=>({...row})),request=options('outcome');
 request.modules.push({sourcePath:'bad.mjs',rustPath:'bad.rs',callbacks:[{function:'bad',local:'values',domain:'u64'}]});
 assert.throws(()=>propose(input,request));assert.deepEqual(input.files,before);
});
