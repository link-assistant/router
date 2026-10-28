// Independent complete declaration source cases. SOURCE ONLY; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCoreFixedTypesCorpus as ordinary} from '../migrate-core-fixed-types.mjs';
import {proposeCoreFixedTypesCorpus as bound} from '../source-bound-owned-migrate-core-fixed-types.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareFixedTypeDeclarationSources} from '../prepare-fixed-type-declarations-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::';
const declaration='pub mod translation_fixed_types_core;\n';
function input(source){return {entry:'src/lib.rs',files:{'src/lib.rs':declaration+source,'src/translation_fixed_types_core.rs':FIXED_TYPE_CORE_NATIVE_SOURCE}};}
function inverse(result){for(const row of result.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution'){assert.equal(source.slice(...edit.after),edit.replacement);source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);}assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);}}
for(const [label,propose]of [['ordinary',ordinary],['source-bound',bound]]){
 test(label+' one shared selector covers monomorphic named/tuple/enum/union/alias/static type positions and preserves complete source',limits,()=>{
  const source='pub struct Packet {pub id:u64, ok:bool, coords:(i16,f64)}\npub struct Pair(pub u8,pub(crate) u32);\npub enum Message {Empty,One(u64),Named{code:i32,flag:bool},Nested(Option<(u8,u16)>),}\npub type Scalar = u128;\npub static ZERO:i64 = 0;\npub union Bits {wide:u64,real:f64}',request=input(source),result=propose(request),text=result.after[request.entry];assert.equal(result.proposals.reduce((n,row)=>n+row.edits.length,0),15);for(const name of ['U64','Bool','I16','F64','U8','U32','I32','U16','U128','I64'])assert.ok(text.includes(C+name));assert.ok(text.includes('Empty,One('+C+'U64)'));assert.ok(text.includes('pub(crate) '+C+'U32'));assert.ok(text.includes('pub static ZERO:'+C+'I64 = 0;'));assert.equal(result.before[request.entry],request.files[request.entry]);inverse(result);assert.deepEqual(propose({...request,files:result.after}).after,result.after);assert.equal(result.executableAdmission,false);
 });
 test(label+' a malformed or unsupported field/variant aborts its complete owner and retains unrelated valid owners',limits,()=>{
  for(const unsupported of ['pub struct Bad {first:u64,#[unknown] second:u32}','pub struct Bad {first:u64,second:impl Trait}','pub struct Bad<T> {first:u64,second:T}','pub enum Bad {First(u64),Second = unknown!()}','pub enum Bad {First(u64),#[unknown] Second(u32)}','pub type Bad<T> = (u64,T);','pub struct Bad(u64,u32) where Other: Trait;']){const request=input(unsupported+'\npub const GOOD:u8 = 1;'),result=propose(request),text=result.after[request.entry];assert.ok(text.includes(unsupported));assert.ok(text.includes('pub const GOOD:'+C+'U8 = 1;'));assert.ok(result.proposals.some(row=>row.skipped.some(skip=>skip.name==='Bad')));inverse(result);}
 });
 test(label+' qualified associated type paths and complete unchanged discriminants remain source data, never inferred scalar aliases',limits,()=>{
  const source='pub struct Paths {one:std::primitive::u64,two:External::u64,three:[usize;2]}pub enum Tags {A=1,B=2}pub type Qualified=std::primitive::u64;',request=input(source),result=propose(request);assert.equal(result.after[request.entry],request.files[request.entry]);inverse(result);
 });
 test(label+' actual primitive shadows block field aliases too and compatibility inline fields remain protected',limits,()=>{
  const shadow=input('pub type u64=String;pub struct Packet {value:u64}'),refused=propose(shadow);assert.equal(refused.after[shadow.entry],shadow.files[shadow.entry]);const request=input('pub mod translation_private {pub struct Packet {pub value:u64}}pub struct Public {pub value:u64}'),result=propose(request);assert.ok(result.after[request.entry].includes('translation_private {pub struct Packet {pub value:u64}}'));assert.ok(result.after[request.entry].includes('pub struct Public {pub value:'+C+'U64}'));inverse(result);
 });
}
test('four complete compiler equations retain native source owners CST and inverses without executing application adoption',limits,()=>{const plan=prepareFixedTypeDeclarationSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
