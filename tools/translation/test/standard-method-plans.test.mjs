import test from 'node:test';
import assert from 'node:assert/strict';
import {HostChecker,parseRust} from '../extensions/host-contracts.mjs';
import {planStandardMethod,completeStandardMethod,STANDARD_METHOD_PROFILE} from '../extensions/standard-method-plans.mjs';
const U8={kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u8'},U16={kind:'fixed',bits:16,signed:false,rustPrimitiveName:'u16'},span={start:21,end:89};
const SOURCE_U8={...U8,rustSourceType:true},SOURCE_U16={...U16,rustSourceType:true};
function context() {
  const checker=new HostChecker('Rust',[]);
  const checked=checker.program(parseRust('fn input(value: Option<u8>) -> Option<u16> { None } fn result(value: Result<u8, String>) -> Option<u8> { None } enum Fake { None, Some(u8) } fn main() {}'));
  const input=checked.declarations.get('input'),result=checked.declarations.get('result');
  const options={declarations:checked.declarations,resolveType:type=>checker.resolveType(type,[],span),span};
  return {checker,checked,input,result,options};
}
test('Option.map plans use actual checked input and contextually expected output layouts',()=>{
  const {input,options}=context(),frozenBefore=Object.isFrozen(input.params[0].type),plan=planStandardMethod(input.params[0].type,'map',{...options,expected:input.ret,argumentCount:1});
  assert.equal(plan.operation,'option_map');assert.deepEqual(plan.callbackParameters,[SOURCE_U8]);assert.deepEqual(plan.callbackExpected,SOURCE_U16);
  assert.deepEqual(plan.element,SOURCE_U8);assert.equal(plan.constEligible,false);assert.deepEqual(plan.expectedResult,input.ret);
  const completed=completeStandardMethod(plan,U16,{optionType:element=>{assert.deepEqual(element,U16);return input.ret;}});
  assert.deepEqual(completed,input.ret);assert.ok(Object.isFrozen(plan.callbackParameters[0]));
  assert.equal(Object.isFrozen(input.params[0].type),frozenBefore,'plans preserve the existing mutability of borrowed checker inputs');
  assert.equal(Object.isFrozen(options.span),false,'plans do not freeze borrowed mutable source spans');
  assert.deepEqual(JSON.parse(JSON.stringify(plan)),plan,'semantic plans contain no runtime closures or Maps');
});
test('Option.map without an expected type defers output instantiation until callback checking',()=>{
  const {input,options}=context(),plan=planStandardMethod(input.params[0].type,'map',{...options,argumentCount:1});
  assert.equal(plan.callbackExpected,null);assert.equal(plan.expectedResult,null);
  let calls=0;const completed=completeStandardMethod(plan,{kind:'unit'},{optionType:(element,location)=>{calls++;assert.deepEqual(element,{kind:'unit'});assert.deepEqual(location,span);return {kind:'data',name:'checked-unit-option'};}});
  assert.deepEqual(completed,{kind:'data',name:'checked-unit-option'});assert.equal(calls,1);
});
test('Result.ok selects the checked success type and requires no callback',()=>{
  const {result,options}=context(),plan=planStandardMethod(result.params[0].type,'ok',{...options,expected:result.ret,argumentCount:0});
  assert.equal(plan.operation,'result_ok');assert.deepEqual(plan.callbackParameters,[]);assert.equal(plan.callbackExpected,null);assert.deepEqual(plan.element,SOURCE_U8);
  assert.deepEqual(completeStandardMethod(plan,null,{optionType:element=>{assert.deepEqual(element,SOURCE_U8);return result.ret;}}),result.ret);
  assert.throws(()=>completeStandardMethod(plan,U8,{optionType:()=>result.ret}),error=>error.kind==='type');
});
test('bool.then plans a zero-parameter callback and typed canonical Option result',()=>{
  const {input,options}=context(),plan=planStandardMethod({kind:'bool'},'then',{...options,expected:input.ret,argumentCount:1});
  assert.equal(plan.operation,'bool_then');assert.deepEqual(plan.callbackParameters,[]);assert.deepEqual(plan.callbackExpected,SOURCE_U16);assert.equal(plan.element,null);
  assert.deepEqual(completeStandardMethod(plan,U16,{optionType:()=>input.ret}),input.ret);
  assert.equal(planStandardMethod(U8,'then',{...options,argumentCount:1}),null);
});
test('unregistered receiver types and method names do not acquire standard behavior',()=>{
  const {input,result,options}=context();
  for(const [receiver,method] of [[{kind:'data',name:'Fake'},'map'],[input.params[0].type,'ok'],[result.params[0].type,'map'],[{kind:'string'},'then'],[input.params[0].type,'filter']])assert.equal(planStandardMethod(receiver,method,{...options,argumentCount:1}),null);
  assert.equal(planStandardMethod(null,'unknown'),null);
});
test('actual standard provenance also requires exact constructors, fields and argument agreement',()=>{
  const {input,options}=context(),name=input.params[0].type.name,original=options.declarations.get(name);
  const corruptions=[{...original,ctors:[original.ctors[0]]},{...original,ctors:[...original.ctors,original.ctors[0]]},{...original,ctors:original.ctors.map(ctor=>ctor.name==='Some'?{...ctor,fields:[{name:'other',type:U8}]}:ctor)},{...original,standardGeneric:{kind:'Option'}},{...original,standardGeneric:{kind:'Option',arguments:[U16]}},{...original,fullName:'unresolved'}];
  for(const corrupted of corruptions) {
    const declarations=new Map(options.declarations);declarations.set(name,corrupted);
    assert.throws(()=>planStandardMethod(input.params[0].type,'map',{...options,declarations,argumentCount:1}),error=>error.kind==='type' && error.span.start===span.start);
  }
});
test('arity and mismatched expected or callback types fail before canonical instantiation',()=>{
  const {input,result,options}=context();
  for(const argumentCount of [0,2,undefined])assert.throws(()=>planStandardMethod(input.params[0].type,'map',{...options,argumentCount}),error=>error.kind==='type');
  assert.throws(()=>planStandardMethod(result.params[0].type,'ok',{...options,expected:input.ret,argumentCount:0}),error=>error.kind==='type');
  assert.throws(()=>planStandardMethod({kind:'bool'},'then',{...options,expected:{kind:'data',name:'Fake'},argumentCount:1}),error=>error.kind==='type');
  const plan=planStandardMethod(input.params[0].type,'map',{...options,expected:input.ret,argumentCount:1});let calls=0;
  for(const type of [U8,{kind:'any'},{kind:'named',path:['Unresolved']},null])assert.throws(()=>completeStandardMethod(plan,type,{optionType:()=>{calls++;return input.ret;}}),error=>error.kind==='type');
  assert.equal(calls,0);
  assert.throws(()=>completeStandardMethod(plan,U16,{optionType:()=>result.ret}),error=>error.kind==='type');
  assert.throws(()=>completeStandardMethod(plan,U16,{optionType:()=>U16}),error=>error.kind==='type');
});
test('source profile pins all three ordinary non-const Rust methods',()=>{
  assert.equal(STANDARD_METHOD_PROFILE.version,'1.89.0');
  for(const [owner,method] of [['option','map'],['result','ok'],['bool','then']]) {
    const pin=STANDARD_METHOD_PROFILE[owner];assert.equal(pin.method,method);assert.equal(pin.path,`library/core/src/${owner}.rs`);assert.match(pin.sha256,/^[0-9a-f]{64}$/u);assert.ok(pin.line>0);
  }
});
