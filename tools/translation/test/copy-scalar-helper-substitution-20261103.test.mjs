// Independent pure substitution cases; these DATA rows cannot admit source.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIMITIVE_BITWISE_TYPES} from '../primitive-bitwise-types.mjs';
import {substituteCopyScalarHelperExpression20261103 as substitute} from '../copy-scalar-helper-substitution-20261103.mjs';
const variable=(name,type)=>({kind:'variable',name,type,root:null});
const literal=(value,type)=>({kind:type==='bool'?'bool':'integer',value:type==='bool'?value:String(value),type,root:null});
const binary=(op,left,right)=>({kind:'binary',op,left,right,type:'bool',root:null});
const choose=(cond,yes,no)=>({kind:'choose',cond,then:yes,else:no,type:yes.type,root:null});
const helper=(params,value)=>({params:params.map(([name,type])=>({name,type})),returns:value.type,body:[{kind:'return',value}],hostCalls:[]});
function evaluate(row,env){
 if(row.kind==='variable')return env[row.name];if(row.kind==='bool')return row.value;if(row.kind==='integer')return BigInt(row.value);
 if(row.kind==='not')return !evaluate(row.value,env);if(row.kind==='choose')return evaluate(row.cond,env)?evaluate(row.then,env):evaluate(row.else,env);
 const a=evaluate(row.left,env),b=evaluate(row.right,env);switch(row.op){case '===':return a===b;case '!==':return a!==b;case '<':return a<b;case '<=':return a<=b;case '>':return a>b;case '>=':return a>=b;case '&&':return a&&b;case '||':return a||b;}assert.fail('unsupported test expression');
}
const roles=[{name:'bool',values:[false,true]},...PRIMITIVE_BITWISE_TYPES.map(row=>({name:row.name,values:[row.signed?-BigInt(row.minimumAbs):0n,BigInt(row.maximum)]}))];
test('one Copy rule preserves identity and choice for Boolean and every native integer domain',{timeout:10000},()=>{
 for(const {name:type,values} of roles){
  const a=variable('a',type),b=variable('b',type),flag=variable('yes','bool');
  for(const value of values){
   const identity=helper([['a',type]],a),snapshot=structuredClone(identity),result=substitute(identity,[literal(value,type)],()=>{});
   assert.equal(evaluate(result,{}),value);assert.deepEqual(identity,snapshot);
  }
  const selected=helper([['yes','bool'],['a',type],['b',type]],choose(flag,a,b));
  const renamed=substitute(selected,[variable('caller_flag','bool'),variable('caller_left',type),variable('caller_right',type)],()=>{});
  for(const yes of [false,true])for(const left of values)for(const right of values)assert.equal(evaluate(renamed,{caller_flag:yes,caller_left:left,caller_right:right}),yes?left:right);
  const branched={...selected,body:[{kind:'if',cond:flag,then:[{kind:'return',value:a}],else:[{kind:'return',value:b}]}]};
  const branchResult=substitute(branched,[variable('caller_flag','bool'),variable('caller_left',type),variable('caller_right',type)],()=>{});
  for(const yes of [false,true])for(const left of values)for(const right of values)assert.equal(evaluate(branchResult,{caller_flag:yes,caller_left:left,caller_right:right}),yes?left:right);
 }
});
test('comparison substitutions preserve independent boundary truth tables across ten widths',{timeout:10000},()=>{
 for(const {name:type,values} of roles){
  const a=variable('a',type),b=variable('b',type),operations=[['===',(x,y)=>x===y],['!==',(x,y)=>x!==y],...(type==='bool'?[]:[['<',(x,y)=>x<y],['<=',(x,y)=>x<=y],['>',(x,y)=>x>y],['>=',(x,y)=>x>=y]])];
  for(const [op,expected] of operations)for(const left of values)for(const right of values){
   const expression=helper([['a',type],['b',type]],binary(op,a,b));
   const result=substitute(expression,[literal(left,type),literal(right,type)],()=>{});assert.equal(evaluate(result,{}),expected(left,right));
  }
 }
});
test('every domain retains exact integer range and ownership/type refusals',{timeout:10000},()=>{
 for(const row of PRIMITIVE_BITWISE_TYPES){
  const type=row.name,value=variable('a',type),identity=helper([['a',type]],value);
  const min=row.signed?-BigInt(row.minimumAbs):0n,max=BigInt(row.maximum);
  for(const invalid of [min-1n,max+1n])assert.throws(()=>substitute(identity,[literal(invalid,type)],()=>{}),TypeError);
  for(const invalid of [{...literal(min,type),value:'-0'},{...value,root:'owned'},{...value,type:'json'},{...value,kind:'call'}])assert.throws(()=>substitute(identity,[invalid],()=>{}),TypeError);
  for(const other of PRIMITIVE_BITWISE_TYPES.filter(other=>other.name!==type))assert.throws(()=>substitute(identity,[variable('actual',other.name)],()=>{}),TypeError);
 }
 for(const type of ['str','text-owned','json','usize','f64','vec:u8','json-ref'])assert.throws(()=>substitute(helper([['a',type]],variable('a',type)),[variable('actual',type)],()=>{}),TypeError);
});
test('captures, locals, source/host calls, effects and budgets are not silently erased',{timeout:10000},()=>{
 const a=variable('a','u8'),base=helper([['a','u8']],a),args=[literal(1n,'u8')];
 for(const changed of [{...base,hostCalls:[{}]},{...base,sourceCalls:[{}]},{...base,body:[{kind:'let',value:a},{kind:'return',value:a}]},helper([['a','u8']],variable('captured','u8')),helper([['a','u8']],{kind:'primitive-bitwise-call',args:[a,a],type:'u8',root:null})])assert.throws(()=>substitute(changed,args,()=>{}),TypeError);
 assert.throws(()=>substitute(base,[],()=>{}),TypeError);const primary=Object.freeze({caller:'original budget'});
 assert.throws(()=>substitute(base,args,()=>{throw primary;}),error=>error===primary);
 let nested=variable('flag','bool');for(let at=0;at<162;at++)nested={kind:'not',value:nested,type:'bool',root:null};
 assert.throws(()=>substitute(helper([['flag','bool']],nested),[literal(true,'bool')],()=>{}),/bound/);
});
