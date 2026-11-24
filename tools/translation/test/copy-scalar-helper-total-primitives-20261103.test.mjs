// Independent pure DATA expectations; no native source admission from these cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import {substituteCopyScalarHelperTotalPrimitives20261103 as substitute} from '../copy-scalar-helper-total-primitives-20261103.mjs';
import {substituteCopyScalarHelperArguments20261103 as prior} from '../copy-scalar-helper-argument-substitution-20261103.mjs';
const variable=(name,type='u8')=>({kind:'variable',name,type,root:null});
const bool=value=>({kind:'bool',type:'bool',value,root:null});
const integer=value=>({kind:'integer',type:'u8',value:String(value),root:null});
const method=(operation,args)=>({kind:'primitive-method-call',name:'primitiveIntegerMethod',args,operation,type:'u8',bits:8,signed:false,root:null});
const bitwise=(operation,args,type='u8')=>({kind:'primitive-bitwise-call',name:'primitiveBitwise',args,operation,type,root:null,...(type==='u8'?{bits:8,signed:false}:{})});
const helper=(body,hostCalls=[],params=[{name:'left',type:'u8'},{name:'right',type:'u8'}],returns='u8')=>({params,returns,body,hostCalls:hostCalls.map(name=>({name})),sourceCalls:[]});
function evaluate(row,env){
 if(row.kind==='variable')return env[row.name];if(row.kind==='integer')return BigInt(row.value);if(row.kind==='bool')return row.value;if(row.kind==='choose')return evaluate(row.cond,env)?evaluate(row.then,env):evaluate(row.else,env);
 const [a,b]=row.args.map(arg=>evaluate(arg,env));if(row.kind==='primitive-bitwise-call')return row.type==='bool'?(row.operation==='^'?a!==b:row.operation==='&'?a&&b:a||b):row.operation==='^'?a^b:row.operation==='&'?a&b:a|b;
 if(row.operation==='wrapping_add')return (a+b)%256n;if(row.operation==='saturating_add')return a+b>255n?255n:a+b;if(row.operation==='min')return a<b?a:b;assert.fail('independent test operation');
}
test('total native methods and ordered locals preserve independent byte expectations',{timeout:10000},()=>{
 for(const [operation,expected] of [['wrapping_add',4n],['saturating_add',255n],['min',10n]]){
  const fn=helper([{kind:'let',name:'temporary',value:method(operation,[variable('left'),variable('right')])},{kind:'return',value:variable('temporary')}],['primitiveIntegerMethod']);
  const result=substitute(fn,[integer(250),integer(10)],()=>{});assert.equal(evaluate(result,{}),expected);
 }
});
test('eager Boolean bitwise and caller/helper-name collisions retain truth tables',{timeout:10000},()=>{
 const fn=helper([{kind:'return',value:bitwise('^',[variable('left','bool'),variable('right','bool')],'bool')}],['primitiveBitwise'],[{name:'left',type:'bool'},{name:'right',type:'bool'}],'bool');
 const result=substitute(fn,[variable('right','bool'),variable('left','bool')],()=>{});for(const left of [false,true])for(const right of [false,true])assert.equal(evaluate(result,{left,right}),left!==right);
});
test('unused initializers and unselected operands still reject failures and foreign calls',{timeout:10000},()=>{
 for(const invalid of [method('clamp',[integer(1),integer(4),integer(2)]),{kind:'primitive-arithmetic-call',name:'integerArithmetic',operation:'div',args:[integer(1),integer(0)],type:'u8',bits:8,signed:false,root:null},{kind:'primitive-shift-call',name:'integerShift',args:[integer(1),integer(8)],type:'u8',root:null}]){
  const fn=helper([{kind:'let',name:'safe',value:method('min',[integer(1),integer(2)])},{kind:'let',name:'unused',value:invalid},{kind:'return',value:integer(0)}],['primitiveIntegerMethod',invalid.name]);assert.throws(()=>substitute(fn,[integer(1),integer(2)],()=>{}),TypeError);
 }
 const fn=helper([{kind:'return',value:method('min',[variable('left'),variable('right')])}],['foreign']);assert.throws(()=>substitute(fn,[integer(1),integer(2)],()=>{}),TypeError);
});
test('complete helper receipt census and exact domains cannot be forged by node names',{timeout:10000},()=>{
 const body=[{kind:'return',value:method('min',[variable('left'),variable('right')])}];
 for(const receipts of [[],['primitiveIntegerMethod','primitiveIntegerMethod'],['primitiveBitwise']])assert.throws(()=>substitute(helper(body,receipts),[integer(1),integer(2)],()=>{}),TypeError);
 const malformed={...body[0].value,bits:16};assert.throws(()=>substitute(helper([{kind:'return',value:malformed}],['primitiveIntegerMethod']),[integer(1),integer(2)],()=>{}),TypeError);
});
test('old scalar paths retain results and budget callbacks while new paths keep exact primaries',{timeout:10000},()=>{
 const fn=helper([{kind:'return',value:variable('left')}]),args=[integer(1),integer(2)],old=[],next=[];assert.deepEqual(substitute(fn,args,depth=>next.push(depth)),prior(fn,args,depth=>old.push(depth)));assert.deepEqual(next,old);
 const primary=Object.freeze({caller:'budget'});assert.throws(()=>substitute(helper([{kind:'return',value:method('min',[variable('left'),variable('right')])}],['primitiveIntegerMethod']),args,()=>{throw primary;}),error=>error===primary);
});
test('complement and cast carry complete source/target metadata through substitution',{timeout:10000},()=>{
 const complement={kind:'primitive-not-call',name:'primitiveNot',args:[variable('left')],type:'u8',bits:8,signed:false,root:null};
 const cast={kind:'primitive-cast-call',name:'integerCast',args:[complement],type:'i8',inputType:'u8',bits:8,signed:true,inputBits:8,inputSigned:false,root:null};
 const fn=helper([{kind:'return',value:cast}],['primitiveNot','integerCast'],[{name:'left',type:'u8'}],'i8'),result=substitute(fn,[integer(0)],()=>{});
 assert.equal(result.type,'i8');assert.equal(result.args[0].kind,'primitive-not-call');assert.deepEqual(result.args[0].args,[integer(0)]);
 for(const changed of [{inputBits:16},{inputSigned:true},{bits:16},{name:'foreign'}])assert.throws(()=>substitute(helper([{kind:'return',value:{...cast,...changed}}],['primitiveNot','integerCast'],[{name:'left',type:'u8'}],'i8'),[integer(0)],()=>{}),TypeError);
});
