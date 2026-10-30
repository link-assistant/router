// Current original Option expect + fixed checked arithmetic cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,HostChecker} from '../extensions/host-contracts.mjs';
import {checkCurrentPrimitiveOptionExpect} from '../extensions/checked-primitive-option-expect.mjs';
import {withCurrentOptionExpectSource} from '../extensions/current-option-expect-source.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../primitive-bitwise-types.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {overflowMessage} from '../vendor/meta-language/translation/aborts.js';
import {prepareCheckedOptionExpectSources} from '../prepare-checked-option-expect-sources.mjs';
const limits={timeout:60000},operations=['add','sub','mul'],owners=['::core::option::Option','core::option::Option','::std::option::Option','std::option::Option'];
function project(source){return translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});}
for(const domain of PRIMITIVE_BITWISE_TYPES)test(domain.name+' original qualified Option expect preserves all three checked arithmetic results and exact overflow failures',limits,async()=>{
 const source=owners.flatMap((owner,index)=>operations.map(operation=>'pub fn '+operation+'_'+index+'(left:'+domain.name+',right:'+domain.name+')->'+domain.name+'{'+owner+'::expect(::core::primitive::'+domain.name+'::checked_'+operation+'(left,right),'+JSON.stringify(overflowMessage(operation))+')}')).join('\n'),result=project(source);assert.deepEqual(result.meta.refused,[]);const meta=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(meta)),meta);assert.ok(result.javascript.includes('ml_integer_arithmetic'));
 const minimum=domain.signed?-BigInt(domain.minimumAbs):0n,maximum=BigInt(domain.maximum);
 await verifyTypedTargets(result,api=>{for(let index=0;index<4;index++){assert.equal(api['add_'+index](1n,1n),2n);assert.equal(api['sub_'+index](1n,1n),0n);assert.equal(api['mul_'+index](3n,2n),6n);for(const [operation,left,right]of [['add',maximum,1n],['sub',minimum,1n],['mul',maximum,2n]])assert.throws(()=>api[operation+'_'+index](left,right),error=>error instanceof RangeError&&error.message===overflowMessage(operation));}},{childTimeoutMs:20000});
});
test('genuine receiver checked operation may use the same original standard Option failure adapter',limits,async()=>{
 const result=project('pub fn add(left:u8,right:u8)->u8{::core::option::Option::expect(left.checked_add(right),"attempt to add with overflow")}');assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{assert.equal(api.add(2n,3n),5n);assert.throws(()=>api.add(255n,1n),error=>error instanceof RangeError&&error.message==='attempt to add with overflow');},{childTimeoutMs:20000});
});
for(const source of [
 'pub fn invalid(a:u8,b:u8)->u8{::core::option::Option::expect(a.checked_add(b),"wrong message")}',
 'pub fn invalid(a:u8,b:u8)->u8{::core::option::Option::expect(a.checked_mul(b),"attempt to add with overflow")}',
 'pub fn invalid(a:u8,b:u8,message:&str)->u8{::core::option::Option::expect(a.checked_add(b),message)}',
 'pub fn invalid(a:u8)->u8{::core::option::Option::expect(Some(a),"attempt to add with overflow")}',
 'pub fn invalid(a:u8,b:u8)->u16{::core::option::Option::expect(a.checked_add(b),"attempt to add with overflow")}',
 'pub fn invalid(a:u8,b:u16)->u8{::core::option::Option::expect(u8::checked_add(a,b),"attempt to add with overflow")}',
 'pub fn invalid(a:&u8,b:u8)->u8{::core::option::Option::expect(u8::checked_add(a,b),"attempt to add with overflow")}',
 'pub fn invalid(a:u8,b:u8)->u8{::core::option::Option::expect(a.checked_add(b))}',
 'pub fn invalid(a:u8,b:u8)->u8{::core::option::Option::expect(a.checked_add(b),"attempt to add with overflow",a)}',
 'pub mod core {}pub fn invalid(a:u8,b:u8)->u8{core::option::Option::expect(a.checked_add(b),"attempt to add with overflow")}',
 'use unknown::*;pub fn invalid(a:u8,b:u8)->u8{::core::option::Option::expect(a.checked_add(b),"attempt to add with overflow")}'
])test('checked Option expect preserves unsupported producer owner message arity and type refusal '+source,limits,()=>{let result;try{result=project(source);}catch(error){assert.ok(error instanceof Error);return;}assert.ok(result.meta.refused.length>0);});
test('public helper entry cannot turn a copied associated AST or arbitrary checker into arithmetic authority',limits,()=>{
 const surface=parseRust('pub fn add(a:u8,b:u8)->u8{::core::option::Option::expect(u8::checked_add(a,b),"attempt to add with overflow")}');assert.ok(checkProgram(surface));assert.throws(()=>checkProgram(structuredClone(surface)));
 const node={k:'routerPrimitiveAssociatedCall',owner:['core','option','Option'],method:'expect',args:[],span:{start:0,end:1}};assert.throws(()=>checkCurrentPrimitiveOptionExpect(new HostChecker('Rust',[]),node,new Map(),[],undefined));
});
test('original standard match and failure helper use fresh complete sources and independent selected CST inverses per operation',limits,()=>{
 let first,second;withCurrentOptionExpectSource(proof=>{first=proof;assert.equal(proof.method.body,'{matchself{Some(val)=>val,None=>expect_failed(msg),}}');assert.equal(proof.failure.body,'{panic_display(&msg)}');assert.equal(proof.method.inverse,proof.method.original);assert.equal(proof.failure.inverse,proof.failure.original);assert.equal(proof.namespaceAuthority,false);assert.equal(proof.runtimeParity,false);});withCurrentOptionExpectSource(proof=>{second=proof;});assert.notEqual(first,second);assert.notEqual(first.method.concreteSyntax,second.method.concreteSyntax);assert.deepEqual(first,second);assert.throws(()=>withCurrentOptionExpectSource(()=>Promise.resolve()));
});
test('four complete checked Option expect equations retain all original native source and exact two-phase inverses',limits,()=>{
 const plan=prepareCheckedOptionExpectSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
