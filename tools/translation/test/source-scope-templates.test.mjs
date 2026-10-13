import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleBindings,isResolvedSourceScopeSet} from '../module-bindings.mjs';
import {configureParserSourceScope} from '../source-scopes.mjs';

const modules=[
  {file:'src/lib.rs',path:[],source:'mod inner; use inner::Public as Alias; fn Option(){}'},
  {file:'src/inner.rs',path:['inner'],source:'pub struct Public; struct Private; pub fn Public()->u8{1} macro_rules! hidden {()=>{}}'},
].map(module=>({...module,items:sourceItems(module.source)}));
const resolve=()=>resolveModuleBindings({modules}).scopes;
const parser=(scopes,index=0,path=scopes[index].path)=>configureParserSourceScope({},scopes[index],scopes,path);
const inspect=value=>value instanceof Map?{map:[...value].map(([key,item])=>[key,inspect(item)])}:value instanceof Set?{set:[...value]}:Array.isArray(value)?value.map(inspect):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,inspect(item)])):value;

test('only the original frozen resolver array is reusable; serialized copies retain ordinary setup',()=>{
  const scopes=resolve();assert.equal(isResolvedSourceScopeSet(scopes),true);
  assert.ok(Object.isFrozen(scopes));assert.ok(Object.isFrozen(scopes[0].bindings));
  const copy=structuredClone(scopes);Object.freeze(copy);
  assert.equal(isResolvedSourceScopeSet(copy),false);assert.equal(isResolvedSourceScopeSet(scopes.slice()),false);
  assert.deepEqual(inspect(parser(scopes)),inspect(parser(copy)));
  assert.deepEqual(inspect(parser(scopes,1)),inspect(parser(copy,1)));
});

test('each parser owns fresh namespace maps and target arrays after warm setup',()=>{
  const scopes=resolve(),first=parser(scopes),expected=inspect(parser(scopes));
  for(const namespace of ['type','value','macro']){
    const map=first.sourceNamespaceAliases[namespace];
    for(const inner of map.values())for(const target of inner.values())target[0]='changed';
    map.get('').set('invented',['fake']);map.clear();
    first.sourceNamespaceShadows[namespace].add('invented');
  }
  first.sourceNamespaceBindingEvidence.clear();first.shadowedPreludeTypes.add('invented');
  first.sourceNamespaceEvidence.bindings[0].name='changed';
  assert.deepEqual(inspect(parser(scopes)),expected);
  assert.equal(scopes[0].bindings.some(binding=>binding.name==='changed'),false);
});

test('qualified private visibility is recomputed independently for each consuming path',()=>{
  const scopes=resolve();
  for(const path of [[],['inner'],['elsewhere'],['inner','child'],[]]){
    const configured=parser(scopes,0,path),target=configured.sourceNamespaceAliases.type.get('inner').get('Private');
    assert.deepEqual(target,path[0]==='inner'?['crate','inner','Private']:['crate','ml_inaccessible_source_binding','inner','Private']);
    assert.deepEqual(inspect(configured),inspect(parser(structuredClone(scopes),0,path)));
  }
});

test('mutable caller scopes observe every binding mutation and never enter the identity cache',()=>{
  const scopes=structuredClone(resolve());parser(scopes);
  const binding=scopes[1].bindings.find(binding=>binding.namespace==='type'&&binding.name==='Public');
  binding.target=['std','option','Option'];
  assert.deepEqual(parser(scopes).sourceNamespaceAliases.type.get('inner').get('Public'),['std','option','Option']);
  binding.status='ambiguous';binding.target=null;
  assert.deepEqual(parser(scopes).sourceNamespaceAliases.type.get('inner').get('Public'),['crate','ml_unresolved_source_binding','Public']);
  assert.equal(isResolvedSourceScopeSet(scopes),false);
});

test('mutable registry path collisions still refuse after an earlier successful setup',()=>{
  const scopes=structuredClone(resolve());parser(scopes);scopes[1].path=[];
  assert.throws(()=>parser(scopes),/duplicate module paths/u);
});

test('separate original resolver results keep private templates independent',()=>{
  const first=resolve(),second=resolve();assert.notEqual(first,second);
  const one=parser(first),two=parser(second);
  assert.deepEqual(inspect(one),inspect(two));assert.notEqual(one.sourceNamespaceAliases,two.sourceNamespaceAliases);
  one.sourceNamespaceAliases.type.get('inner').get('Public').push('changed');
  assert.deepEqual(inspect(parser(second)),inspect(two));
});
