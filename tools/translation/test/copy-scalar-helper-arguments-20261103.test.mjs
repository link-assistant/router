// Pure total-expression argument cases. No native admission from these rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import {substituteCopyScalarHelperArguments20261103 as substitute} from '../copy-scalar-helper-argument-substitution-20261103.mjs';
import {substituteCopyScalarHelperLocalExpression20261103 as original} from '../copy-scalar-helper-local-substitution-20261103.mjs';
const variable=(name,type='bool')=>({kind:'variable',name,type,root:null}),bool=value=>({kind:'bool',value,type:'bool',root:null});
const not=value=>({kind:'not',value,type:'bool',root:null});
const binary=(op,left,right)=>({kind:'binary',op,left,right,type:'bool',root:null});
const choose=(cond,yes,no)=>({kind:'choose',cond,then:yes,else:no,type:yes.type,root:null});
const helper=(params,value)=>({params:params.map(([name,type])=>({name,type})),returns:value.type,body:[{kind:'return',value}],hostCalls:[]});
function evaluate(row,env){if(row.kind==='variable')return env[row.name];if(row.kind==='bool')return row.value;if(row.kind==='not')return !evaluate(row.value,env);if(row.kind==='choose')return evaluate(row.cond,env)?evaluate(row.then,env):evaluate(row.else,env);const a=evaluate(row.left,env),b=evaluate(row.right,env);if(row.op==='<')return a<b;if(row.op==='&&')return a&&b;if(row.op==='||')return a||b;assert.fail('test operator');}
test('compound Boolean operands preserve independent truth tables and caller names',{timeout:10000},()=>{
 const a=variable('a'),b=variable('b'),source=helper([['a','bool'],['b','bool']],binary('&&',a,b));
 const args=[not(variable('temporary')),binary('||',variable('left'),variable('right'))],snapshot=structuredClone(args);
 const result=substitute(source,args,()=>{});
 for(const x of [false,true])for(const y of [false,true])for(const z of [false,true])assert.equal(evaluate(result,{temporary:x,left:y,right:z}),!x&&(y||z));assert.deepEqual(args,snapshot);
});
test('fixed comparisons and argument choices retain exact native roles',{timeout:10000},()=>{
 const first=variable('first','u8'),second=variable('second','u8'),source=helper([['first','u8'],['second','u8']],choose(binary('<',first,second),first,second));
 const args=[choose(variable('yes'),variable('lo','u8'),variable('hi','u8')),variable('other','u8')],result=substitute(source,args,()=>{});
 for(const yes of [false,true])for(const other of [0n,255n])assert.equal(evaluate(result,{yes,lo:0n,hi:255n,other}),(yes?0n:255n)<other?(yes?0n:255n):other);
});
test('all eager operands are validated even when unused or in an unselected helper branch',{timeout:10000},()=>{
 const source=helper([['ignored','bool']],bool(true));
 const invalid=[{kind:'owned-call',type:'bool',root:null},{kind:'not',value:variable('owned','json'),type:'bool',root:null},binary('+',bool(true),bool(false)),choose(bool(false),{kind:'source-scalar-call',type:'bool',root:null},bool(true))];
 for(const argument of invalid)assert.throws(()=>substitute(source,[argument],()=>{}),TypeError);
 assert.throws(()=>substitute(helper([['value','u8']],variable('value','u8')),[choose(bool(true),variable('a','i8'),variable('b','i8'))],()=>{}),TypeError);
});
test('the inert path retains exact prior results and work charges',{timeout:10000},()=>{
 const source=helper([['a','bool']],variable('a')),args=[bool(true)],before=[],after=[];assert.deepEqual(substitute(source,args,depth=>after.push(depth)),original(source,args,depth=>before.push(depth)));assert.deepEqual(after,before);
});
test('validation, normalization and expansion share original bounds and primary throws',{timeout:10000},()=>{
 const source=helper([['value','bool']],variable('value')),primary=Object.freeze({source:'caller budget'});
 assert.throws(()=>substitute(source,[not(bool(true))],()=>{throw primary;}),error=>error===primary);
 let expression=bool(true);for(let at=0;at<162;at++)expression=not(expression);assert.throws(()=>substitute(source,[expression],()=>{}),/bound/);
});
test('caller parameter names are not recursively substituted as helper parameters',{timeout:10000},()=>{
 const source=helper([['left','bool'],['right','bool']],binary('&&',variable('left'),variable('right')));
 const result=substitute(source,[not(variable('right')),not(variable('left'))],()=>{});
 for(const left of [false,true])for(const right of [false,true])assert.equal(evaluate(result,{left,right}),!right&&!left);
});
test('unselected integer arguments retain range, canonical spelling and root restrictions',{timeout:10000},()=>{
 const literal=value=>({kind:'integer',type:'u8',value,root:null}),source=helper([['value','u8']],variable('value','u8'));
 for(const value of ['256','-1','-0','01'])assert.throws(()=>substitute(source,[choose(bool(false),literal(value),literal('0'))],()=>{}),TypeError);
 assert.throws(()=>substitute(source,[choose(bool(false),{...variable('owned','u8'),root:'original-owned-root'},literal('0'))],()=>{}),TypeError);
});
