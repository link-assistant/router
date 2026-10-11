import test from 'node:test';
import assert from 'node:assert/strict';
import {Checker} from '../extensions/core.mjs';
import {BOOL,STRING,fixed} from '../vendor/meta-language/translation/types.js';
import {planPattern} from '../pattern-bindings.mjs';
const named=name=>({kind:'named',path:[name]}),data=name=>({kind:'data',name}),span={start:25,end:79};
const declaration=(name,ctors)=>({k:'data',name,ctors,span});
const field=(name,type)=>({name,type}),bind=name=>({k:'bind',name});
const surface=[
  declaration('Config',[{name:'Config',fields:[field('name',STRING),field('limit',fixed(64,false))]}]),
  declaration('OptionI32',[{name:'None',fields:[]},{name:'Some',fields:[field('field0',fixed(32,true))]}]),
  declaration('Pair',[{name:'Pair',fields:[field('field0',STRING),field('field1',named('OptionI32'))]}]),
  declaration('Tree',[{name:'Leaf',fields:[field('field0',STRING)]},{name:'Branch',fields:[field('field0',fixed(8,false)),field('field1',named('Tree'))]}]),
  declaration('Choice',[{name:'A',fields:[field('field0',fixed(32,true))]},{name:'B',fields:[field('field0',fixed(32,true))]}]),
  declaration('Different',[{name:'A',fields:[field('left',STRING)]},{name:'B',fields:[field('right',STRING)]}]),
  declaration('Wrong',[{name:'Some',fields:[field('field0',fixed(32,true))]}]),
];
const checker=new Checker('Rust',[]),declarations=checker.program({language:'Rust',items:surface}).declarations;
const plan=(pattern,type,extra={})=>planPattern(pattern,type,{declarations,span,...extra});
const project=(value,projection)=>projection.reduce((current,field)=>current[field],value);
function matches(test,value) {
  if(test.kind === 'always')return true;
  if(test.kind === 'ctor')return project(value,test.projection)?.$ === test.ctor;
  if(test.kind === 'and')return test.tests.every(test=>matches(test,value));
  if(test.kind === 'or')return test.tests.some(test=>matches(test,value));
  if(test.kind === 'literal'){const expected=['fixed','int','nat'].includes(test.type.kind)?BigInt(test.value):test.value;return project(value,test.projection) === expected;}
  throw new Error('unknown test plan');
}
function bindings(plan,value){return matches(plan.test,value)?Object.fromEntries(plan.bindings.map(binding=>[binding.name,project(value,binding.projection)])):null;}
test('single-constructor record plans preserve actual named field layouts and explicit omissions',()=>{
  const pattern={k:'routerRecordPattern',fields:[{name:'limit',pattern:bind('budget')}],rest:true};
  const checked=plan(pattern,data('Config'));assert.equal(checked.refutable,false);assert.deepEqual(checked.test,{kind:'always'});
  assert.deepEqual(checked.bindings,[{name:'budget',type:fixed(64,false),projection:['limit'],span}]);
  assert.deepEqual(bindings(checked,{$:'Config',name:'test',limit:17n}),{budget:17n});
  assert.throws(()=>plan({...pattern,rest:false},data('Config')),/without rest/);
  assert.throws(()=>plan({k:'routerRecordPattern',fields:[{name:'unknown'}],rest:true},data('Config')),/has no field/);
  assert.throws(()=>plan({k:'routerRecordPattern',fields:[{name:'limit'},{name:'limit'}],rest:true},data('Config')),/duplicate record/);
  assert.throws(()=>plan({k:'routerTuplePattern',items:[bind('name'),bind('limit')]},data('Config')),error=>error.kind === 'unsupported');
});
test('nested tuple-struct and Option plans test the variant before projecting its fields',()=>{
  const checked=plan({k:'routerTuplePattern',items:[bind('label'),{k:'ctor',path:['OptionI32','Some'],args:[bind('number')]}]},data('Pair'));
  assert.equal(checked.refutable,true);assert.deepEqual(checked.bindings.map(binding=>binding.projection),[['field0'],['field1','field0']]);
  assert.deepEqual(bindings(checked,{$:'Pair',field0:'kept',field1:{$:'Some',field0:12n}}),{label:'kept',number:12n});
  assert.equal(bindings(checked,{$:'Pair',field0:'kept',field1:{$:'None'}}),null);
  const literal=plan({k:'ctor',ctor:'Branch',args:[{k:'numLit',value:'7'},{k:'ctor',ctor:'Leaf',binds:['text']}]},data('Tree'));
  assert.equal(bindings(literal,{$:'Leaf',field0:'safe'}),null);
  assert.deepEqual(bindings(literal,{$:'Branch',field0:7n,field1:{$:'Leaf',field0:'matched'}}),{text:'matched'});
  assert.equal(bindings(literal,{$:'Branch',field0:8n,field1:{$:'Leaf',field0:'no'}}),null);
});
test('upstream normalised and compiled constructor vocabularies retain exact binding projections',()=>{
  const surface=plan({k:'ctor',path:['Some'],args:[bind('answer')]},data('OptionI32'));
  assert.deepEqual(plan({k:'data',ctor:'Some',args:[bind('answer')]},data('OptionI32')),surface);
  assert.deepEqual(plan({k:'ctor',path:['Some'],binds:['answer']},data('OptionI32')),surface);
  assert.equal(plan({k:'bindOrCtor',name:'None'},data('OptionI32')).refutable,true);
  assert.equal(plan({k:'bindOrCtor',name:'anything'},data('OptionI32')).refutable,false);
  assert.throws(()=>plan({k:'bindOrCtor',name:'Some'},data('OptionI32')),/0 of 1/);
  assert.throws(()=>plan({k:'ctor',path:['Wrong','Some'],args:[bind('answer')]},data('OptionI32')),/not a constructor/);
  assert.deepEqual(plan({k:'ctor',path:['Alias','Some'],args:[bind('answer')]},data('OptionI32'),{resolveType:()=>data('OptionI32')}),surface);
});
test('or-plans require consistent names/types/projections and prove simple constructor exhaustiveness',()=>{
  const alternatives=['A','B'].map(ctor=>({k:'ctor',ctor,args:[bind('value')]})),checked=plan({k:'or',alternatives},data('Choice'));
  assert.equal(checked.refutable,false);assert.equal(checked.test.kind,'or');
  for(const ctor of ['A','B'])assert.deepEqual(bindings(checked,{$:ctor,field0:4n}),{value:4n});
  assert.equal(plan({k:'or',alternatives:[{k:'boolLit',value:true},{k:'boolLit',value:false}]},BOOL).refutable,false);
  assert.throws(()=>plan({k:'or',alternatives:[alternatives[0],{k:'ctor',ctor:'B',args:[bind('other')]}]},data('Choice')),/same names/);
  assert.throws(()=>plan({k:'or',alternatives:['A','B'].map(ctor=>({k:'routerRecordPattern',ctor,fields:[{name:ctor === 'A'?'left':'right',pattern:bind('text')}]}))},data('Different')),error=>error.kind === 'unsupported' && /projections/.test(error.reason));
});
test('literal patterns preserve exact integer domains and JSON-serializable plan evidence',()=>{
  const checked=plan({k:'numLit',value:'18446744073709551615'},fixed(64,false));
  assert.equal(bindings(checked,18446744073709551615n) !== null,true);assert.equal(matches(checked.test,18446744073709551614n),false);
  assert.equal(JSON.parse(JSON.stringify(checked)).test.value,'18446744073709551615');
  for(const value of ['256','-1'])assert.throws(()=>plan({k:'numLit',value},fixed(8,false)),error=>error.kind === 'type');
  assert.throws(()=>plan({k:'boolLit',value:true},STRING),/wrong checked type/);
  assert.throws(()=>plan({k:'strLit',value:'\ud800'},STRING),/Unicode scalar/);
  assert.equal(matches(plan({k:'strLit',value:'Ω'},STRING).test,'Ω'),true);
});
test('duplicate binders, unresolved layouts and ownership-sensitive patterns fail with source diagnostics',()=>{
  assert.throws(()=>plan({k:'routerTuplePattern',items:[bind('same'),bind('same')]},data('Pair')),/duplicate pattern binding/);
  for(const flag of ['mutable','mut','ref','byRef','reference','borrow'])assert.throws(()=>plan({...bind('value'),[flag]:true},STRING),error=>error.kind === 'unsupported' && error.span.start === span.start);
  assert.throws(()=>plan(bind('value'),named('Missing')),error=>error.kind === 'type');
  assert.throws(()=>plan(bind('value'),data('Missing')),error=>error.kind === 'type');
  assert.throws(()=>plan(bind('value'),{kind:'any'}),error=>error.kind === 'unsupported');
  assert.throws(()=>plan(bind('value'),named('Config'),{resolveType:type=>type}),/left a named type unresolved/);
  const cyclic={k:'routerTuplePattern',items:[]};cyclic.items.push(bind('label'),cyclic);
  assert.throws(()=>plan(cyclic,data('Pair')),/cyclic pattern/);
  const checked=plan({k:'routerRecordPattern',fields:[{name:'name',pattern:{...bind('label'),span:{start:35,end:40}}}],rest:true},data('Config'));
  assert.deepEqual(checked.bindings[0].span,{start:35,end:40});
});
