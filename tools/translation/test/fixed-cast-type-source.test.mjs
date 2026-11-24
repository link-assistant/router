// Independent complete source cast adoption cases. SOURCE ONLY; ALL CASES UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {proposeCoreFixedTypesCorpus as ordinary} from '../migrate-core-fixed-types.mjs';
import {proposeCoreFixedTypesCorpus as bound} from '../source-bound-owned-migrate-core-fixed-types.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {bareSourceCastTypeLeaves} from '../bare-source-cast-type.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareFixedCastTypeSources} from '../prepare-fixed-cast-type-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::',domains=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128','usize','isize'],alias=type=>type[0].toUpperCase()+type.slice(1),profile={flags:{test:false},values:{target_pointer_width:['64']},closedKeys:['target_pointer_width']};
function fixture(source){return {entry:'src/lib.rs',compilationProfile:profile,files:{'src/lib.rs':'pub mod translation_fixed_types_core;\n'+source,'src/translation_fixed_types_core.rs':FIXED_TYPE_CORE_NATIVE_SOURCE}};}
function inverse(plan){for(const row of plan.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution')source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.executableAdmission,false);}
for(const [name,adopt]of [['ordinary',ordinary],['source-bound',bound]]){
 test(name+' thirteen actual cast targets retain original operator comments spans and whole inverse with stable second adoption',limits,()=>{
  const source=[...domains,'f64'].map(type=>'pub fn cast_'+type+'(value:u64)->'+type+'{value /* 🦀 operand */ as /* target */ '+type+'}').join('\n'),input=fixture(source),plan=adopt(input),after=plan.after[input.entry];for(const type of [...domains,'f64'])assert.ok(after.includes('value /* 🦀 operand */ as /* target */ '+C+alias(type)));inverse(plan);assert.deepEqual(adopt({...input,files:plan.after}).after,plan.after);
 });
 test(name+' integer truncation widening signed reinterpretation and machine casts use independently checked full JS/strict TS behavior',limits,async()=>{
  const input=fixture(domains.map(type=>'pub fn cast_'+type+'(value:u64)->'+type+'{value as '+type+'}').join('\n')),plan=adopt(input),files=plan.after,result=translateProject({entry:input.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile});await verifyTypedTargets(result,api=>{for(const type of domains){const bits=type.endsWith('size')?64:Number(type.slice(1));for(const value of [0n,1n,127n,128n,255n,256n,4294967296n,18446744073709551615n]){const expected=type[0]==='i'?BigInt.asIntN(bits,value):BigInt.asUintN(bits,value);assert.equal(api['cast_'+type](value),expected);}}},{childTimeoutMs:20000});inverse(plan);
 });
 test(name+' float integer casts preserve native saturation NaN infinities truncation and integer rounding',limits,async()=>{
  const input=fixture('pub fn to_signed(value:f64)->i64{value as i64}pub fn to_unsigned(value:f64)->u64{value as u64}pub fn to_float(value:u64)->f64{value as f64}'),plan=adopt(input),files=plan.after,result=translateProject({entry:input.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile});await verifyTypedTargets(result,api=>{for(const [value,signed,unsigned]of [[NaN,0n,0n],[Infinity,9223372036854775807n,18446744073709551615n],[-Infinity,-9223372036854775808n,0n],[-1.9,-1n,0n],[1.9,1n,1n],[-0,0n,0n]]){assert.equal(api.to_signed(value),signed);assert.equal(api.to_unsigned(value),unsigned);}for(const value of [0n,1n,9007199254740993n,18446744073709551615n])assert.equal(api.to_float(value),Number(value));},{childTimeoutMs:20000});inverse(plan);
 });
 test(name+' local producers primitive shadows qualified cast targets and literal text never acquire partial body substitution permission',limits,()=>{
  for(const body of ['type u8=Other;value as u8','let u8=0;value as u8','use other::*;value as u8','let closure=||value as u8;closure()','unknown!();value as u8']){const input=fixture('pub fn blocked(value:u64)->u8{'+body+'}'),plan=adopt(input);assert.ok(plan.after[input.entry].includes('{'+body+'}'));inverse(plan);}const input=fixture('pub fn qualified(value:u64)->u8{value as std::primitive::u8}pub fn quoted(value:u64)->u8{let text="as u8";value as u8}'),plan=adopt(input),after=plan.after[input.entry];assert.ok(after.includes('value as std::primitive::u8'));assert.ok(after.includes('let text="as u8";value as '+C+'U8'));inverse(plan);
 });
}
test('general cast source positions are lexical data and skip qualified generic and unselected type leaves',limits,()=>{
 const rows=rustTokens('value as u8 + value as std::primitive::u8 + value as u8::Other + value as u8<Other> + value as Other'),selected=bareSourceCastTypeLeaves(rows,['u8']);assert.equal(selected.length,1);assert.equal(selected[0].token.text,'u8');assert.equal(selected[0].sourceAuthority,false);assert.equal(selected[0].semanticAuthority,false);
});
test('three complete compiler equations retain actual source owners both CST phases and full inverses',limits,()=>{const plan=prepareFixedCastTypeSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
