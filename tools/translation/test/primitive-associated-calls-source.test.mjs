// Associated primitive source cases. ALL UNRUN; no execution evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,HostChecker} from '../extensions/host-contracts.mjs';
import {checkPrimitiveAssociatedCall} from '../extensions/primitive-associated-calls.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../primitive-bitwise-types.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {preparePrimitiveAssociatedCallSources} from '../prepare-primitive-associated-call-sources.mjs';
const limits={timeout:60000};
const inherent=['wrapping_add','wrapping_sub','wrapping_mul','saturating_add','saturating_sub','saturating_mul'];
function project(source){return translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});}
function qualified(type){return [type,'core::primitive::'+type,'::core::primitive::'+type,'std::primitive::'+type,'::std::primitive::'+type];}
for(const domain of PRIMITIVE_BITWISE_TYPES)test(domain.name+' all qualified inherent operations re-enter the actual native parser and complete paired meta',limits,async()=>{
 const source=qualified(domain.name).flatMap((owner,index)=>inherent.map(method=>'pub fn '+method+'_'+index+'(left:'+domain.name+',right:'+domain.name+')->'+domain.name+'{'+owner+'::'+method+'(left,right)}')).join('\n'),result=project(source);assert.deepEqual(result.meta.refused,[]);const meta=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(meta)),meta);
 const minimum=domain.signed?-BigInt(domain.minimumAbs):0n,maximum=BigInt(domain.maximum),wrap=value=>domain.signed?BigInt.asIntN(domain.bits,value):BigInt.asUintN(domain.bits,value),clamp=value=>value<minimum?minimum:value>maximum?maximum:value;
 await verifyTypedTargets(result,api=>{for(let index=0;index<5;index++)for(const [left,right]of [[minimum,1n],[maximum,2n],[0n,0n]]){assert.equal(api['wrapping_add_'+index](left,right),wrap(left+right));assert.equal(api['wrapping_sub_'+index](left,right),wrap(left-right));assert.equal(api['wrapping_mul_'+index](left,right),wrap(left*right));assert.equal(api['saturating_add_'+index](left,right),clamp(left+right));assert.equal(api['saturating_sub_'+index](left,right),clamp(left-right));assert.equal(api['saturating_mul_'+index](left,right),clamp(left*right));}},{childTimeoutMs:20000});
});
for(const domain of PRIMITIVE_BITWISE_TYPES)test(domain.name+' actual associated checked operations preserve the standard Option constructor and overflow branch',limits,async()=>{
 const source=qualified(domain.name).flatMap((owner,index)=>['checked_add','checked_sub','checked_mul'].map(method=>'pub fn '+method+'_'+index+'(left:'+domain.name+',right:'+domain.name+')->bool{match '+owner+'::'+method+'(left,right){Some(_value)=>true,None=>false}}')).join('\n'),result=project(source);assert.deepEqual(result.meta.refused,[]);
 const minimum=domain.signed?-BigInt(domain.minimumAbs):0n,maximum=BigInt(domain.maximum);await verifyTypedTargets(result,api=>{for(let index=0;index<5;index++){assert.equal(api['checked_add_'+index](maximum,1n),false);assert.equal(api['checked_sub_'+index](minimum,1n),false);assert.equal(api['checked_mul_'+index](maximum,2n),false);for(const method of ['checked_add','checked_sub','checked_mul'])assert.equal(api[method+'_'+index](1n,1n),true);}},{childTimeoutMs:20000});
});
for(const domain of PRIMITIVE_BITWISE_TYPES)test(domain.name+' fully qualified Ord selects only actual by-value primitive instances including clamp failure',limits,async()=>{
 const owners=['core::cmp::Ord','::core::cmp::Ord','std::cmp::Ord','::std::cmp::Ord'],source=owners.flatMap((owner,index)=>['min','max','clamp'].map(method=>'pub fn '+method+'_'+index+'(left:'+domain.name+',right:'+domain.name+(method==='clamp'?',upper:'+domain.name:'')+')->'+domain.name+'{'+owner+'::'+method+'(left,right'+(method==='clamp'?',upper':'')+')}')).join('\n'),result=project(source);assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{for(let index=0;index<4;index++){assert.equal(api['min_'+index](7n,2n),2n);assert.equal(api['max_'+index](7n,2n),7n);assert.equal(api['clamp_'+index](7n,2n,4n),4n);assert.throws(()=>api['clamp_'+index](7n,4n,2n),RangeError);}},{childTimeoutMs:20000});
});
for(const source of [
 'pub fn invalid(a:&u8,b:u8)->u8{u8::wrapping_mul(a,b)}',
 'pub fn invalid(a:u8,b:u16)->u8{::core::primitive::u8::wrapping_mul(a,b)}',
 'pub fn invalid(a:u8,b:u8)->u16{u8::wrapping_mul(a,b)}',
 'pub fn invalid(a:u8)->u8{u8::wrapping_mul(a)}',
 'pub fn invalid(a:u8,b:u8)->u8{u8::wrapping_mul(a,b,a)}',
 'pub fn invalid(a:&u8,b:&u8)->&u8{::core::cmp::Ord::min(a,b)}',
 'pub fn invalid(a:usize,b:usize)->usize{::core::primitive::usize::wrapping_mul(a,b)}',
 'pub struct Word;pub fn invalid(a:Word,b:Word)->Word{::core::cmp::Ord::min(a,b)}',
 'pub fn invalid<T>(a:T,b:T)->T{::core::cmp::Ord::min(a,b)}',
 'use unknown::*;pub fn invalid(a:u8,b:u8)->u8{u8::wrapping_mul(a,b)}',
 'pub mod core {}pub fn invalid(a:u8,b:u8)->u8{core::primitive::u8::wrapping_mul(a,b)}',
 'pub fn invalid(a:u8,b:u8)->u8{use unknown::core;core::primitive::u8::wrapping_mul(a,b)}'
])test('associated primitive refusal keeps unsupported original owner type arity or source '+source,limits,()=>{let result;try{result=project(source);}catch(error){assert.ok(error instanceof Error);return;}assert.ok(result.meta.refused.length>0);});
test('serialized copied forged and changed associated source AST never creates semantic authority',limits,()=>{
 const surface=parseRust('pub fn product(left:u8,right:u8)->u8{::core::primitive::u8::wrapping_mul(left,right)}');assert.ok(checkProgram(surface));assert.throws(()=>checkProgram(structuredClone(surface)));
 const node={k:'routerPrimitiveAssociatedCall',owner:['core','primitive','u8'],method:'wrapping_mul',args:[],span:{start:0,end:1}};assert.throws(()=>checkPrimitiveAssociatedCall(new HostChecker('Rust',[]),node,new Map(),[],undefined));
});
test('nested actual modules retain independent namespace selection and source-bound checked operations',limits,async()=>{
 const result=project('pub mod left {pub fn product(a:u8,b:u8)->u8{::core::primitive::u8::wrapping_mul(a,b)}}pub mod right {pub fn product(a:u16,b:u16)->u16{::core::primitive::u16::wrapping_mul(a,b)}}');assert.deepEqual(result.meta.refused,[]);assert.ok(result.executableDeclarations.some(row=>row.qualifiedName==='left.product'));assert.ok(result.executableDeclarations.some(row=>row.qualifiedName==='right.product'));
});
test('four complete associated source equations retain exact original inverses and two fixed phases',limits,()=>{
 const plan=preparePrimitiveAssociatedCallSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
