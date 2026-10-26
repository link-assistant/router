// Independent primitive/operator regression SOURCE. Every new case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {primitiveBitwise} from '../extensions/primitive-operator-runtime.mjs';
import {requirePrimitiveOperator} from '../extensions/primitive-operators.mjs';
import {tokenizeRust,capturedRustTokenSource} from '../extensions/lexical.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {preparePrimitiveBitwiseSources} from '../prepare-primitive-bitwise-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function jsonRoundTrip(result){const text=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(text)),text);}
test('eager boolean truth tables and signed/unsigned fixed boundaries use independent exact expectations',limits,()=>{
 for(const [left,right,and,or,xor]of [[false,false,false,false,false],[false,true,false,true,true],[true,false,false,true,true],[true,true,true,true,false]])for(const [op,expected]of [['&',and],['|',or],['^',xor]])assert.equal(primitiveBitwise(left,right,op,null,null),expected);
 for(const bits of [8,16,32,64,128])for(const signed of [false,true]){const max=(1n<<BigInt(signed?bits-1:bits))-1n,min=signed?-(1n<<BigInt(bits-1)):0n;for(const [left,right,and,or,xor]of [[85n,51n,17n,119n,102n],[max,1n,1n,max,max-1n],...(signed?[[-1n,min,min,-1n,max],[-1n,0n,0n,-1n,-1n]]:[])])for(const [op,expected]of [['&',and],['|',or],['^',xor]])assert.equal(primitiveBitwise(left,right,op,bits,signed),expected,bits+' '+signed+' '+op);for(const value of [min-1n,max+1n,1,'1',null])assert.throws(()=>primitiveBitwise(value,0n,'|',bits,signed),TypeError);}
 let reads=0;const object={valueOf(){reads++;return 1;},toString(){reads++;return '&';}};for(const invoke of [()=>primitiveBitwise(object,false,'|',null,null),()=>primitiveBitwise(false,object,'|',null,null),()=>primitiveBitwise(0n,0n,'&',object,false),()=>primitiveBitwise(0n,0n,object,8,false)])assert.throws(invoke,TypeError);assert.equal(reads,0);
});
test('joint compound source punctuation retains its exact source and private token receipt',limits,()=>{
 for(const operation of ['&=','|=','^=','<<=','>>=']){const source='fn selected(){let mut value=1u8;value'+operation+'1u8;}',tokens=tokenizeRust(source),matches=tokens.filter(token=>token.value===operation);assert.equal(matches.length,1,operation);assert.equal(source.slice(matches[0].start,matches[0].end),operation);assert.equal(capturedRustTokenSource(tokens).source,source);assert.equal(capturedRustTokenSource([...tokens]),null);}
 for(const source of ['value & = right','value |/*keep*/= right','value < <= right','value > > = right']){const tokens=tokenizeRust(source);assert.equal(tokens.some(token=>['&=','|=','^=','<<=','>>='].includes(token.value)),false,source);}
});
const numeric=['u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'],operations=[['and','&'],['or','|'],['xor','^']];
test('actual emitted JS and independently strict TS execute every fixed width and boolean compound mutation',limits,async()=>{
 const source=numeric.flatMap(type=>operations.map(([name,op])=>'pub fn '+name+'_'+type+'(left:'+type+',right:'+type+')->'+type+'{left'+op+'right}')).join('')+
 operations.map(([name,op])=>'pub fn bool_'+name+'(left:bool,right:bool)->bool{let mut value=left;value'+op+'=right;value}').join('')+
 'pub fn shifts(value:u8)->u8{let mut result=value;result<<=1u8;result>>=1u8;result^=3u8;result&=15u8;result|=16u8;result}'+
 'pub fn precedence(a:u8,b:u8,c:u8,d:u8)->u8{a|b^c&d}'+
 'pub const fn constant_bool()->bool{false|true}const MASK:u8=128u8|1u8;pub fn mask()->u8{MASK}',result=project(source);for(const type of numeric)for(const [name]of operations)assert.ok(result.meta.executable.some(row=>row.name===name+'_'+type),name+'_'+type+JSON.stringify(result.meta.refused));for(const name of ['bool_and','bool_or','bool_xor','shifts','precedence','constant_bool','mask'])assert.ok(result.meta.executable.some(row=>row.name===name),name+JSON.stringify(result.meta.refused));jsonRoundTrip(result);
 await verifyTypedTargets(result,api=>{for(const type of numeric){assert.equal(api['and_'+type](85n,51n),17n);assert.equal(api['or_'+type](85n,51n),119n);assert.equal(api['xor_'+type](85n,51n),102n);}for(const [a,b,and,or,xor]of [[false,false,false,false,false],[false,true,false,true,true],[true,false,false,true,true],[true,true,true,true,false]]){assert.equal(api.bool_and(a,b),and);assert.equal(api.bool_or(a,b),or);assert.equal(api.bool_xor(a,b),xor);}assert.equal(api.shifts(5n),22n);assert.equal(api.precedence(1n,6n,3n,2n),5n);assert.equal(api.constant_bool(),true);assert.equal(api.mask(),129n);},{childTimeoutMs:20000});
});
test('boolean bitwise evaluates both source effects once while ordinary logical operators keep short-circuit order',limits,async()=>{
 const source='fn left(value:bool)->bool{let ignored=std::fs::read_to_string("left").is_ok();value}fn right(value:bool)->bool{let ignored=std::fs::read_to_string("right").is_ok();value}'+
 'pub fn eager_and(a:bool,b:bool)->bool{left(a)&right(b)}pub fn eager_or(a:bool,b:bool)->bool{left(a)|right(b)}pub fn eager_xor(a:bool,b:bool)->bool{left(a)^right(b)}pub fn lazy_and(a:bool,b:bool)->bool{left(a)&&right(b)}pub fn lazy_or(a:bool,b:bool)->bool{left(a)||right(b)}',result=project(source);for(const name of ['left','right','eager_and','eager_or','eager_xor','lazy_and','lazy_or'])assert.ok(result.meta.executable.some(row=>row.name===name),name+JSON.stringify(result.meta.refused));jsonRoundTrip(result);
 await verifyTypedTargets(result,(api,_result,_module,{effects:{withEffectCapabilities}})=>{for(const [name,a,b,wanted,callsWanted]of [['eager_and',false,true,false,['left','right']],['eager_or',true,false,true,['left','right']],['eager_xor',true,true,false,['left','right']],['lazy_and',false,true,false,['left']],['lazy_or',true,false,true,['left']]]){const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};assert.equal(withEffectCapabilities(capability,()=>api[name](a,b)),wanted);assert.deepEqual(calls,callsWanted);}}, {childTimeoutMs:20000});
});
test('mixed primitive domains borrowed values custom traits pointers and forged operation proofs stay refused',limits,()=>{
 for(const source of ['pub fn pending(a:u8,b:u16)->u8{a|b}','pub fn pending(a:&bool,b:&bool)->bool{a|b}','pub fn pending(a:f64,b:f64)->f64{a|b}','pub fn pending(a:usize,b:usize)->usize{a|b}','struct Custom{value:u8}pub fn pending(a:Custom,b:Custom)->Custom{a|b}','pub fn pending(a:u8,b:u8)->u8{let value=a;value|=b;value}']){const result=project(source);assert.equal(result.meta.executable.some(row=>row.name==='pending'),false,source);assert.ok(result.meta.refused.some(row=>row.name==='pending'));}
 assert.throws(()=>requirePrimitiveOperator({k:'routerPrimitiveScalarBitwise',type:{kind:'bool'},left:{type:{kind:'bool'}},right:{type:{kind:'bool'}},operationProof:{kind:'rust-scalar-bitwise',domain:'bool',operation:'||',evaluation:'eager-left-then-right-once',runtimeParity:false}}),/Missing checked/u);
});
test('nine complete compiler/runtime equations retain originals native owners phases and complete inverses',limits,()=>{
 const plan=preparePrimitiveBitwiseSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
