// Independently expected eager-stage chain cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeScalarChainBulk as propose} from '../scalar-chain-bulk-20261101.mjs';
import {primitiveVectorLiteralReceivingData as receiving} from '../js-to-rust/test/primitive-vector-literal-receiving-data.mjs';
import * as outcome from '../js-to-rust/owned-outcome.mjs';
import * as cancellation from '../js-to-rust/owned-cancellation.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {proposeScalarChainCallbackSourceRepair} from '../scalar-chain-bulk-20261101-source-equations.mjs';
const limits={timeout:60000},u64="import('./runtime/primitive-operator-runtime.mjs').RustU64";
function source(typed=false){
 const head=name=>typed?'export function '+name+'(input: readonly ('+u64+')[])':'/** @param {readonly ('+u64+')[]} input */\nexport function '+name+'(input)';
 return head('mapped')+'{const routerChainValues0=1n;const values=input.map(item=>item+1n).filter(item=>item>2n).map(item=>item*2n);return values;}\n'+
  head('booleans')+'{const values=input.map(item=>item>1n).filter(flag=>flag);return values;}\n'+
  head('filtered')+'{const values=input.filter(item=>item>0n).map(item=>item+10n);return values;}\n'+
  head('ordered')+'{const values=input.map(item=>item+1n).map(item=>item/0n);return values;}\n'+
  head('mixed')+'{const values=input.map(item=>item>1n).map(flag=>flag?10n+2n:0n).filter(item=>item>0n);return values;}\n';
}
const chains=[{function:'mapped',local:'values',domains:['u64','u64','u64']},{function:'booleans',local:'values',domains:['bool','bool']},{function:'filtered',local:'values',domains:['u64','u64']},{function:'ordered',local:'values',domains:['u64','u64']},{function:'mixed',local:'values',domains:['bool','u64','u64']}];
const options=(family,path='caller.mjs',selected=chains)=>({family,modules:[{sourcePath:path,rustPath:'caller.rs',chains:selected}]});
for(const family of ['outcome','cancellation'])for(const typed of [false,true])test(family+' '+(typed?'written TS':'JS')+' eagerly materializes scalar stages through actual len/get/Some flow and complete inverses',limits,async()=>{
 const path=typed?'caller.mts':'caller.mjs',text=source(typed),data=receiving(family,text,path),result=propose(data,options(family,path)),module=result.modules[0],checked=module.checked,
  api=family==='outcome'?outcome:cancellation,token=await api.prepareOwnedOutcomeRuntime(checked.program);
 for(const [name,input,expected]of [['mapped',[],[]],['mapped',[0n,1n,2n,3n],[6n,8n]],['booleans',[0n,2n,1n,8n],[true,true]],['filtered',[0n,1n,2n],[11n,12n]],['mixed',[0n,2n,1n,8n],[12n,12n]]])assert.deepEqual(api.evaluateOwnedOutcome(checked.program,name,[Object.freeze(input)],token),expected);
 assert.equal(result.callbacksFused,false);assert.equal(result.evaluationOrder,'all-elements-of-each-stage-before-next-stage');
 assert.match(module.lowered,/\.\$ === "Some"/);assert.match(module.lowered,/\.field0/);
 assert.match(module.lowered,/router_vec_u64_get/);assert.match(module.lowered,/router_vec_bool_get/);assert.match(module.lowered,/integerArithmetic/);
 assert.equal(module.chains[0].stages[0].local==='routerChainValues0',false);
 assert.equal(module.histories[0].inverse,text);assert.equal(module.histories[1].inverse,module.lowered);assert.equal(module.histories[2].inverse,text);
 assert.ok(sameRustSourceSyntax(checked.canonicalRust,checked.equations[1].after));
 assert.deepEqual(result.ruleTrace.map(row=>[row.phase,row.id]),[["language","scalar-chain:materialize-every-original-callback-stage-in-source-order-through-CST"],["language","scalar-chain:reissue-all-stage-types-ownership-meta-and-both-canonical-directions"],["repository","router:retain-complete-original-chain-inverses-and-input-contract-obligations"]]);
 assert.equal(data.files.find(row=>row.path===path).source,text);
 assert.equal(result.originalArrayMethodOwnerQualified,false);assert.equal(result.originalBodyEquivalenceQualified,false);
});
test('a later element in stage one fails before stage two visits its first element',limits,async()=>{
 const result=propose(receiving('outcome',source()),options('outcome')),checked=result.modules[0].checked,token=await outcome.prepareOwnedOutcomeRuntime(checked.program);
 assert.throws(()=>outcome.evaluateOwnedOutcome(checked.program,'ordered',[Object.freeze([0n,18446744073709551615n])],token),error=>error.message==='attempt to add with overflow');
 assert.throws(()=>outcome.evaluateOwnedOutcome(checked.program,'ordered',[Object.freeze([0n])],token),error=>error.message==='attempt to divide by zero');
});
test('all 4096 intermediate primitive values retain stage order and the original resource bound',limits,async()=>{
 const result=propose(receiving('outcome',source()),options('outcome')),checked=result.modules[0].checked,token=await outcome.prepareOwnedOutcomeRuntime(checked.program);
 assert.deepEqual(outcome.evaluateOwnedOutcome(checked.program,'mapped',[Object.freeze(Array(4096).fill(2n))],token),Array(4096).fill(6n));
 assert.throws(()=>outcome.evaluateOwnedOutcome(checked.program,'mapped',[Object.freeze(Array(4097).fill(2n))],token));
});
test('chain captures index callbacks optional/lazy owners wrong domain flow and unbounded stage requests remain refused',limits,()=>{
 const head='/** @param {readonly ('+u64+')[]} input @param {'+u64+'} captured */\nexport function bad(input,captured){',
  selected=[{function:'bad',local:'values',domains:['u64','u64']}],request=options('outcome','caller.mjs',selected);
 for(const chain of ['input.map(item=>item+captured).map(item=>item)','input.map((item,index)=>item).map(item=>item)',
  'input.map(item=>item).map(item=>input[0])','input?.map(item=>item).map(item=>item)',
  'input.map(item=>item).map(item=>item, captured)','input.map(item=>item).map(async item=>item)',
  'input.map(item=>item).reduce((a,b)=>a+b)','input.map(item=>item).filter(item=>item)',
  'input.map(item=>item).map(item=>({value:item}))']){
  const text=head+'const values='+chain+';return values;}';assert.throws(()=>propose(receiving('outcome',text),request),chain);
 }
 const text=head+'const values=input.map(item=>item).filter(item=>true);return values;}';
 assert.throws(()=>propose(receiving('outcome',text),options('outcome','caller.mjs',[{...selected[0],domains:['u64','bool']}])));
 assert.throws(()=>propose(receiving('outcome',text),options('outcome','caller.mjs',[{...selected[0],domains:Array(9).fill('u64')}])));
});
test('the callback arithmetic repair retains complete immutable originals both phases and exact full inverses',limits,()=>{
 const proposal=proposeScalarChainCallbackSourceRepair();assert.equal(proposal.files.length,4);
 for(const row of proposal.files){assert.equal(row.inverse,row.before);if(row.language!=='Markdown'){assert.equal(row.equation.before,row.before);assert.equal(row.equation.after,row.after);assert.equal(row.equation.inverse,row.before);assert.deepEqual(row.equation.trace.map(stage=>stage.phase),['language','repository']);}}
 assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.receivingExecuted,false);
});
