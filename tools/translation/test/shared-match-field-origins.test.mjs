import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {withSourceLifetimeChecker} from '../extensions/source-lifetimes.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const source='enum Amount{Amount(i32)}impl Amount{fn plus(&self,extra:i32)->i32{match self{Self::Amount(value)=>value+extra}}fn read(&self)->i32{match self{Self::Amount(value)=>*value}}fn borrow(&self)->&i32{match self{Self::Amount(value)=>value}}}pub fn plus(v:i32)->i32{Amount::Amount(v).plus(5)}pub fn read(v:&Amount)->i32{v.read()}pub fn borrowed(v:&Amount)->&i32{v.borrow()}';
const checked=result=>parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
function sharedPattern(program){
 let result;
 const walk=node=>{if(!node||typeof node!=='object'||result)return;if(node.k==='match'&&node.cases.some(arm=>arm.pattern.sharedBindingProof))result=node.cases.find(arm=>arm.pattern.sharedBindingProof).pattern;else for(const [key,value]of Object.entries(node))if(!['type','sourceMethodProof','pinnedStandardBodyProof'].includes(key))for(const item of Array.isArray(value)?value:[value])walk(item);};
 for(const entry of program.declarations.values())if(entry.k==='fn')walk(entry.body);
 assert.ok(result);return result;
}
test('actual shared primitive constructor fields retain receiver origins through arithmetic dereference and reference return',{timeout:30000},async()=>{
 const result=project(source);assert.deepEqual(result.meta.refused,[]);assert.ok(result.meta.checkedMethods.some(method=>method.name==='Amount.borrow'));
 const program=checked(result),method=[...program.declarations.values()].find(entry=>entry.impl?.method==='borrow');
 assert.equal(method.sourceLifetimeProof.outputs[0].identity,'input:0:[]');assert.deepEqual(method.sourceLifetimeProof.returnOrigins,['input:0:[]']);assert.equal(sharedPattern(program).sharedBindingProof.kind,'shared-match-ergonomics');
 const binding=sharedPattern(program).sharedBindingProof.bindings[0].type;
 assert.equal(binding.patternOwnershipRefusal,'shared source reference');assert.equal(binding.rustReference.kind,'shared');assert.equal(binding.rustReference.source,'shared-field-projection');assert.equal(binding.rustReference.pointee.rustPrimitiveName,'i32');assert.equal(binding.rustReference.pointee.rustReference,undefined);
 await verifyTypedTargets(result,api=>{const amount=Object.freeze({$:'Amount',field0:7n});assert.equal(api.plus(7n),12n);assert.equal(api.read(amount),7n);assert.equal(api.borrowed(amount),7n);assert.throws(()=>api.plus(2147483647n),RangeError);});
});
test('shared primitive field evidence grants no static escape scalar move owned receiver or aggregate reference origin',()=>{
 const cases=[
  "enum Amount{Amount(i32)}impl Amount{fn bad(&self)->&'static i32{match self{Self::Amount(value)=>value}}}",
  "fn needs(v:&'static i32)->i32{*v}enum Amount{Amount(i32)}impl Amount{fn bad(&self)->i32{match self{Self::Amount(value)=>needs(value)}}}",
  'enum Amount{Amount(i32)}impl Amount{fn bad(&self)->i32{match self{Self::Amount(value)=>value}}}',
  "enum Amount{Amount(i32)}impl Amount{fn borrow(&self)->&i32{match self{Self::Amount(value)=>value}}}pub fn bad(v:Amount)->&'static i32{v.borrow()}",
  'enum Amount{Amount(String)}impl Amount{fn bad(&self)->&String{match self{Self::Amount(value)=>value}}}',
  'enum Amount{Amount(Vec<u8>)}impl Amount{fn bad(&self)->&Vec<u8>{match self{Self::Amount(value)=>value}}}',
  'struct Inner{value:i32}enum Amount{Amount(Inner)}impl Amount{fn bad(&self)->&Inner{match self{Self::Amount(value)=>value}}}',
  "enum Amount{Amount(&'static i32)}impl Amount{fn bad(&self)->&&'static i32{match self{Self::Amount(value)=>value}}}",
  'enum Amount{Amount((i32,i32))}impl Amount{fn bad(&self)->&(i32,i32){match self{Self::Amount(value)=>value}}}',
 ];
 for(const text of cases){const result=project(text);assert.equal(result.meta.checkedMethods.some(method=>method.name==='Amount.bad'),false,text);assert.equal(result.meta.executable.some(fn=>fn.name==='bad'),false,text);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'||entry.term==='method'),text);}
});
test('missing forged getter and proxy match field evidence never bypass actual declaration and reference identity',()=>{
 const result=project(source);assert.deepEqual(result.meta.refused,[]);
 function validate(program){
  // Negative validation only; this artificial base never emits/adopts a
  // program or creates a genuine Project/Host/source/Copy proof.
  class ValidationOnlyBase{constructor(){this.language='Rust';this.items=program.declarations;}resolveType(type){return type;}program(){return program;}}
  new (withSourceLifetimeChecker(ValidationOnlyBase))().program({items:[]});
 }
 for(const mutate of [
  pattern=>{delete pattern.sharedBindingProof;},pattern=>{pattern.sharedBindingProof=null;},
  pattern=>{pattern.sharedBindingProof.bindings[0].name='other';},pattern=>{pattern.sharedBindingProof.bindings[0].field='other';},
  pattern=>{pattern.sharedBindingProof.pointee.name='Other';},pattern=>{pattern.sharedBindingProof.bindings[0].type.rustReference.pointee.rustPrimitiveName='u32';},
  pattern=>{pattern.sharedBindingProof.bindings[0].type.rustReference.sourceReceiverSpan.end++;},
  pattern=>{pattern.sharedBindingProof.bindings[0].type.rustReference.pointee.rustReference={kind:'shared',pointee:{kind:'fixed',bits:32,signed:true,rustPrimitiveName:'i32'}};},
  pattern=>{pattern.sharedBindingProof.bindings[0].type=null;},
  pattern=>{pattern.sharedBindingProof.bindings[0].type.patternOwnershipRefusal='shared field place';},
 ]){const program=checked(result),pattern=sharedPattern(program);mutate(pattern);assert.throws(()=>validate(program));}
 for(const syntax of [[],null,['i32',0]]){const program=checked(result),declaration=[...program.declarations.values()].find(entry=>entry.k==='data'&&entry.ctors.some(ctor=>ctor.name==='Amount'));declaration.ctors.find(ctor=>ctor.name==='Amount').fields[0].rustTypeSyntax=syntax;assert.throws(()=>validate(program));}
 for(const mode of ['getter','proxy']){let calls=0;const program=checked(result),pattern=sharedPattern(program);
  if(mode==='getter')Object.defineProperty(pattern,'sharedBindingProof',{get(){calls++;throw new Error('untrusted getter');},enumerable:true});
  else pattern.sharedBindingProof=new Proxy({}, {get(){calls++;throw new Error('untrusted get');},ownKeys(){calls++;throw new Error('untrusted keys');}});
  assert.throws(()=>validate(program),TypeError);assert.equal(calls,0,mode);
 }
});
