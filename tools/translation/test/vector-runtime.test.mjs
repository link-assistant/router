import test from 'node:test';
import assert from 'node:assert/strict';
import {Checker} from '../extensions/core.mjs';
import {vectorContracts} from '../extensions/vector-contracts.mjs';
import {createVectorRuntime} from '../extensions/vector-runtime.mjs';
import {valueSchema} from '../type-layout.mjs';
import {validateRustValue} from '../type-layout-runtime.mjs';
import {JSON_DATA,JSON_TYPES} from '../extensions/json-contracts.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {monomorphicTypeName} from '../monomorphic.mjs';
const check=items=>new Checker('Rust',[]).program({language:'Rust',items});
const fixed=(bits=64,signed=false)=>({kind:'fixed',bits,signed});
const runtime=(element,declarations=new Map(),options={})=>{
  const factory=vectorContracts(element,declarations),schema=valueSchema(declarations);
  return {factory,reader:createVectorRuntime(values=>validateRustValue(values,factory.receiver,schema,options))};
};
test('generic readers resolve actual primitive, nested and recursive Option layouts without collisions',()=>{
  const checked=check(structuredClone(JSON_DATA)),factory=vectorContracts(JSON_TYPES.value,checked.declarations);
  assert.equal(factory.element.name,'serde_json.Value');assert.equal(factory.data.length,checked.declarations.has(factory.option.path[0])?0:1);
  assert.notEqual(factory.option.path[0],monomorphicTypeName('Option',[JSON_TYPES.value]));
  for(const contract of factory.contracts) {
    assert.equal(contract.receiver.kind,'array');assert.equal(contract.ret.path[0],factory.option.path[0]);
    assert.equal(contract.pure,true);assert.equal(contract.constEligible,false);assert.equal(contract.borrow.result,'shared-element');
  }
  const fresh=vectorContracts({kind:'array',element:fixed()},new Map());
  const declaration=check(structuredClone(fresh.data)).declarations.get(fresh.option.path[0]);
  assert.equal(declaration.ctors[1].fields[0].type.kind,'array');
  assert.deepEqual(declaration.standardGeneric,{kind:'Option',arguments:[fresh.borrowedElement]});
  assert.equal(fresh.borrowedElement.rustReference.kind,'shared');assert.deepEqual(fresh.borrowedElement.rustReference.pointee,fresh.element);
  const unproven=new Map([[fresh.option.path[0],{...declaration,standardGeneric:undefined}]]);
  assert.throws(()=>vectorContracts({kind:'array',element:fixed()},unproven),/Conflicting checked Option provenance/);
  assert.equal(vectorContracts({kind:'array',element:fixed()},new Map([[fresh.option.path[0],declaration]])).data.length,0);
  assert.notEqual(fresh.option.path[0],vectorContracts(fixed(),new Map()).option.path[0]);
  assert.ok(Object.isFrozen(factory.contracts[0].params));
  const conflicted=new Map([[fresh.option.path[0],{k:'data',ctors:[{name:'None',fields:[]}]}]]);
  assert.throws(()=>vectorContracts({kind:'array',element:fixed()},conflicted),/Conflicting checked Option/);
  for(const type of [{kind:'any'},{kind:'named',path:['Unknown']},{kind:'fixed',bits:7,signed:false},null])assert.throws(()=>vectorContracts(type,new Map()),TypeError);
  assert.throws(()=>vectorContracts({...fixed(8),rustGenericIdentityUnresolved:true},new Map()),/unerased checked Rust generic identity/);
});
test('get first and last preserve absence, unit presence and exact usize boundaries',()=>{
  const {reader}=runtime(fixed()),values=[10n,40n,30n];
  assert.deepEqual(reader.rust_vec_get(values,1n),{$:'Some',field0:40n});
  assert.deepEqual(reader.rust_vec_first(values),{$:'Some',field0:10n});
  assert.deepEqual(reader.rust_vec_last(values),{$:'Some',field0:30n});
  for(const index of [3n,9007199254740993n,(1n<<64n)-1n])assert.deepEqual(reader.rust_vec_get(values,index),{$:'None'});
  for(const method of ['rust_vec_first','rust_vec_last'])assert.deepEqual(reader[method]([]),{$:'None'});
  for(const index of [-1n,1n<<64n,0,NaN,'0'])assert.throws(()=>reader.rust_vec_get(values,index),/usize/);
  assert.deepEqual(runtime({kind:'unit'}).reader.rust_vec_first([null]),{$:'Some',field0:null});
  assert.ok(Object.isFrozen(reader.rust_vec_first(values)));assert.deepEqual(values,[10n,40n,30n]);
});
test('readers preserve original recursive and ordinary record identity without freezing or cloning callers',()=>{
  const declarations=check([{k:'data',name:'Record',span:{start:0,end:0},ctors:[{name:'Record',fields:[{name:'value',type:fixed()}]}]}]).declarations;
  const record={$:'Record',value:9n},values=[record],reader=runtime({kind:'data',name:'Record'},declarations).reader;
  assert.equal(reader.rust_vec_first(values).field0,record);assert.equal(Object.isFrozen(record),false);assert.equal(Object.isFrozen(values),false);
  const json=serde_json_from_str('{"nested":[null,18446744073709551615]}').field0;
  const recursive=runtime(JSON_TYPES.value,check(structuredClone(JSON_DATA)).declarations).reader;
  assert.equal(recursive.rust_vec_get([json],0n).field0,json);
  const nested=runtime({kind:'array',element:fixed()}).reader,inner=[7n];assert.equal(nested.rust_vec_last([inner]).field0,inner);
});
test('every invocation revalidates domains including invalid unselected elements and explicit refinements',()=>{
  const {reader}=runtime(fixed(8)),values=[1n,2n];assert.equal(reader.rust_vec_first(values).field0,1n);
  values[1]=256n;assert.throws(()=>reader.rust_vec_first(values),/out of range/);
  assert.throws(()=>reader.rust_vec_get(values,99n),/out of range/);
  const floats=runtime({kind:'float'}).reader;assert.ok(Number.isNaN(floats.rust_vec_first([NaN]).field0));assert.equal(floats.rust_vec_last([Infinity]).field0,Infinity);
  const declarations=check(structuredClone(JSON_DATA)).declarations;
  const refinements=new Map([['serde_json.Number',value=>value.$ !== 'Float' || Number.isFinite(value.field0)]]);
  const refined=runtime(JSON_TYPES.value,declarations,{refinements}).reader;
  assert.throws(()=>refined.rust_vec_first([{$:'Number',field0:{$:'Float',field0:Infinity}}]),/refinement/);
  const cycle={$:'Array',field0:[]};cycle.field0.push(cycle);assert.throws(()=>refined.rust_vec_first([cycle]),/cyclic/);
});
test('structural checks reject sparse arrays, hidden extras and accessors without invoking getters',()=>{
  let reads=0;const reader=runtime(fixed()).reader,accessor=[1n];
  Object.defineProperty(accessor,'0',{get(){reads++;return 1n;}});
  const symbol=[1n];symbol[Symbol('extra')]=true;
  const hidden=[1n];Object.defineProperty(hidden,'extra',{value:true});
  for(const value of [new Array(1),accessor,symbol,hidden,{0:1n,length:1},[1]])assert.throws(()=>reader.rust_vec_first(value),TypeError);
  assert.equal(reads,0);
  assert.throws(()=>createVectorRuntime(),/validator/);
  assert.throws(()=>createVectorRuntime(()=>false).rust_vec_first([1n]),/did not establish/);
  assert.throws(()=>createVectorRuntime(()=>undefined).rust_vec_last([]),/did not establish/);
});
test('one registered validator observes each evaluated receiver once and adapter errors propagate',()=>{
  let validations=0,evaluations=0;
  const reader=createVectorRuntime(values=>{validations++;return validateRustValue(values,{kind:'array',element:fixed()},valueSchema(new Map()));});
  const source=()=>{evaluations++;return [8n];};
  assert.equal(reader.rust_vec_get(source(),0n).field0,8n);assert.equal(evaluations,1);assert.equal(validations,1);
  const failure=new Error('registered contract failure');assert.throws(()=>createVectorRuntime(()=>{throw failure;}).rust_vec_first([]),error=>error === failure);
});
