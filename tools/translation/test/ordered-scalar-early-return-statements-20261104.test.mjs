// Independent ordered helper DATA cases; no native admission or local execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {lowerOrderedScalarEarlyReturnStatements20261104 as lower} from '../ordered-scalar-early-return-statements-20261104.mjs';
import {lowerOrderedScalarHelperStatements20261103 as previous} from '../ordered-scalar-helper-statements-20261103.mjs';
import * as runtime from '../extensions/primitive-operator-runtime.mjs';
const v=(name,type='u8')=>({kind:'variable',name,type,root:null}),i=value=>({kind:'integer',value:String(value),type:'u8',root:null}),b=value=>({kind:'bool',value,type:'bool',root:null});
const arithmetic=(operation,left,right,label='')=>({kind:'primitive-arithmetic-call',name:'integerArithmetic',args:[left,right],operation,type:'u8',bits:8,signed:false,root:null,testLabel:label});
const method=(operation,left,right)=>({kind:'primitive-method-call',name:'primitiveIntegerMethod',args:[left,right],operation,type:'u8',bits:8,signed:false,root:null});
const fn=(params,body,returns='u8')=>({params:params.map(([name,type])=>({name,type})),body,returns});
const call=(helper,args)=>({kind:'ordered-scalar-helper-call',helper,args,type:helper.returns,root:null});
const ret=value=>({kind:'return',value}),local=(name,value)=>({kind:'let',name,value});
const pair=[['left','u8'],['right','u8']];
function execute(body,env,events){
 function value(row,scope){
  if(row.kind==='variable'){assert.ok(scope.has(row.name),'independent interpreter requires lexical binding');return scope.get(row.name);}if(row.kind==='integer')return BigInt(row.value);if(row.kind==='bool')return row.value;if(row.kind==='not')return !value(row.value,scope);
  if(row.kind==='choose')return value(row.cond,scope)?value(row.then,scope):value(row.else,scope);
  if(row.kind==='binary'){const left=value(row.left,scope);if(row.op==='&&')return left&&value(row.right,scope);if(row.op==='||')return left||value(row.right,scope);const right=value(row.right,scope);if(row.op==='<')return left<right;if(row.op==='===')return left===right;assert.fail('independent test binary');}
  const args=row.args.map(arg=>value(arg,scope));
  if(row.kind==='ordered-scalar-helper-call')return execute(row.helper.body,new Map(row.helper.params.map((param,at)=>[param.name,args[at]])),events);
  events.push(row.operation+':'+(row.testLabel??''));
  if(row.kind==='primitive-arithmetic-call')return runtime.integerArithmetic(args[0],args[1],row.bits,row.signed,row.operation);
  if(row.kind==='primitive-method-call')return runtime.primitiveIntegerMethod(args[0],args[1],null,row.bits,row.signed,row.operation);
  assert.fail('independent test operation');
 }
 const scope=new Map(env);for(const statement of body){if(statement.kind==='let')scope.set(statement.name,value(statement.value,scope));else if(statement.kind==='return')return value(statement.value,scope);else if(statement.kind==='if')return execute(value(statement.cond,scope)?statement.then:statement.else,scope,events);else assert.fail('existing statement IR only');}assert.fail('complete test return required');
}
test('unused division remains eager and fails at the original helper position',{timeout:10000},()=>{
 const helper=fn(pair,[local('unused',arithmetic('div',v('left'),v('right'),'helper')),ret(i(7))]),caller=fn(pair,[ret(call(helper,[v('left'),v('right')]))]),result=lower(caller,()=>{}),events=[];
 assert.throws(()=>execute(result.body,new Map([['left',1n],['right',0n]]),events),RangeError);assert.deepEqual(events,['div:helper']);
 const passed=[];assert.equal(execute(result.body,new Map([['left',1n],['right',1n]]),passed),7n);assert.deepEqual(passed,['div:helper']);assert.equal(result.nativeBindingQualified,false);
});
test('unused helper arguments still execute left to right before entry',{timeout:10000},()=>{
 const helper=fn(pair,[ret(i(7))]),caller=fn([],[ret(call(helper,[arithmetic('div',i(1),i(0),'first'),arithmetic('add',i(255),i(1),'second')]))]),result=lower(caller,()=>{}),events=[];
 assert.throws(()=>execute(result.body,new Map(),events),RangeError);assert.deepEqual(events,['div:first']);
 const reversed=lower(fn([],[ret(call(helper,[arithmetic('add',i(255),i(1),'first'),arithmetic('div',i(1),i(0),'second')]))]),()=>{}),other=[];assert.throws(()=>execute(reversed.body,new Map(),other),RangeError);assert.deepEqual(other,['add:first']);
});
test('a helper parameter used twice evaluates its original operand once',{timeout:10000},()=>{
 const helper=fn([['value','u8']],[ret(method('wrapping_add',v('value'),v('value')))]),result=lower(fn([],[ret(call(helper,[arithmetic('div',i(12),i(3),'argument')]))]),()=>{}),events=[];
 assert.equal(execute(result.body,new Map(),events),8n);assert.deepEqual(events,['div:argument','wrapping_add:']);
});
test('short circuit and conditional branches keep failing operations lazy',{timeout:10000},()=>{
 const helper=fn(pair,[local('unused',arithmetic('div',v('left'),v('right'),'lazy')),ret(b(true))],'bool'),right=call(helper,[i(1),i(0)]);
 for(const op of ['&&','||']){const result=lower(fn([['condition','bool']],[ret({kind:'binary',op,left:v('condition','bool'),right,type:'bool',root:null})],'bool'),()=>{}),events=[];assert.equal(execute(result.body,new Map([['condition',op==='||']]),events),op==='||');assert.deepEqual(events,[]);assert.throws(()=>execute(result.body,new Map([['condition',op==='&&']]),[]),RangeError);}
 const choice={kind:'choose',cond:v('condition','bool'),then:right,else:b(false),type:'bool',root:null},result=lower(fn([['condition','bool']],[ret(choice)],'bool'),()=>{}),events=[];assert.equal(execute(result.body,new Map([['condition',false]]),events),false);assert.deepEqual(events,[]);
});
test('branch continuations do not capture a local from another initializer arm',{timeout:10000},()=>{
 const choice={kind:'choose',cond:v('condition','bool'),then:i(1),else:v('temporary'),type:'u8',root:null};assert.throws(()=>lower(fn([['condition','bool']],[local('temporary',choice),ret(v('temporary'))]),()=>{}),/unbound/);
 const good={...choice,else:i(2)},result=lower(fn([['condition','bool'],['router_inline_0','u8']],[local('temporary',good),ret(v('temporary'))]),()=>{});for(const condition of [false,true])assert.equal(execute(result.body,new Map([['condition',condition],['router_inline_0',255n]]),[]),condition?1n:2n);
});
test('sequential calls to one helper are allowed but recursion remains explicit',{timeout:10000},()=>{
 const helper=fn([['value','u8']],[ret(v('value'))]),caller=fn([],[ret(method('wrapping_add',call(helper,[i(1)]),call(helper,[i(2)])))]);assert.equal(execute(lower(caller,()=>{}).body,new Map(),[]),3n);
 const recursive=fn([],[ret(i(0))]);recursive.body=[ret(call(recursive,[]))];assert.throws(()=>lower(fn([],[ret(call(recursive,[]))]),()=>{}),/recursive/);
});
test('long flat blocks keep the original structural depth and complete statement count',{timeout:10000},()=>{
 const body=Array.from({length:1000},(_,at)=>local('value_'+at,i(at%256)));body.push(ret(v('value_999')));const result=lower(fn([],body),()=>{});assert.equal(result.body.length,1001);assert.equal(execute(result.body,new Map(),[]),231n);
});
test('caller budget primaries and complete malformed-domain refusals propagate',{timeout:10000},()=>{
 const primary=Object.freeze({caller:'budget'});assert.throws(()=>lower(fn([],[ret(i(0))]),()=>{throw primary;}),error=>error===primary);
 const helper=fn(pair,[ret(i(0))]);assert.throws(()=>lower(fn([],[ret(call(helper,[b(true),i(0)]))]),()=>{}),/domain/);assert.throws(()=>lower(fn([],[local('missingReturn',i(0))]),()=>{}),/terminating/);
});
const branch=(cond,yes,no=[])=>({kind:'if',cond,then:yes,else:no});
test('an early helper return skips its own tail but resumes the caller continuation',{timeout:10000},()=>{
 const params=[['condition','bool'],...pair],helper=fn(params,[branch(v('condition','bool'),[ret(v('left'))]),local('unused',arithmetic('div',v('left'),v('right'),'tail')),ret(i(7))]),caller=fn(params,[ret(method('wrapping_add',call(helper,[v('condition','bool'),v('left'),v('right')]),i(1)))]),result=lower(caller,()=>{}),events=[];
 assert.equal(execute(result.body,new Map([['condition',true],['left',5n],['right',0n]]),events),6n);assert.deepEqual(events,['wrapping_add:']);
 const failed=[];assert.throws(()=>execute(result.body,new Map([['condition',false],['left',5n],['right',0n]]),failed),RangeError);assert.deepEqual(failed,['div:tail']);
 const passed=[];assert.equal(execute(result.body,new Map([['condition',false],['left',5n],['right',1n]]),passed),8n);assert.deepEqual(passed,['div:tail','wrapping_add:']);
});
test('branch locals cannot leak into a later outer declaration on either fallthrough',{timeout:10000},()=>{
 const params=[['condition','bool'],...pair],caller=fn(params,[branch(v('condition','bool'),[local('temporary',i(9))],[local('other',i(8))]),local('temporary',arithmetic('div',v('left'),v('right'),'after')),ret(v('temporary'))]),result=lower(caller,()=>{});
 for(const condition of [false,true]){const events=[];assert.equal(execute(result.body,new Map([['condition',condition],['left',12n],['right',3n]]),events),4n);assert.deepEqual(events,['div:after']);}
});
test('an early branch cannot capture a later declaration or lose its original type',{timeout:10000},()=>{
 const params=[['condition','bool']];assert.throws(()=>lower(fn(params,[branch(v('condition','bool'),[ret(v('later'))]),local('later',i(1)),ret(v('later'))]),()=>{}),/unbound/);
 assert.throws(()=>lower(fn(params,[branch(v('condition','bool'),[ret(b(true))]),ret(i(1))]),()=>{}),/domain/);
});
test('missing paths and statements after a complete return tree remain refused',{timeout:10000},()=>{
 const params=[['condition','bool']];assert.throws(()=>lower(fn(params,[branch(v('condition','bool'),[ret(i(1))])]),()=>{}),/every path/);
 assert.throws(()=>lower(fn(params,[branch(v('condition','bool'),[ret(i(1))],[ret(i(2))]),local('unreachable',i(0)),ret(i(3))]),()=>{}),/terminating/);
});
test('complete returning bodies retain the previous exact result and callback work',{timeout:10000},()=>{
 const source=fn([['condition','bool']], [branch(v('condition','bool'),[ret(i(1))],[ret(i(2))])]),before=[],after=[];
 assert.deepEqual(lower(source,depth=>after.push(depth)),previous(source,depth=>before.push(depth)));assert.deepEqual(after,before);
});
