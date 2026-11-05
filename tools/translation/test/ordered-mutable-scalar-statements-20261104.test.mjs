// Independent mutable scalar DATA cases. SOURCE ONLY / UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {lowerOrderedMutableScalarStatements20261104 as lower} from '../ordered-mutable-scalar-statements-20261104.mjs';
import {lowerOrderedScalarEarlyReturnStatements20261104 as previous} from '../ordered-scalar-early-return-statements-20261104.mjs';
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
const mutable=(name,value)=>({kind:'let',name,value,mutable:true}),assign=(name,value)=>({kind:'assign',name,value}),branch=(cond,then,otherwise=[])=>({kind:'if',cond,then,else:otherwise});
test('ordered scalar reassignment reads the previous value and retains eager checked failures',{timeout:10000},()=>{
 const caller=fn(pair,[mutable('state',v('left')),assign('state',arithmetic('div',v('state'),v('right'),'assign')),ret(v('state'))]),result=lower(caller,()=>{}),events=[];
 assert.equal(execute(result.body,new Map([['left',12n],['right',3n]]),events),4n);assert.deepEqual(events,['div:assign']);const failed=[];assert.throws(()=>execute(result.body,new Map([['left',12n],['right',0n]]),failed),RangeError);assert.deepEqual(failed,['div:assign']);
});
test('both partial branch paths carry updated outer state into the following continuation',{timeout:10000},()=>{
 const params=[['condition','bool'],...pair],caller=fn(params,[mutable('state',v('left')),branch(v('condition','bool'),[assign('state',v('right'))]),assign('state',method('wrapping_add',v('state'),i(1))),ret(v('state'))]),result=lower(caller,()=>{});
 for(const condition of [false,true])for(const left of [0n,254n,255n])for(const right of [0n,254n,255n])assert.equal(execute(result.body,new Map([['condition',condition],['left',left],['right',right]]),[]),((condition?right:left)+1n)%256n);
});
test('nested mutable branch state propagates outward while inner locals never leak',{timeout:10000},()=>{
 const params=[['outer','bool'],['inner','bool'],...pair],caller=fn(params,[mutable('state',v('left')),branch(v('outer','bool'),[branch(v('inner','bool'),[assign('state',v('right'))],[assign('state',i(7))]),local('branchOnly',i(9))],[assign('state',i(3))]),local('branchOnly',v('state')),ret(v('branchOnly'))]),result=lower(caller,()=>{});
 for(const outer of [false,true])for(const inner of [false,true])assert.equal(execute(result.body,new Map([['outer',outer],['inner',inner],['left',1n],['right',11n]]),[]),outer?inner?11n:7n:3n);
});
test('early returns skip later assignments and preserve their failure order',{timeout:10000},()=>{
 const params=[['condition','bool'],...pair],caller=fn(params,[mutable('state',v('left')),branch(v('condition','bool'),[assign('state',v('right')),ret(v('state'))]),assign('state',arithmetic('div',v('state'),v('right'),'tail')),ret(v('state'))]),result=lower(caller,()=>{}),events=[];
 assert.equal(execute(result.body,new Map([['condition',true],['left',5n],['right',0n]]),events),0n);assert.deepEqual(events,[]);assert.throws(()=>execute(result.body,new Map([['condition',false],['left',5n],['right',0n]]),[]),RangeError);
});
test('helper mutable locals cannot change a caller binding with the same source spelling',{timeout:10000},()=>{
 const helper=fn([['value','u8']],[mutable('state',v('value')),assign('state',i(7)),ret(v('state'))]),caller=fn([],[mutable('state',i(2)),local('helperResult',call(helper,[v('state')])),ret(method('wrapping_add',v('state'),v('helperResult')))]),result=lower(caller,()=>{});assert.equal(execute(result.body,new Map(),[]),9n);
});
test('a branching assignment right hand retains separate environments for both continuations',{timeout:10000},()=>{
 const params=[['condition','bool']],choice={kind:'choose',cond:v('condition','bool'),then:i(1),else:i(2),type:'u8',root:null},caller=fn(params,[mutable('state',i(0)),assign('state',choice),assign('state',method('wrapping_add',v('state'),i(3))),ret(v('state'))]),result=lower(caller,()=>{});
 for(const condition of [false,true])assert.equal(execute(result.body,new Map([['condition',condition]]),[]),condition?4n:5n);
});
test('Boolean mutable locals use their original short-circuit and branch domains',{timeout:10000},()=>{
 const caller=fn([['condition','bool']],[mutable('state',b(false)),branch(v('condition','bool'),[assign('state',b(true))]),ret(v('state','bool'))],'bool'),result=lower(caller,()=>{});for(const condition of [false,true])assert.equal(execute(result.body,new Map([['condition',condition]]),[]),condition);
});
test('const, parameter, later, out-of-scope, changed-type and owned-root assignments remain refused',{timeout:10000},()=>{
 const invalid=[fn([],[local('state',i(1)),assign('state',i(2)),ret(v('state'))]),fn([['state','u8']],[assign('state',i(2)),ret(v('state'))]),fn([],[assign('later',i(2)),mutable('later',i(1)),ret(v('later'))]),fn([['condition','bool']],[branch(v('condition','bool'),[mutable('branchOnly',i(1))]),assign('branchOnly',i(2)),ret(i(0))]),fn([],[mutable('state',i(1)),assign('state',b(true)),ret(v('state'))]),fn([],[mutable('state',{...i(1),root:'owned'}),ret(v('state'))])];for(const source of invalid)assert.throws(()=>lower(source,()=>{}),TypeError);
});
test('output contains only existing immutable statements and no mutable source descriptors',{timeout:10000},()=>{
 const result=lower(fn([['condition','bool']],[mutable('state',i(0)),branch(v('condition','bool'),[assign('state',i(1))]),ret(v('state'))]),()=>{}),pending=[result.body];while(pending.length){for(const row of pending.pop()){assert.ok(['let','if','return'].includes(row.kind));assert.equal(Object.hasOwn(row,'mutable'),false);if(row.kind==='if')pending.push(row.then,row.else);}}
});
test('long flat assignment sequences retain the original depth bound and unique fresh names',{timeout:10000},()=>{
 const body=[mutable('state',i(0)),...Array.from({length:1000},(_,at)=>assign('state',i(at%256))),ret(v('state'))],result=lower(fn([],body),()=>{});assert.equal(execute(result.body,new Map(),[]),231n);const names=result.body.filter(row=>row.kind==='let').map(row=>row.name);assert.equal(new Set(names).size,names.length);
});
test('immutable bodies preserve the exact previous result and charge callback sequence',{timeout:10000},()=>{
 const source=fn([['condition','bool']],[branch(v('condition','bool'),[ret(i(1))]),ret(i(2))]),oldCharges=[],newCharges=[];assert.deepEqual(lower(source,depth=>newCharges.push(depth)),previous(source,depth=>oldCharges.push(depth)));assert.deepEqual(newCharges,oldCharges);
});
test('caller primaries propagate unchanged and recursive helpers remain unsupported',{timeout:10000},()=>{
 const source=fn([],[mutable('state',i(0)),ret(v('state'))]);for(const primary of [undefined,null,false,0,'',Object.freeze(Error('original charge'))]){let caught=false;try{lower(source,()=>{throw primary;});}catch(error){caught=true;assert.equal(error,primary);}assert.equal(caught,true);}const helper=fn([],[mutable('state',i(0))]);helper.body.push(ret(call(helper,[])));assert.throws(()=>lower(fn([],[ret(call(helper,[]))]),()=>{}),/recursive/);
});
for(const [type,low,high]of [['u8','0','255'],['i8','-128','127'],['u16','0','65535'],['i16','-32768','32767'],['u32','0','4294967295'],['i32','-2147483648','2147483647'],['u64','0','18446744073709551615'],['i64','-9223372036854775808','9223372036854775807'],['u128','0','340282366920938463463374607431768211455'],['i128','-170141183460469231731687303715884105728','170141183460469231731687303715884105727']])test(type+' mutable copies retain full signed/unsigned boundary values',{timeout:10000},()=>{
 const caller=fn([['condition','bool'],['left',type],['right',type]],[mutable('state',v('left',type)),branch(v('condition','bool'),[assign('state',v('right',type))]),ret(v('state',type))],type),result=lower(caller,()=>{});for(const condition of [false,true])assert.equal(execute(result.body,new Map([['condition',condition],['left',BigInt(low)],['right',BigInt(high)]]),[]),BigInt(condition?high:low));
});
