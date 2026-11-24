import test from 'node:test';
import assert from 'node:assert/strict';
import {Checker} from '../extensions/core.mjs';
import {BOOL,STRING,UNIT,FLOAT,fixed,array} from '../vendor/meta-language/translation/types.js';
import {JSON_DATA} from '../extensions/json-contracts.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {recursiveDataNames,dataAliasName,typeScriptType,typeScriptAliases,valueSchema} from '../type-layout.mjs';
import {validateRustValue} from '../type-layout-runtime.mjs';
const named=name=>({kind:'named',path:[name]}),data=name=>({kind:'data',name});
const declaration=(name,ctors)=>({k:'data',name,ctors,span:{start:0,end:0}});
const ctor=(name,types=[])=>({name,fields:types.map((type,index)=>({name:`field${index}`,type}))});
const declarations=new Checker('Rust',[]).program({language:'Rust',items:[
  declaration('Tree',[ctor('Leaf',[STRING]),ctor('Branch',[array(named('Tree'))])]),
  declaration('One',[ctor('One',[named('Two')])]),declaration('Two',[ctor('End'),ctor('Again',[named('One')])]),
  declaration('Outer',[ctor('Container',[named('One')])]),declaration('Empty',[]),
]}).declarations;
const schema=valueSchema(declarations),leaf={$:'Leaf',field0:'Ω'};
test('recursive layout analysis finds exact strongly connected types including array-mediated references',()=>{
  assert.deepEqual([...recursiveDataNames(declarations)].sort(),['One','Tree','Two']);
  assert.equal(typeScriptType(data('Tree'),declarations),dataAliasName('Tree'));
  assert.equal(typeScriptType(FLOAT,declarations),'number');assert.equal(typeScriptType(fixed(64,false),declarations),'bigint');
  assert.match(typeScriptType(data('Outer'),declarations),new RegExp(dataAliasName('One')));
  const aliases=typeScriptAliases(declarations);assert.equal(/\bany\b/u.test(aliases),false);assert.match(aliases,/ReadonlyArray</u);
  assert.ok(aliases.includes(`type ${dataAliasName('Empty')} = never;`));
  assert.equal(aliases,typeScriptAliases(new Map([...declarations].reverse())));
  assert.notEqual(dataAliasName('a.b_c'),dataAliasName('a_b.c'));
  assert.throws(()=>typeScriptType(data('Tree'),declarations,{aliases:new Set()}),/requires a named/);
  assert.throws(()=>typeScriptType(data('Tree'),declarations,{aliases:new Set(['Missing'])}),/Unknown TypeScript/);
});
test('serializable schema validates recursive finite values, allows shared acyclic children and rejects cycles',()=>{
  const roundTrip=JSON.parse(JSON.stringify(schema)),branch={$:'Branch',field0:[leaf,leaf]};
  assert.equal(validateRustValue(branch,data('Tree'),roundTrip),true);
  assert.equal(validateRustValue({$:'One',field0:{$:'End'}},data('One'),roundTrip),true);
  const cycle={$:'Branch',field0:[]};cycle.field0.push(cycle);assert.throws(()=>validateRustValue(cycle,data('Tree'),roundTrip),/cyclic/);
  assert.throws(()=>validateRustValue({$:'Leaf',field0:leaf},data('Tree'),roundTrip),/Unicode scalar/);
  assert.throws(()=>validateRustValue({$:'Nothing'},data('Empty'),roundTrip),/unknown data constructor/);
});
test('primitive machine-integer, Unicode and IEEE754 domains remain distinct',()=>{
  for(const [value,type] of [[null,UNIT],[true,BOOL],['\ufeffΩ🦀',STRING],[NaN,FLOAT],[Infinity,FLOAT],[-Infinity,FLOAT],[-0,FLOAT],[18446744073709551615n,fixed(64,false)],[-128n,fixed(8,true)],[(1n<<127n)-1n,fixed(128,true)]])assert.equal(validateRustValue(value,type,schema),true);
  for(const [value,type] of [[undefined,UNIT],[1,BOOL],['\ud800',STRING],[1n,FLOAT],[18446744073709551616n,fixed(64,false)],[-129n,fixed(8,true)],[7,fixed(8,false)]])assert.throws(()=>validateRustValue(value,type,schema),TypeError);
});
test('constructor fields and arrays reject accessors, holes and hidden extras without calling getters',()=>{
  let calls=0;
  const tagGetter={field0:'safe'};Object.defineProperty(tagGetter,'$',{enumerable:true,get(){calls++;return 'Leaf';}});
  const fieldGetter={$:'Leaf'};Object.defineProperty(fieldGetter,'field0',{enumerable:true,get(){calls++;return 'secret';}});
  const arrayGetter=[];Object.defineProperty(arrayGetter,'0',{enumerable:true,get(){calls++;return leaf;}});
  for(const value of [tagGetter,fieldGetter])assert.throws(()=>validateRustValue(value,data('Tree'),schema),/accessor/);
  assert.throws(()=>validateRustValue(arrayGetter,array(data('Tree')),schema),/accessor/);assert.equal(calls,0);
  assert.throws(()=>validateRustValue(new Array(2),array(STRING),schema),/holes/);
  assert.throws(()=>validateRustValue({$:'Leaf',field0:'valid',extra:'invalid'},data('Tree'),schema),/extra fields/);
  const hidden={$:'Leaf',field0:'valid'};Object.defineProperty(hidden,Symbol('extra'),{value:1});assert.throws(()=>validateRustValue(hidden,data('Tree'),schema),/extra fields/);
  const bare=Object.assign(Object.create(null),{$:'Leaf',field0:'valid'});assert.equal(validateRustValue(bare,data('Tree'),schema),true);
  class Wrong {}assert.throws(()=>validateRustValue(Object.assign(new Wrong(),leaf),data('Tree'),schema),/prototype/);
});
test('validation caches are invocation-local and never hide later mutations',()=>{
  const value={$:'Leaf',field0:'before'};assert.equal(validateRustValue(value,data('Tree'),schema),true);
  value.field0=3;assert.throws(()=>validateRustValue(value,data('Tree'),schema),/Unicode scalar/);
  assert.throws(()=>validateRustValue(leaf,data('Missing'),schema),/unknown data layout/);
  assert.throws(()=>validateRustValue(leaf,{kind:'any'},schema),/unsupported checked type/);
});
test('explicit data refinements enforce serde Number invariants without guessing from type names',()=>{
  const jsonDeclarations=new Checker('Rust',[]).program({language:'Rust',items:structuredClone(JSON_DATA)}).declarations;
  const jsonSchema=valueSchema(jsonDeclarations),type=data('serde_json.Value'),finite={$:'Number',field0:{$:'Float',field0:Infinity}};
  assert.equal(validateRustValue(finite,type,jsonSchema),true);
  const refinements=new Map([['serde_json.Number',value=>value.$ === 'Float'?Number.isFinite(value.field0):value.$ !== 'NegInt' || value.field0 < 0n]]);
  assert.throws(()=>validateRustValue(finite,type,jsonSchema,{refinements}),/refinement/);
  assert.throws(()=>validateRustValue({$:'Number',field0:{$:'NegInt',field0:0n}},type,jsonSchema,{refinements}),/refinement/);
  assert.equal(validateRustValue(serde_json_from_str('{"nested":[18446744073709551615,true]}').field0,type,jsonSchema,{refinements}),true);
  assert.deepEqual([...recursiveDataNames(jsonDeclarations)].sort(),['serde_json.MapEntry','serde_json.Map_String_Value','serde_json.Value']);
  assert.equal(/\bany\b/u.test(typeScriptAliases(jsonDeclarations)),false);
  assert.throws(()=>validateRustValue(finite,type,jsonSchema,{refinements:new Map([['Missing',()=>true]])}),/Invalid registered/);
});
