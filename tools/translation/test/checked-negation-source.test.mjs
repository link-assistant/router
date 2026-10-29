// Native inherent checked negation and original Option panic cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../primitive-bitwise-types.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {createFixedIntegerRuntime} from '../extensions/fixed-integer-runtime.mjs';
import {fixedIntegerContracts} from '../extensions/fixed-integer-contracts.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {prepareCheckedNegationSources} from '../prepare-checked-negation-sources.mjs';
const limits={timeout:60000};
function project(source){return translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});}
for(const domain of PRIMITIVE_BITWISE_TYPES)test(domain.name+' real inherent checked_neg retains unary arity Option layout and independent bounds',limits,async()=>{
 const fixed={kind:'fixed',bits:domain.bits,signed:domain.signed,rustPrimitiveName:domain.name},contract=fixedIntegerContracts(fixed).contracts.find(row=>row.rustPath.at(-1)==='checked_neg'),runtime=createFixedIntegerRuntime(fixed);assert.equal(contract.params.length,1);assert.equal(contract.constEligible,true);assert.equal(contract.constSince,'1.47.0');assert.deepEqual(runtime.rust_fixed_checked_neg(0n),{$:'Some',field0:0n});assert.ok(Object.isFrozen(runtime.rust_fixed_checked_neg(0n)));
 if(domain.signed){assert.deepEqual(runtime.rust_fixed_checked_neg(-1n),{$:'Some',field0:1n});assert.deepEqual(runtime.rust_fixed_checked_neg(-BigInt(domain.minimumAbs)),{$:'None'});}else assert.deepEqual(runtime.rust_fixed_checked_neg(1n),{$:'None'});for(const value of [0,'0',null,BigInt(domain.maximum)+1n])assert.throws(()=>runtime.rust_fixed_checked_neg(value));
 const source='pub fn associated(value:'+domain.name+')->bool{match ::core::primitive::'+domain.name+'::checked_neg(value){Some(_value)=>true,None=>false}}pub fn receiver(value:'+domain.name+')->bool{match value.checked_neg(){Some(_value)=>true,None=>false}}',result=project(source);assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{for(const name of ['associated','receiver']){assert.equal(api[name](0n),true);assert.equal(api[name](1n),domain.signed);if(domain.signed)assert.equal(api[name](-BigInt(domain.minimumAbs)),false);}},{childTimeoutMs:20000});
});
for(const domain of PRIMITIVE_BITWISE_TYPES.filter(row=>row.signed))test(domain.name+' exact original standard Option expect negation becomes ordinary checked unary meta',limits,async()=>{
 const source='pub fn negate(value:'+domain.name+')->'+domain.name+'{::core::option::Option::expect(::core::primitive::'+domain.name+'::checked_neg(value),"attempt to negate with overflow")}pub fn direct(value:'+domain.name+')->'+domain.name+'{-value}',result=project(source);assert.deepEqual(result.meta.refused,[]);const meta=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(meta)),meta);assert.ok(result.javascript.includes('ml_integer_arithmetic'));await verifyTypedTargets(result,api=>{for(const name of ['negate','direct']){assert.equal(api[name](0n),0n);assert.equal(api[name](-1n),1n);assert.equal(api[name](BigInt(domain.maximum)),-BigInt(domain.maximum));assert.throws(()=>api[name](-BigInt(domain.minimumAbs)),error=>error instanceof RangeError&&error.message==='attempt to negate with overflow');}},{childTimeoutMs:20000});
});
test('unsigned expect borrowed associated operands wrong arity and forged signatures retain refusals',limits,()=>{
 for(const source of ['pub fn invalid(value:u8)->u8{::core::option::Option::expect(u8::checked_neg(value),"attempt to negate with overflow")}','pub fn invalid(value:i8)->i8{::core::option::Option::expect(i8::checked_neg(value),"wrong message")}','pub fn invalid(value:&i8)->Option<i8>{i8::checked_neg(value)}','pub fn invalid(value:i8)->Option<i8>{i8::checked_neg(value,value)}']){let result;try{result=project(source);}catch(error){assert.ok(error instanceof Error);continue;}assert.ok(result.meta.refused.length>0);}
});
test('thirteen complete negation source equations preserve original sources native inverse and two fixed phases',limits,()=>{
 const plan=prepareCheckedNegationSources();assert.equal(plan.files.length,13);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
