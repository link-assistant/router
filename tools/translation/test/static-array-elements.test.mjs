import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {emitJavaScript} from '../extensions/host-contracts.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {sharedReferenceCopyIdentity,SHARED_REFERENCE_COPY_SOURCE,STANDARD_OPTION_COPY_SOURCE} from '../shared-reference-copy-source.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const tag=($,fields={})=>Object.freeze({$,...fields});
const source=`#[derive(Clone,Copy)]pub enum Kind{First,Second}
#[derive(Clone,Copy)]pub struct Item{pub kind:Kind,pub text:&'static str,pub optional:Option<&'static str>}
pub const ITEMS:[Item;2]=[Item{kind:Kind::First,text:"É😀",optional:Some("λ")},Item{kind:Kind::Second,text:"tail",optional:None}];
impl Kind{pub fn index(self)->usize{self as usize}pub fn item(self)->&'static Item{&ITEMS[self as usize]}pub fn text(self)->&'static str{self.item().text}pub fn optional(self)->Option<&'static str>{self.item().optional}}
pub fn get(index:usize)->&'static Item{&ITEMS[index]}`;

test('source unit enum ordinals and static nominal elements retain JS and strict TS types',{timeout:60000},async()=>{
 const result=project(source);assert.deepEqual(result.meta.refused,[]);const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),aliases=[];
 for(const name of ['index','item','text','optional']){const entry=[...program.declarations.values()].find(entry=>entry.impl?.method===name);assert.ok(entry,name);assert.equal(entry.impl.copyCertificate.verified,true);aliases.push(`export {${entry.fullName} as original_${name}};`);}
 const suffix='\n'+aliases.join('\n');await verifyTypedTargets({...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix},(api,_result,module)=>{
  for(const [variant,index,text,optional]of [['First',0n,'É😀',tag('Some',{field0:'λ'})],['Second',1n,'tail',tag('None')]]){const kind=tag(variant);assert.equal(module.original_index(kind),index);const item=module.original_item(kind);assert.equal(item.text,text);assert.deepEqual(item.optional,optional);assert.equal(module.original_text(kind),text);assert.deepEqual(module.original_optional(kind),optional);assert.equal(module.original_item(kind),item);assert.ok(Object.isFrozen(item));assert.equal(api.get(index),item);}
  assert.throws(()=>api.get(-1n),RangeError);assert.throws(()=>api.get(2n),RangeError);assert.throws(()=>api.get(2),TypeError);assert.throws(()=>module.original_index(tag('Unknown')),TypeError);
 },{childTimeoutMs:20000});
});

test('private completed original initializers and dependencies cannot be replaced by public stamps',()=>{
 const result=project(source),program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),constant=[...program.declarations.values()].find(entry=>entry.constant&&entry.ret.kind==='array');
 const find=node=>node&&typeof node==='object'?(node.k==='lit'&&node.value==='É😀'?node:Object.values(node).map(find).find(Boolean)):null;const text=find(constant.body);assert.ok(text);text.value='replacement';
 assert.throws(()=>emitJavaScript(program),/initializer or dependency changed/);
 const second=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),cast=[...second.declarations.values()].find(entry=>entry.impl?.method==='index').body;assert.equal(cast.k,'routerSourceUnitEnumCast');cast.body.cases[0].body.value='1';assert.throws(()=>emitJavaScript(second),/original complete variant layout/);
});

test('non-Copy, Drop, explicit discriminants, active cfg and unproved arrays remain refused',()=>{
 for(const text of [
 'pub enum E{A,B}pub fn bad(x:E)->usize{x as usize}',
 '#[derive(Clone,Copy)]pub enum E{A=9,B}pub fn bad(x:E)->usize{x as usize}',
 '#[derive(Clone,Copy)]pub enum E{A,B}impl Drop for E{fn drop(&mut self){}}pub fn bad(x:E)->usize{x as usize}',
 '#[derive(Clone,Copy)]pub enum E{A,#[cfg(missing)]B}pub fn bad(x:E)->usize{x as usize}',
 '#[derive(Clone,Copy)]pub struct Item{n:u8}pub fn bad(x:[Item;1])->&\'static Item{&x[0usize]}',
 '#[derive(Clone,Copy)]pub struct Item{n:u8}pub const ITEMS:[Item;1]=[Item{n:255u8+1u8}];pub fn bad()->&\'static Item{&ITEMS[0usize]}',
 '#[derive(Clone,Copy)]pub struct Item{n:u8}pub const ITEMS:[Item;1]=[Item{n:1u8}];pub fn bad()->&\'static mut Item{&ITEMS[0usize]}',
 ]){const result=project(text);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,text);assert.ok(result.meta.refused.length,text);}
});

test('actual standard shared-reference Copy evidence distinguishes reference depth and pointee moves',()=>{
 const value={kind:'data',name:'Owner'},once={...value,rustReference:{kind:'shared',pointee:value}},twice={...value,rustReference:{kind:'shared',pointee:once}};
 assert.notEqual(sharedReferenceCopyIdentity(once),sharedReferenceCopyIdentity(twice));assert.equal(sharedReferenceCopyIdentity(value),null);assert.equal(sharedReferenceCopyIdentity({...once,rustReference:{kind:'mutable',pointee:value}}),null);
 assert.equal(SHARED_REFERENCE_COPY_SOURCE.pointeeDropAuthority,false);assert.equal(STANDARD_OPTION_COPY_SOURCE.payloadCopyRequired,true);
 const result=project('pub struct Owner{n:String}#[derive(Clone,Copy)]pub struct RefOwner{owner:&\'static Owner}impl RefOwner{pub fn yes(self)->bool{true}}');assert.ok(result.meta.checkedMethods.some(item=>item.name==='RefOwner.yes'));
});

test('fresh serialized metadata cannot reconstruct source-only static initializer authority',()=>{
 const result=project(source),code=`import {parseProgram} from ${JSON.stringify(new URL('../semantic-meta.mjs',import.meta.url).href)};import {emitJavaScript} from ${JSON.stringify(new URL('../extensions/host-contracts.mjs',import.meta.url).href)};import {readFileSync} from 'node:fs';emitJavaScript(parseProgram(readFileSync(0,'utf8')));`;
 assert.throws(()=>execFileSync(process.execPath,['--input-type=module','-e',code],{input:JSON.stringify(result.meta.targetSemanticProgram),encoding:'utf8',timeout:15000}),/private.*source context|private original constant borrow/);
});

test('implicit unit ordinals use the actual fixed target signed cast width',{timeout:60000},async()=>{
 const names=Array.from({length:130},(_,index)=>'V'+index),result=project('#[derive(Clone,Copy)]pub enum E{'+names.join(',')+'}pub fn signed(value:E)->i8{value as i8}pub fn unsigned(value:E)->u8{value as u8}');assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{assert.equal(api.signed(tag('V127')),127n);assert.equal(api.signed(tag('V128')),-128n);assert.equal(api.signed(tag('V129')),-127n);assert.equal(api.unsigned(tag('V129')),129n);},{childTimeoutMs:20000});
});
