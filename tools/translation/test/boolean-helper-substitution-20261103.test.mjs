// Independent Boolean truth tables; no native source-admission claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {substituteBooleanHelperExpression20261103 as substitute} from '../boolean-helper-substitution-20261103.mjs';
import {proposeBooleanHelperSources20261103} from '../boolean-helper-20261103-profile.mjs';
const bool=value=>({kind:'bool',value,type:'bool',root:null});
const variable=name=>({kind:'variable',name,type:'bool',root:null});
const binary=(op,left,right)=>({kind:'binary',op,left,right,type:'bool',root:null});
const not=value=>({kind:'not',value,type:'bool',root:null});
const choose=(cond,yes,no)=>({kind:'choose',cond,then:yes,else:no,type:'bool',root:null});
const helper=value=>({params:[{name:'a',type:'bool'},{name:'b',type:'bool'}],returns:'bool',hostCalls:[],body:[{kind:'return',value}]});
function evaluate(row,env){
 if(row.kind==='bool')return row.value;
 if(row.kind==='variable')return env[row.name];
 if(row.kind==='not')return !evaluate(row.value,env);
 if(row.kind==='choose')return evaluate(row.cond,env)?evaluate(row.then,env):evaluate(row.else,env);
 const left=evaluate(row.left,env),right=evaluate(row.right,env);
 return row.op==='&&'?left&&right:row.op==='||'?left||right:row.op==='==='?left===right:left!==right;
}
test('checked substitution preserves all Boolean truth tables and caller names',{timeout:10000},()=>{
 const a=variable('a'),b=variable('b');
 const cases=[
  [binary('&&',a,b),(x,y)=>x&&y],
  [binary('||',a,b),(x,y)=>x||y],
  [binary('===',a,b),(x,y)=>x===y],
  [binary('!==',a,b),(x,y)=>x!==y],
  [not(a),x=>!x],
  [choose(a,b,not(b)),(x,y)=>x?y:!y],
  [binary('&&',a,binary('||',a,b)),(x,y)=>x&&(x||y)],
 ];
 for(const [body,expected] of cases)for(const x of [false,true])for(const y of [false,true]){
  const original=helper(body),snapshot=structuredClone(original);
  const inlined=substitute(original,[variable('caller_left'),variable('caller_right')],()=>{});
  assert.equal(evaluate(inlined,{caller_left:x,caller_right:y}),expected(x,y));
  assert.equal(evaluate(substitute(original,[bool(x),bool(y)],()=>{}),{}),expected(x,y));
  assert.deepEqual(original,snapshot);
 }
});
test('effects, captures, locals and owned operands remain outside the helper theorem',{timeout:10000},()=>{
 const a=variable('a'),args=[bool(true),bool(false)];
 const refused=[
  helper(variable('captured')),
  {...helper(a),hostCalls:[{name:'effect'}]},
  {...helper(a),sourceCalls:[{name:'other_helper'}]},
  {...helper(a),body:[{kind:'let',name:'local',value:a},{kind:'return',value:a}]},
  helper({...binary('&&',a,bool(true)),type:'usize'}),
  helper({...a,root:'owned_input'}),
  helper({kind:'owned-call',type:'bool',root:null}),
 ];
 for(const item of refused)assert.throws(()=>substitute(item,args,()=>{}),/Boolean helper substitution/);
 for(const arg of [{kind:'call',type:'bool',root:null},{...a,type:'usize'},{...a,root:'input'}])assert.throws(()=>substitute(helper(a),[arg,bool(false)],()=>{}),/Boolean helper substitution/);
 assert.throws(()=>substitute(helper(a),[bool(true)],()=>{}),/Boolean helper substitution/);
});
test('each expanded node charges the caller budget and preserves exact primary errors',{timeout:10000},()=>{
 const primary=Object.freeze({source:'caller budget'}),source=helper(not(variable('a')));
 assert.throws(()=>substitute(source,[bool(true),bool(false)],()=>{throw primary;}),error=>error===primary);
 let nested=variable('a');for(let i=0;i<162;i++)nested=not(nested);
 assert.throws(()=>substitute(helper(nested),[bool(true),bool(false)],()=>{}),/whole|bound/);
 let charges=0;substitute(source,[bool(true),bool(false)],()=>charges++);assert.equal(charges,2);
});
test('both complete reader proposals retain original source and both CST rule sequences',{timeout:900000},()=>{
 const proposal=proposeBooleanHelperSources20261103();
 assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.nativeBindingQualified,false);
 assert.equal(proposal.files.length,2);
 for(const row of proposal.files){
  assert.equal(row.inverse,row.before);assert.notEqual(row.before,row.after);
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  assert.match(row.after,/getAliasedSymbol\(symbol\)/);
  assert.match(row.after,/actual\[0\]!==helperDeclaration/);
  assert.match(row.after,/createOwnedCoreBooleanHelperSourceContext/);
  assert.match(row.after,/substituteBooleanHelperExpression20261103/);
 }
});
