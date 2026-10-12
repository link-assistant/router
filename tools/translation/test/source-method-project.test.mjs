import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {parseProgram} from '../semantic-meta.mjs';
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
test('complete static/shared method bodies use the original rule in JavaScript and strict TypeScript',{timeout:30000},async()=>{
  const source='pub struct Counter{value:u8}impl Counter{pub fn make(value:u8)->Self{Self{value}}pub fn small(&self)->bool{matches!(self.value,1 | 2)}}pub fn run(value:u8)->bool{Counter::make(value).small()}';
  const result=project({'src/lib.rs':source});assert.ok(result.meta.executable.some(item=>item.name==='run'));
  for(const [name,receiver]of [['Counter.make',null],['Counter.small','shared']])assert.ok(result.meta.checkedMethods.some(item=>item.name===name&&item.receiver===receiver),name);
  await verifyTypedTargets(result,api=>{for(const [value,expected]of [[0n,false],[1n,true],[2n,true],[3n,false],[255n,false]])assert.equal(api.run(value),expected);assert.throws(()=>api.run(256n),RangeError);});
});
test('original consumed Copy method keeps its independent certificate and both-target match behavior',{timeout:30000},async()=>{
  const source='#[derive(Clone,Copy)]pub enum State{A,B}impl State{pub fn bad(self)->bool{matches!(self,Self::A)}}pub fn run(value:State)->bool{value.bad()}pub fn a()->State{State::A}pub fn b()->State{State::B}';
  const result=project({'src/lib.rs':source});assert.ok(result.meta.executable.some(item=>item.name==='run'));
  assert.ok(result.meta.checkedMethods.some(item=>item.name==='State.bad'&&item.receiver==='value'));
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),method=[...checked.declarations.values()].find(entry=>entry.impl?.method==='bad');
  assert.equal(method.params.find(param=>param.name===method.impl.receiverName).copyReceiver,true);assert.equal(method.sourceMethodProof.copyAuthority,false);
  await verifyTypedTargets(result,api=>{assert.equal(api.run(api.a()),true);assert.equal(api.run(api.b()),false);assert.throws(()=>api.run({$: 'State',tag:'A'}),TypeError);});
});
test('same-file inline and external members preserve their own full original views and module offsets',{timeout:30000},async()=>{
  const result=project({'src/lib.rs':'mod external;mod inline{pub struct Counter{value:u8}impl Counter{pub fn make(value:u8)->Self{Self{value}}pub fn small(&self)->bool{matches!(self.value,1)}}}pub fn left(value:u8)->bool{inline::Counter::make(value).small()}pub fn right(value:u8)->bool{external::Counter::make(value).small()}',
    'src/external.rs':'pub struct Counter{value:u8}impl Counter{pub fn make(value:u8)->Self{Self{value}}pub fn small(&self)->bool{matches!(self.value,2)}}'});
  assert.ok(result.meta.executable.some(item=>item.name==='left'));assert.ok(result.meta.executable.some(item=>item.name==='right'));
  for(const prefix of ['inline','external'])for(const [method,receiver]of [['make',null],['small','shared']])assert.ok(result.meta.checkedMethods.some(item=>item.name===`${prefix}.Counter.${method}`&&item.receiver===receiver));
  await verifyTypedTargets(result,api=>{for(const [value,left,right]of [[0n,false,false],[1n,true,false],[2n,false,true]]){assert.equal(api.left(value),left);assert.equal(api.right(value),right);}});
});
test('actual custom macro cfg attribute consuming and const obligations remain checked denials',()=>{
  for(const source of [
    'macro_rules! matches{($($v:tt)*)=>{true}}struct Counter{value:u8}impl Counter{fn bad(&self)->bool{matches!(self.value,1)}}pub fn run(v:Counter)->bool{v.bad()}',
    '#[external]struct Counter{value:u8}impl Counter{fn bad(&self)->bool{matches!(self.value,1)}}pub fn run(v:Counter)->bool{v.bad()}',
    'struct Counter{value:u8}#[cfg(unix)]impl Counter{fn bad(&self)->bool{matches!(self.value,1)}}pub fn run(v:Counter)->bool{v.bad()}',
    'enum State{A,B}impl State{fn bad(self)->bool{matches!(self,Self::A)}}pub fn run(v:State)->bool{v.bad()}',
    'struct Counter{value:u8}impl Counter{const fn bad(&self)->bool{matches!(self.value,1)}}pub fn run(v:Counter)->bool{v.bad()}',
  ]){const result=project({'src/lib.rs':source});assert.equal(result.meta.executable.some(item=>item.name==='run'),false,source);assert.equal(result.meta.checkedMethods.some(item=>['Counter.bad','State.bad'].includes(item.name)),false,source);assert.ok(result.meta.refused.length,source);}
});
