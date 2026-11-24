// Independent local-substitution DATA cases, never native admission evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIMITIVE_BITWISE_TYPES} from '../primitive-bitwise-types.mjs';
import {substituteCopyScalarHelperExpression20261103 as original} from '../copy-scalar-helper-substitution-20261103.mjs';
import {substituteCopyScalarHelperLocalExpression20261103 as substitute} from '../copy-scalar-helper-local-substitution-20261103.mjs';
const variable=(name,type)=>({kind:'variable',name,type,root:null}),bool=value=>({kind:'bool',value,type:'bool',root:null});
const compare=(left,right)=>({kind:'binary',op:'<',left,right,type:'bool',root:null});
const returned=value=>({kind:'return',value});
const local=(name,value)=>({kind:'let',name,value});
const helper=(params,body,type)=>({params:params.map(([name,type])=>({name,type})),body,returns:type,hostCalls:[]});
function evaluate(row,env){
 if(row.kind==='variable')return env[row.name];if(row.kind==='bool')return row.value;if(row.kind==='integer')return BigInt(row.value);
 if(row.kind==='choose')return evaluate(row.cond,env)?evaluate(row.then,env):evaluate(row.else,env);
 if(row.kind==='not')return !evaluate(row.value,env);if(row.kind==='binary'&&row.op==='<')return evaluate(row.left,env)<evaluate(row.right,env);assert.fail('test operator');
}
test('ordered locals and branch-local names preserve every native integer boundary',{timeout:10000},()=>{
 for(const row of PRIMITIVE_BITWISE_TYPES){
  const type=row.name,a=variable('a',type),b=variable('b',type),condition=variable('condition','bool');
  const source=helper([['a',type],['b',type]],[local('condition',compare(a,b)),{kind:'if',cond:condition,then:[local('result',a),returned(variable('result',type))],else:[local('result',b),returned(variable('result',type))]}],type);
  const snapshot=structuredClone(source),out=substitute(source,[variable('caller_left',type),variable('caller_right',type)],()=>{});
  const lo=row.signed?-BigInt(row.minimumAbs):0n,hi=BigInt(row.maximum);
  for(const a of [lo,hi])for(const b of [lo,hi])assert.equal(evaluate(out,{caller_left:a,caller_right:b}),a<b?a:b);
  assert.deepEqual(source,snapshot);
 }
});
test('caller names matching helper locals remain hygienic and are never re-resolved',{timeout:10000},()=>{
 const source=helper([['input','bool']],[local('temporary',variable('input','bool')),local('again',variable('temporary','bool')),returned(variable('again','bool'))],'bool');
 const out=substitute(source,[variable('temporary','bool')],()=>{});assert.equal(out.name,'temporary');assert.equal(evaluate(out,{temporary:true}),true);
});
test('the existing no-local route retains its exact result and charge sequence',{timeout:10000},()=>{
 const source=helper([['a','bool']],[returned(variable('a','bool'))],'bool'),args=[bool(true)],before=[],after=[];
 assert.deepEqual(substitute(source,args,depth=>after.push(depth)),original(source,args,depth=>before.push(depth)));assert.deepEqual(after,before);
});
test('even unused locals cannot erase unsupported operations, captures, assignments or invalid domains',{timeout:10000},()=>{
 const valid=helper([['a','bool']],[local('tmp',bool(true)),returned(variable('a','bool'))],'bool');
 const initializers=[{kind:'owned-call',type:'bool',root:null},variable('unbound','bool'),{kind:'binary',op:'+',left:bool(true),right:bool(false),type:'bool',root:null},{kind:'not',value:{kind:'integer',value:'1',type:'u8',root:null},type:'u8',root:null},{kind:'integer',value:'256',type:'u8',root:null}];
 for(const value of initializers)assert.throws(()=>substitute({...valid,body:[local('unused',value),returned(variable('a','bool'))]},[bool(true)],()=>{}),TypeError);
 for(const body of [[local('a',bool(false)),returned(variable('a','bool'))],[local('x',variable('later','bool')),local('later',bool(true)),returned(variable('x','bool'))],[local('x',bool(true)),{kind:'assign',name:'x',value:bool(false)},returned(variable('x','bool'))],[local('x',bool(true)),returned(variable('x','bool')),returned(bool(false))]])assert.throws(()=>substitute({...valid,body},[bool(true)],()=>{}),TypeError);
});
test('normalization and final expansion share the caller work cap and exact primary',{timeout:10000},()=>{
 const source=helper([['a','bool']],[local('tmp',variable('a','bool')),returned(variable('tmp','bool'))],'bool'),primary=Object.freeze({actual:'caller budget'});
 assert.throws(()=>substitute(source,[bool(true)],()=>{throw primary;}),error=>error===primary);
 let value=variable('a','bool');for(let at=0;at<162;at++)value={kind:'not',value,type:'bool',root:null};
 assert.throws(()=>substitute({...source,body:[local('tmp',value),returned(variable('tmp','bool'))]},[bool(true)],()=>{}),/bound/);
});
