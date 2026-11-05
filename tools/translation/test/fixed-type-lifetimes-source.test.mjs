// Independent lifetime-only scalar adoption cases. SOURCE ONLY; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCoreFixedTypesCorpus as ordinary} from '../migrate-core-fixed-types.mjs';
import {proposeCoreFixedTypesCorpus as bound} from '../source-bound-owned-migrate-core-fixed-types.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {readLifetimeOnlySourceBinders,readLifetimeOnlyTypeOwnerSource} from '../lifetime-only-declaration-source.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareFixedTypeLifetimeSources} from '../prepare-fixed-type-lifetimes-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::';
function fixture(source){return {entry:'src/lib.rs',files:{'src/lib.rs':'pub mod translation_fixed_types_core;\n'+source,'src/translation_fixed_types_core.rs':FIXED_TYPE_CORE_NATIVE_SOURCE}};}
function inverse(result){for(const row of result.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution'){assert.equal(source.slice(...edit.after),edit.replacement);source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);}assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);}}
for(const [label,propose]of [['ordinary',ordinary],['source-bound',bound]]){
 test(label+' lifetime-only function/record/tuple/enum/alias/impl owners share ten exact scalar substitutions and complete inverses',limits,()=>{
  const source="pub struct Borrowed<'a>{pub value:&'a u64,pub tag:bool}\npub struct Pair<'a>(pub &'a i64);\npub enum Choice<'a>{Empty,Some(&'a u32)}\npub type Reference<'a> = Option<&'a u16>;\npub fn choose<'a,'b:'a>(left:&'a u64,right:&'b u64)->&'a u64{left}\nimpl<'a> Borrowed<'a>{pub fn method(&self,input:&'a u8)->&'a u8{input}}",input=fixture(source),result=propose(input),text=result.after[input.entry];assert.equal(result.proposals.reduce((n,row)=>n+row.edits.length,0),10);for(const name of ['U64','Bool','I64','U32','U16','U8'])assert.ok(text.includes(C+name));assert.ok(text.includes("fn choose<'a,'b:'a>(left:&'a "+C+'U64'));assert.ok(text.includes("impl<'a> Borrowed<'a>{pub fn method(&self,input:&'a "+C+'U8'));inverse(result);assert.deepEqual(propose({...input,files:result.after}).after,result.after);assert.equal(result.executableAdmission,false);
 });
 test(label+' an unsupported type/const binder unknown region or where-owner preserves its entire owner and independent valid constants',limits,()=>{
  for(const source of ["pub fn bad<'a,T>(value:u64,other:&'a T)->u64{value}","pub fn bad<const N:usize>(value:u64)->u64{value}","pub fn bad<'a>(first:u64,value:&'missing u64)->u64{first}","pub fn bad<'a:'missing>(value:u64)->u64{value}","pub fn bad<'a,'a>(value:u64)->u64{value}","pub struct Bad<'a,T>{value:&'a u64,other:T}","pub type Bad<'a,const N:usize>=(&'a u64,[u8;N]);","pub struct Owner;impl<'a> Owner<'missing>{pub fn bad(value:u64)->u64{value}}","pub struct Owner;impl<'a> Owner where Owner:Trait{pub fn bad(value:u64)->u64{value}}"]){const input=fixture(source+'\npub const GOOD:u8 = 1;'),result=propose(input),text=result.after[input.entry];assert.ok(text.includes(source));assert.ok(text.includes('pub const GOOD:'+C+'U8 = 1;'));inverse(result);}
 });
 test(label+' named reference regions cannot be invented by a type candidate and protected lifetime libraries remain unchanged',limits,()=>{
  const source="pub mod translation_private {pub struct Hold<'a>{pub value:&'a u64}}pub fn valid<'a>(value:&'a u64)->&'a u64{value}",input=fixture(source),result=propose(input);assert.ok(result.after[input.entry].includes("translation_private {pub struct Hold<'a>{pub value:&'a u64}}"));assert.ok(result.after[input.entry].includes("fn valid<'a>(value:&'a "+C+'U64'));inverse(result);
 });
}
test('bounded complete lifetime source lists retain only actual unique binders and closed outlives references',limits,()=>{
 const rows=rustTokens("<'a:'b+'static,'b,>("),binders=readLifetimeOnlySourceBinders(rows,0);assert.deepEqual(binders.declared,["'a","'b"]);assert.deepEqual(binders.lifetimes,["'a","'b"]);assert.equal(rows[binders.after].text,'(');assert.equal(readLifetimeOnlyTypeOwnerSource(rustTokens("crate::Holder<'a,'b>"),binders.lifetimes),true);assert.equal(readLifetimeOnlyTypeOwnerSource(rustTokens('Owner')),true);for(const source of ["<'a,T>","<const N:usize>","<'static>","<'_>","<'a,'a>","<'a:'missing>","<'a=Other>"])assert.throws(()=>readLifetimeOnlySourceBinders(rustTokens(source),0));for(const source of ["Owner<'missing>","Owner<u64>","Trait for Owner","Owner where 'a:'static"])assert.throws(()=>readLifetimeOnlyTypeOwnerSource(rustTokens(source),["'a"]));
});
test('five complete compiler equations retain native source owners two phases and full source inverses',limits,()=>{const plan=prepareFixedTypeLifetimeSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
