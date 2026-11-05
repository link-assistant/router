// Independent explicit local type adoption source. SOURCE ONLY; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCoreFixedTypesCorpus as ordinary} from '../migrate-core-fixed-types.mjs';
import {proposeCoreFixedTypesCorpus as bound} from '../source-bound-owned-migrate-core-fixed-types.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {translateProject} from '../project.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareFixedLocalTypeAdoptionSources} from '../prepare-fixed-local-type-adoption-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::',widths=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'];
function fixture(source){return {entry:'src/lib.rs',files:{'src/lib.rs':'pub mod translation_fixed_types_core;\n'+source,'src/translation_fixed_types_core.rs':FIXED_TYPE_CORE_NATIVE_SOURCE}};}
function inverse(result){for(const row of result.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution'){assert.equal(source.slice(...edit.after),edit.replacement);source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);}assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);}}
for(const [label,propose]of [['ordinary',ordinary],['source-bound',bound]]){
 test(label+' sixty substitutions share complete local type grammar and owned constants across twenty actual callers',limits,async()=>{
  const source=widths.flatMap(type=>['MIN','MAX'].map(name=>'pub fn '+name.toLowerCase()+'_'+type+'()->'+type+'{let value: /* local type */ '+type+' = '+type+'::'+name+';value}')).join('\n'),input=fixture(source),proposal=propose(input);assert.equal(proposal.proposals.reduce((n,row)=>n+row.edits.length,0),60);for(const type of widths)assert.ok(proposal.after[input.entry].includes('let value: /* local type */ '+C+type[0].toUpperCase()+type.slice(1)));inverse(proposal);assert.deepEqual(propose({...input,files:proposal.after}).after,proposal.after);const result=translateProject({entry:input.entry,paths:Object.keys(proposal.after),readSource:path=>proposal.after[path]});await verifyTypedTargets(result,api=>{for(const type of widths){const bits=BigInt(type.slice(1)),signed=type[0]==='i',min=signed?-(1n<<(bits-1n)):0n,max=(1n<<(signed?bits-1n:bits))-1n;assert.equal(api['min_'+type](),min);assert.equal(api['max_'+type](),max);}},{childTimeoutMs:20000});
 });
 test(label+' local bool and binary64 annotations use the existing actual scalar bridge without adding carrier operations',limits,async()=>{
  const input=fixture('pub fn flag()->bool{let selected:bool=true;selected}pub fn zero()->f64{let selected:f64=0.0;selected}'),proposal=propose(input),text=proposal.after[input.entry];assert.ok(text.includes('let selected:'+C+'Bool=true'));assert.ok(text.includes('let selected:'+C+'F64=0.0'));inverse(proposal);const result=translateProject({entry:input.entry,paths:Object.keys(proposal.after),readSource:path=>proposal.after[path]});await verifyTypedTargets(result,api=>{assert.equal(api.flag(),true);assert.ok(Object.is(api.zero(),0));},{childTimeoutMs:20000});
 });
 test(label+' nested local types and actual named regions preserve complete source without using body data as type permission',limits,()=>{
  const input=fixture("pub fn nested<'a>(input:&'a u64)->bool{let borrowed:&'a u64=input;let tuple:(u8,bool)=(0,true);let array:[u16;2]=[0,0];let optional:Option<u32> = None;true}"),proposal=propose(input),text=proposal.after[input.entry];assert.ok(text.includes("let borrowed:&'a "+C+'U64=input'));assert.ok(text.includes('let tuple:('+C+'U8,'+C+'Bool)'));assert.ok(text.includes('let array:['+C+'U16;2]'));assert.ok(text.includes('let optional:Option<'+C+'U32>'));inverse(proposal);
 });
 test(label+' unsupported local type grammar and producer/shadow scope keep the entire original body while retaining independent header proposals',limits,()=>{
  for(const body of ['let callback:fn(u64)->u64=unknown;u64::MAX','let pending:u64;u64::MAX','let first:u64=0;let second:impl Trait=unknown;u64::MAX','type u64=Other;let value:u64=u64::MAX;value','let value:u64=u64::MAX;unknown!();value','let value:u64=u64::MAX;let value:u64=0;value']){const input=fixture('pub fn guarded()->u64{'+body+'}'),result=propose(input),text=result.after[input.entry],selection=result.proposals.flatMap(row=>row.selections).find(row=>row.name==='guarded');assert.ok(text.includes('pub fn guarded()->'+C+'U64{'+body+'}'));assert.equal(selection.bodySource.edits.length,0);assert.equal(typeof selection.bodySource.reason,'string');inverse(result);}
 });
}
test('four complete local type compiler equations retain source owners two phases CST and complete original inverses',limits,()=>{const plan=prepareFixedLocalTypeAdoptionSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
