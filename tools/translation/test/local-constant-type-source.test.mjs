// Independent local constant type cases. SOURCE ONLY; ALL CASES UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {proposeCoreFixedTypesCorpus as ordinary} from '../migrate-core-fixed-types.mjs';
import {proposeCoreFixedTypesCorpus as bound} from '../source-bound-owned-migrate-core-fixed-types.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {localSourceConstantDeclarations} from '../local-source-constant-type.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';import {verifyTypedTargets} from './typed-targets.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareLocalConstantTypeSources} from '../prepare-local-constant-type-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::',profile={flags:{test:false},values:{target_pointer_width:['64']},closedKeys:['target_pointer_width']};
function fixture(source){return {entry:'src/lib.rs',compilationProfile:profile,files:{'src/lib.rs':'pub mod translation_fixed_types_core;\n'+source,'src/translation_fixed_types_core.rs':FIXED_TYPE_CORE_NATIVE_SOURCE}};}
function inverse(plan){for(const row of plan.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution')source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);assert.equal(source,row.before.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.executableAdmission,false);}
for(const [label,adopt]of [['ordinary',ordinary],['source-bound',bound]]){
 test(label+' typed named anonymous nested carrier and compound local constants retain original source and both inverse phases',limits,()=>{
  const source='pub fn chosen(value:u64)->u64{const LIMIT: /* 🦀 type */ u64=u64::MAX;const _:bool=true;const PAIR:(u8,bool)=(1,true);const ARRAY:[u16;2]=[1,2];const OPTIONAL:Option<usize> =None;let copy:u64=value;copy}',input=fixture(source),plan=adopt(input),after=plan.after[input.entry];assert.ok(after.includes('const LIMIT: /* 🦀 type */ '+C+'U64='+C+'U64::MAX'));assert.ok(after.includes('const _:'+C+'Bool=true'));assert.ok(after.includes('const PAIR:('+C+'U8,'+C+'Bool)=(1,true)'));assert.ok(after.includes('const ARRAY:['+C+'U16;2]=[1,2]'));assert.ok(after.includes('const OPTIONAL:Option<'+C+'Usize> =None'));assert.ok(after.includes('let copy:'+C+'U64=value'));inverse(plan);assert.deepEqual(adopt({...input,files:plan.after}).after,plan.after);
 });
 test(label+' native hoisting constant bounds and mixed local cast operands require whole JS and strict TS behavior',limits,async()=>{
  const source='pub fn bound()->u64{const LIMIT:u64=u64::MAX;LIMIT}pub fn minimum()->i64{const LIMIT:i64=i64::MIN;LIMIT}pub fn hoisted()->u64{let value=LIMIT;const LIMIT:u64=42;value}pub fn cast_count()->usize{const LIMIT:u64=255;LIMIT as usize}',input=fixture(source),plan=adopt(input),files=plan.after,result=translateProject({entry:input.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile});await verifyTypedTargets(result,api=>{assert.equal(api.bound(),18446744073709551615n);assert.equal(api.minimum(),-9223372036854775808n);assert.equal(api.hoisted(),42n);assert.equal(api.cast_count(),255n);},{childTimeoutMs:20000});inverse(plan);
 });
 test(label+' selected primitive parameters later locals declarations macros attributes and unsupported const forms retain complete original body',limits,()=>{
  for(const body of ['const u64:u64=1;u64::MAX','const value:u64=1;value','const LIMIT:u64=1;let LIMIT=2;u64::MAX','const LIMIT:u64=1;const LIMIT:u64=2;u64::MAX','const LIMIT:u64=unknown!();u64::MAX','#[unknown]const LIMIT:u64=1;u64::MAX','const LIMIT:u64={type u64=Other;0};u64::MAX','const {1};u64::MAX','const LIMIT<T>:u64=1;u64::MAX','const fn nested()->u64{1}u64::MAX']){const input=fixture('pub fn guarded(value:u64)->u64{'+body+'}'),plan=adopt(input),after=plan.after[input.entry];assert.ok(after.includes('{'+body+'}'));const selection=plan.proposals.flatMap(row=>row.selections).find(row=>row.name==='guarded');assert.equal(selection.bodySource.edits.length,0);assert.equal(typeof selection.bodySource.reason,'string');inverse(plan);}
 });
}
test('local declaration language syntax has detached original token ranges and requires complete initialized forms',limits,()=>{
 const rows=rustTokens('const LIMIT:(u64,bool)=(1,true);const _:u8=0;'),entries=localSourceConstantDeclarations(rows);assert.equal(entries.length,2);assert.equal(entries[0].name,'LIMIT');assert.equal(entries[1].name,'_');assert.equal(entries[0].keyword,rows[0]);assert.equal(entries[0].sourceAuthority,false);assert.equal(entries[0].semanticAuthority,false);for(const text of ['const LIMIT:u64;','const LIMIT:u64=;','const LIMIT:u64=1','const LIMIT<T>:u64=1;','const {1}'])assert.throws(()=>localSourceConstantDeclarations(rustTokens(text)));
});
test('three complete implementation equations retain source owners serialized CST phases and full inverses',limits,()=>{const plan=prepareLocalConstantTypeSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
