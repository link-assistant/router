// Independent bare constant adoption source. SOURCE ONLY; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCoreFixedTypesCorpus as ordinary} from '../migrate-core-fixed-types.mjs';
import {proposeCoreFixedTypesCorpus as bound} from '../source-bound-owned-migrate-core-fixed-types.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {translateProject} from '../project.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareFixedConstantAdoptionSources} from '../prepare-fixed-constant-adoption-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::',widths=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'];
function fixture(source){return {entry:'src/lib.rs',files:{'src/lib.rs':'pub mod translation_fixed_types_core;\n'+source,'src/translation_fixed_types_core.rs':FIXED_TYPE_CORE_NATIVE_SOURCE}};}
function inverse(result){for(const row of result.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution'){assert.equal(source.slice(...edit.after),edit.replacement);source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);}assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);}}
for(const [label,propose]of [['ordinary',ordinary],['source-bound',bound]]){
 test(label+' forty source substitutions adopt twenty actual bare integer-bound callers through the genuine owned type/constant bridge',limits,async()=>{
  const source=widths.flatMap(type=>['MIN','MAX'].map(name=>'pub fn '+name.toLowerCase()+'_'+type+'()->'+type+'{'+type+' /* preserve trivia */ :: '+name+'}')).join('\n'),input=fixture(source),proposal=propose(input);assert.equal(proposal.proposals.reduce((n,row)=>n+row.edits.length,0),40);for(const type of widths){const name=type[0].toUpperCase()+type.slice(1);assert.ok(proposal.after[input.entry].includes(C+name+' /* preserve trivia */ :: MIN'));assert.ok(proposal.after[input.entry].includes(C+name+' /* preserve trivia */ :: MAX'));}inverse(proposal);assert.deepEqual(propose({...input,files:proposal.after}).after,proposal.after);const result=translateProject({entry:input.entry,paths:Object.keys(proposal.after),readSource:path=>proposal.after[path]});await verifyTypedTargets(result,api=>{for(const type of widths){const bits=BigInt(type.slice(1)),signed=type[0]==='i',min=signed?-(1n<<(bits-1n)):0n,max=(1n<<(signed?bits-1n:bits))-1n;assert.equal(api['min_'+type](),min);assert.equal(api['max_'+type](),max);}},{childTimeoutMs:20000});
 });
 test(label+' local shadow and source producer uncertainty retain original body bytes while separately safe headers remain explicit proposals',limits,()=>{
  for(const body of ['type u64=Other;u64::MAX','use other::*;u64::MAX','unknown!();u64::MAX','let shadow=||u64::MAX;shadow()','let u64=0;u64::MAX','fn inner<u64>(){}u64::MAX','#[unknown] let local=0;u64::MAX']){const input=fixture('pub fn guarded()->u64{'+body+'}'),result=propose(input),text=result.after[input.entry],selection=result.proposals.flatMap(row=>row.selections).find(row=>row.name==='guarded');assert.ok(text.includes('pub fn guarded()->'+C+'U64{'+body+'}'));assert.equal(selection.bodySource.edits.length,0);assert.equal(typeof selection.bodySource.reason,'string');assert.equal(selection.bodySource.executableAdmission,false);inverse(result);}
 });
 test(label+' ordinary immutable locals and branch operands reuse complete scope while qualified paths and literal text remain unchanged',limits,()=>{
  const source='pub fn chosen(flag:bool)->u64{let limit=u64::MAX;if flag{u64::MIN}else{limit}}pub fn qualified()->u64{std::primitive::u64::MAX}pub fn quoted()->&\'static str{"u64::MAX"}',input=fixture(source),result=propose(input),text=result.after[input.entry];assert.ok(text.includes('let limit='+C+'U64::MAX'));assert.ok(text.includes('if flag{'+C+'U64::MIN}'));assert.ok(text.includes('std::primitive::u64::MAX'));assert.ok(text.includes('"u64::MAX"'));inverse(result);
 });
 test(label+' module primitive shadows and absent native interfaces cannot acquire body substitution permission',limits,()=>{
  const input=fixture('type u64=Other;pub fn guarded()->u64{u64::MAX}'),result=propose(input);assert.equal(result.after[input.entry],input.files[input.entry]);const files={'src/lib.rs':'pub fn guarded()->u64{u64::MAX}'},absent=propose({files});assert.deepEqual(absent.after,files);assert.equal(absent.executableAdmission,false);
 });
}
test('four complete compiler equations retain source owners CST ordered phases and whole inverses',limits,()=>{const plan=prepareFixedConstantAdoptionSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
