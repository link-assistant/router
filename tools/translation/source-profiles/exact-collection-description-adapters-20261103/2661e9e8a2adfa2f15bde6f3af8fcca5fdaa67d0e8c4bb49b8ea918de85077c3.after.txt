// Independent original API/declaration and source-replay case SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PRIMITIVE_SEQUENCE_CONTRACTS} from '../primitive-sequence-contracts.mjs';
import {PRIMITIVE_OWNED_VECTOR_CONTRACTS} from '../primitive-owned-vector-contracts.mjs';
import {primitiveSequenceOperationShape} from '../primitive-sequence-call-shape.mjs';
import {primitiveOwnedVectorOperationShape} from '../primitive-owned-vector-call-shape.mjs';
import {PRIMITIVE_COLLECTION_DOMAINS,primitiveCollectionOperationShape,primitiveCollectionDeclarationType,emitPrimitiveCollectionDeclarations} from '../primitive-collection-operation-descriptions-20261103.mjs';
import {proposePrimitiveCollectionDescriptionSources} from '../primitive-collection-descriptions-20261103-profile.mjs';
import {applyConcreteSourceRulePlan,restoreConcreteSourceRulePlan} from '../concrete-source-rule-registry.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const domains=['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'];
const lanes=[
 {family:'sequence',prefix:'slice',module:'translation_primitive_sequences_core',operations:['len','is_empty','get'],original:primitiveSequenceOperationShape,count:33},
 {family:'owned-vector',prefix:'vec',module:'translation_primitive_vectors_core',operations:['new','from_slice','push','append','truncate','replace','len','get'],original:primitiveOwnedVectorOperationShape,count:88},
];
// Independent old native signature expectations. Do not derive these roles
// from either contract table, the new projection or future installed wrappers.
function expectedShape(lane,domain,operation){
 const sequence=lane.family==='sequence',role='vec:'+domain,rustName=lane.prefix+'_'+domain+'_'+operation;
 const parameters=sequence?[domain+'-list-ref',...(operation==='get'?['u64']:[])]:{
  new:[],from_slice:[domain+'-list-ref'],push:[role,domain],append:[role,role],truncate:[role,'u64'],replace:[role,'u64',domain],len:[role+'-ref'],get:[role+'-ref','u64'],
 }[operation];
 const returns=sequence?{len:'u64',is_empty:'bool',get:domain+'-option'}[operation]:operation==='len'?'u64':operation==='get'?domain+'-option':role;
 return {domain,operation,rustName,javascriptName:'router_'+rustName,rustPath:'crate::'+lane.module+'::'+rustName,parameters,returns,...(sequence?{runtimeModule:'primitive-sequence-runtime.mjs'}:{}),sourceAuthority:false,semanticAuthority:false};
}
test('all121 native and JavaScript candidate shapes match both complete original API implementations',{timeout:60000},()=>{
 assert.deepEqual(PRIMITIVE_COLLECTION_DOMAINS,domains);assert.equal(Object.isFrozen(PRIMITIVE_COLLECTION_DOMAINS),true);
 for(const lane of lanes){
  let count=0;
  for(const domain of domains)for(const operation of lane.operations){
   const name=lane.prefix+'_'+domain+'_'+operation;
   for(const spelling of [name,'router_'+name]){
    const expected=expectedShape(lane,domain,operation),actual=primitiveCollectionOperationShape(lane.family,spelling);assert.deepEqual(lane.original(spelling),expected);assert.deepEqual(actual,expected);assert.equal(actual.sourceAuthority,false);assert.equal(actual.semanticAuthority,false);
    actual.parameters.push('foreign');assert.deepEqual(primitiveCollectionOperationShape(lane.family,spelling),expected);
   }count++;
  }assert.equal(count,lane.count);
 }
 assert.equal(PRIMITIVE_SEQUENCE_CONTRACTS.length,33);assert.equal(PRIMITIVE_OWNED_VECTOR_CONTRACTS.length,88);
 for(const row of [...PRIMITIVE_SEQUENCE_CONTRACTS,...PRIMITIVE_OWNED_VECTOR_CONTRACTS])assert.equal(row.parameters.includes('foreign'),false);
});
test('finite candidate names refuse unsupported domains, aliases, whitespace and nonstrings',{timeout:60000},()=>{
 for(const lane of lanes)for(const name of [null,undefined,{},42,'',lane.prefix+'_f32_get',lane.prefix+'_usize_len',lane.prefix+'_str_len',lane.prefix+'_bool_unknown','router_router_'+lane.prefix+'_bool_len',lane.prefix+'_bool_len\n',' '+lane.prefix+'_bool_len',lane.prefix+'_BOOL_len','crate::'+lane.prefix+'_bool_len']){
  assert.equal(lane.original(name),null);assert.equal(primitiveCollectionOperationShape(lane.family,name),null);
 }
 let called=0;const foreign={toString(){called++;return 'sequence';}};
 for(const family of [null,undefined,'foreign','__proto__',foreign]){
  assert.throws(()=>primitiveCollectionOperationShape(family,'slice_bool_len'));assert.throws(()=>primitiveCollectionDeclarationType(family,'bool'));assert.throws(()=>emitPrimitiveCollectionDeclarations(family));
 }assert.equal(called,0);
});
test('all121 strict declarations retain both entire original declaration sources and branded integer types',{timeout:60000},()=>{
 for(const [family,file,count]of [['sequence','primitive-sequence-runtime.d.mts',33],['owned-vector','primitive-owned-vector-runtime.d.mts',88]]){
  const source=emitPrimitiveCollectionDeclarations(family);assert.equal(source,readFileSync(join(ROOT,'tools/translation/extensions',file),'utf8'));assert.equal(source.split('export declare function ').length-1,count);assert.doesNotMatch(source,/\bany\b/u);
 }
 assert.equal(primitiveCollectionDeclarationType('sequence','u128-list-ref'),'readonly RustU128[]');assert.equal(primitiveCollectionDeclarationType('sequence','i128-option'),'PrimitiveSequenceOption<RustI128>');
 assert.equal(primitiveCollectionDeclarationType('owned-vector','vec:bool'),'PrimitiveOwnedVector<boolean>');assert.equal(primitiveCollectionDeclarationType('owned-vector','vec:u64-ref'),'PrimitiveOwnedVector<RustU64>');
 for(const [family,role]of [['sequence','vec:u8'],['sequence','str'],['owned-vector','vec:f64'],['owned-vector','usize'],['sequence',null],['owned-vector',{}]])assert.throws(()=>primitiveCollectionDeclarationType(family,role));
});
test('two actual shape modules and two unchanged strict declarations have full two-phase CST/inverse proposals',{timeout:60000},()=>{
 const proposal=proposePrimitiveCollectionDescriptionSources(),plan=proposal.plan;assert.equal(plan.files.length,4);assert.equal(proposal.declarations.length,2);assert.equal(proposal.newFiles.length,1);
 assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.nativeBindingQualified,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.verification,'UNRUN');assert.deepEqual(plan.stages.map(row=>row.phase),['language','repository']);
 for(const row of plan.files){
  assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);
  if(row.path.endsWith('.d.mts'))assert.equal(row.after,row.before);
  else {assert.match(row.after,/primitiveCollectionOperationShape/u);assert.match(row.after,/primitive-collection-operation-descriptions-20261103\.mjs/u);}
 }
 for(const stage of plan.stages)for(const row of stage.files){assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);}
 for(const row of proposal.newFiles){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);}
 const original=plan.files.map(row=>({path:row.path,language:row.language,source:row.before})),first=applyConcreteSourceRulePlan(original,plan),current=first.files.map(({path,language,source})=>({path,language,source}));
 assert.equal(first.applied,true);assert.equal(applyConcreteSourceRulePlan(current,plan).alreadyApplied,true);assert.deepEqual(restoreConcreteSourceRulePlan(current,plan).files.map(row=>row.source),original.map(row=>row.source));
 const stale=original.map((row,at)=>at===0?{...row,source:row.source+'// changed original'}:row);assert.throws(()=>applyConcreteSourceRulePlan(stale,plan));
 const mixed=current.map((row,at)=>at===0?original[at]:row);assert.throws(()=>applyConcreteSourceRulePlan(mixed,plan));
});
test('all existing type/optional witnesses and native type spellings remain in their whole original modules',{timeout:60000},()=>{
 const {plan}=proposePrimitiveCollectionDescriptionSources();
 const sequence=plan.files.find(row=>row.path.endsWith('primitive-sequence-call-shape.mjs')),vector=plan.files.find(row=>row.path.endsWith('primitive-owned-vector-call-shape.mjs'));
 const sequenceSuffix=sequence.before.slice(sequence.before.indexOf('export function primitiveSequenceOptionalWitness'));assert.equal(sequence.after.endsWith(sequenceSuffix),true);
 const vectorSuffix=vector.before.slice(vector.before.indexOf('export function primitiveOwnedVectorTypeWitness'));assert.equal(vector.after.endsWith(vectorSuffix),true);
 for(const spelling of ['export function ownedPrimitiveVectorElement','export function ownedPrimitiveVectorSharedElement','export const OWNED_PRIMITIVE_VECTOR_RUST_TYPES','export const SHARED_PRIMITIVE_VECTOR_RUST_TYPES'])assert.equal(vector.after.split(spelling).length,vector.before.split(spelling).length);
});
