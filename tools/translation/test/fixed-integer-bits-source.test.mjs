// Independent complete callers and refusal cases. SOURCE ONLY; UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {proposeCoreFixedTypesCorpus as ordinary} from '../migrate-core-fixed-types.mjs';
import {proposeCoreFixedTypesCorpus as bound} from '../source-bound-owned-migrate-core-fixed-types.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {translateProject} from '../project.mjs';import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareFixedIntegerBitsSources} from '../prepare-fixed-integer-bits-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::',domains=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128','usize','isize'],profile={flags:{test:false},values:{target_pointer_width:['64']},closedKeys:['target_pointer_width']};
function fixture(source,compilationProfile=profile){return {entry:'src/lib.rs',files:{'src/lib.rs':'pub mod translation_fixed_types_core;\n'+source,'src/translation_fixed_types_core.rs':FIXED_TYPE_CORE_NATIVE_SOURCE},compilationProfile};}
function translate(input){return translateProject({entry:input.entry,paths:Object.keys(input.files),readSource:path=>input.files[path],compilationProfile:input.compilationProfile});}
function inverse(proposal){for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution'){assert.equal(source.slice(...edit.after),edit.replacement);source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);}assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.executableAdmission,false);}
for(const [label,adopt]of [['ordinary',ordinary],['source-bound',bound]]){
 test(label+' twelve actual integer bit-width callers retain native u32 result types through independent JS and strict TS',limits,async()=>{
  const source=domains.map(type=>'pub fn bits_'+type+'()->u32{'+type+' /* 🦀 preserve exact trivia */ :: BITS}').join('\n'),input=fixture(source),proposal=adopt(input);assert.equal(proposal.proposals.reduce((total,row)=>total+row.edits.length,0),24);inverse(proposal);assert.deepEqual(adopt({...input,files:proposal.after}).after,proposal.after);const result=translate({...input,files:proposal.after}),wire=JSON.stringify(result.meta.checkedSemanticProgram),program=parseProgram(wire);assert.equal(serializeProgram(program),wire);
  for(const type of domains){const entry=program.declarations.get('bits_'+type);assert.equal(entry.ret.kind,'fixed');assert.equal(entry.ret.bits,32);assert.equal(entry.ret.signed,false);assert.equal(entry.ret.rustPrimitiveName,'u32');}
  await verifyTypedTargets(result,api=>{for(const type of domains)assert.equal(api['bits_'+type](),BigInt(type.endsWith('size')?64:Number(type.slice(1))));},{childTimeoutMs:20000});
 });
 test(label+' bit widths compose with bounds casts local annotations and arithmetic without changing associated-constant ownership',limits,async()=>{
  const input=fixture('pub fn sum()->u32{let narrow:u32=u8::BITS;let wide:u32=u128::BITS;narrow+wide}pub fn widened()->u64{u64::BITS as u64}pub fn limit()->u64{u64::MAX}'),proposal=adopt(input);inverse(proposal);assert.ok(proposal.after[input.entry].includes(C+'U8::BITS'));assert.ok(proposal.after[input.entry].includes(C+'U128::BITS'));const result=translate({...input,files:proposal.after});await verifyTypedTargets(result,api=>{assert.equal(api.sum(),136n);assert.equal(api.widened(),64n);assert.equal(api.limit(),18446744073709551615n);},{childTimeoutMs:20000});
 });
 test(label+' selected primitive shadows and unknown local producers retain complete original BITS body bytes',limits,()=>{
  for(const body of ['type u64=Other;u64::BITS','let u64=0;u64::BITS','unknown!();u64::BITS','use other::*;u64::BITS','let closure=||u64::BITS;closure()']){const input=fixture('pub fn guarded()->u32{'+body+'}'),proposal=adopt(input),selection=proposal.proposals.flatMap(row=>row.selections).find(row=>row.name==='guarded');assert.ok(proposal.after[input.entry].includes('{'+body+'}'));assert.equal(selection.bodySource.edits.length,0);assert.equal(typeof selection.bodySource.reason,'string');inverse(proposal);}
  const input=fixture('type u64=Other;pub fn guarded()->u32{u64::BITS}'),proposal=adopt(input);assert.equal(proposal.after[input.entry],input.files[input.entry]);
 });
 test(label+' explicitly qualified foreign constants strings and nongenuine core aliases acquire no new executable authority',limits,()=>{
  const input=fixture('pub fn qualified()->u32{std::primitive::u64::BITS}pub fn text()->&\'static str{"u64::BITS"}'),proposal=adopt(input);assert.ok(proposal.after[input.entry].includes('std::primitive::u64::BITS'));assert.ok(proposal.after[input.entry].includes('"u64::BITS"'));inverse(proposal);
  const wrong=fixture('pub fn chosen()->'+C+'U32{'+C+'U64::BITS}');wrong.files['src/translation_fixed_types_core.rs']=FIXED_TYPE_CORE_NATIVE_SOURCE.replace('pub type U64 = ::std::primitive::u64;','pub type U64 = ::std::primitive::u8;');assert.equal(translate(wrong).meta.executable.some(row=>row.name==='chosen'),false);
 });
}
test('machine BITS refuses explicit nonportable or ambiguous pointer widths and float or boolean pseudo-constants',limits,()=>{
 for(const values of [['32'],['16'],['32','64']]){const input=fixture('pub fn chosen()->'+C+'U32{'+C+'Usize::BITS}',{flags:{test:false},values:{target_pointer_width:values},closedKeys:['target_pointer_width']});assert.equal(translate(input).meta.executable.some(row=>row.name==='chosen'),false);}
 for(const alias of ['Bool','F64']){const input=fixture('pub fn chosen()->'+C+'U32{'+C+alias+'::BITS}');assert.equal(translate(input).meta.executable.some(row=>row.name==='chosen'),false);}
});
test('three compiler source equations retain both phases complete originals current bytes and full inverses',limits,()=>{
 const plan=prepareFixedIntegerBitsSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
