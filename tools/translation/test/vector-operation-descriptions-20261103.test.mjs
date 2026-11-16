// Independent original signature/limit/source-replay case SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownedTextVectorOperationShape} from '../owned-text-vector-call-shape.mjs';
import {primitiveVectorLiteralOperationShape} from '../primitive-vector-literal-call-shape.mjs';
import {ownedTextVectorLiteralOperationShape} from '../owned-text-vector-literal-call-shape.mjs';
import {vectorOperationShape,emitVectorOperationDeclarations,VECTOR_LITERAL_MAX_SOURCE_ARGUMENTS} from '../vector-operation-descriptions-20261103.mjs';
import {proposeVectorOperationDescriptionSources} from '../vector-operation-descriptions-20261103-profile.mjs';
import {applyConcreteSourceRulePlan,restoreConcreteSourceRulePlan} from '../concrete-source-rule-registry.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const domains=['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'];
const operations=['new','from_slice','push','append','truncate','replace','len','get'];
// Expected roles, native paths, copy/clone and bounds are independent of the
// new descriptions and contract tables, including after future source adoption.
function expectedOwned(operation){
 const role='vec:text-owned',parameters={new:[],from_slice:['text-owned-list-ref'],push:[role,'text-owned'],append:[role,role],truncate:[role,'u64'],replace:[role,'u64','text-owned'],len:[role+'-ref'],get:[role+'-ref','u64']}[operation];
 return {operation,rustName:'vec_text_'+operation,javascriptName:'router_owned_text_vec_'+operation,rustPath:'crate::translation_owned_text_vectors_core::vec_text_'+operation,parameters,returns:operation==='len'?'u64':operation==='get'?'text-owned-option':role,sourceAuthority:false,semanticAuthority:false};
}
function expectedLiteral(domain,count){
 const text=domain==='text-owned',name=text?'router_owned_text_vec_literal':'router_vec_'+domain+'_literal',rustName=text?'vec_text_from_slice':'vec_'+domain+'_from_slice',rustPath='crate::'+(text?'translation_owned_text_vectors_core':'translation_primitive_vectors_core')+'::'+rustName;
 const base={domain,javascriptName:name,rustName,rustPath,parameters:Array(count).fill(domain),returns:'vec:'+domain,sourceArity:count,maxSourceArguments:64,maxValues:4096,returnedLoan:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,receivingExecuted:false};
 return text?{...base,operation:'literal',clonesOwnedText:true,runtimeModule:'owned-text-vector-literal-runtime.mjs',declarationModule:'owned-text-vector-literal-runtime.d.mts',privateCallerBindingQualified:false}:{...base,schema:'primitive-vector-literal-shape-v1',runtimeModule:'primitive-vector-literal-runtime.mjs',declarationModule:'primitive-vector-literal-runtime.d.mts',evaluationOrder:'left-to-right'};
}
test('all eight owning-text operations retain both original public spellings and exact role shapes',{timeout:60000},()=>{
 for(const operation of operations)for(const name of ['vec_text_'+operation,'router_owned_text_vec_'+operation]){
  const expected=expectedOwned(operation);assert.deepEqual(ownedTextVectorOperationShape(name),expected);const actual=vectorOperationShape('owned-text-vector',name);assert.deepEqual(actual,expected);
  actual.parameters.push('foreign');assert.deepEqual(vectorOperationShape('owned-text-vector',name),expected);
 }
 for(const name of ['vec_text_unknown','router_owned_text_vec_len\n','router_vec_text_new',null,{},0])assert.equal(vectorOperationShape('owned-text-vector',name),null);
});
test('all twelve literal wrappers retain every zero-through64 source arity and clone/Copy distinctions',{timeout:60000},()=>{
 assert.equal(VECTOR_LITERAL_MAX_SOURCE_ARGUMENTS,64);let checked=0;
 for(const domain of [...domains,'text-owned'])for(let count=0;count<=64;count++){
  const text=domain==='text-owned',kind=text?'owned-text-literal':'primitive-literal',expected=expectedLiteral(domain,count),original=text?ownedTextVectorLiteralOperationShape:primitiveVectorLiteralOperationShape;
  assert.deepEqual(original(expected.javascriptName,count),expected);const actual=vectorOperationShape(kind,expected.javascriptName,count);assert.deepEqual(actual,expected);assert.equal(actual.returnedLoan,false);
  actual.parameters.push('foreign');assert.equal(vectorOperationShape(kind,expected.javascriptName,count).parameters.length,count);checked++;
 }assert.equal(checked,780);
 for(const kind of ['primitive-literal','owned-text-literal']){
  const name=kind==='primitive-literal'?'router_vec_bool_literal':'router_owned_text_vec_literal',zero=vectorOperationShape(kind,name,-0);assert.equal(Object.is(zero.sourceArity,-0),true);assert.deepEqual(zero.parameters,[]);
  assert.deepEqual(vectorOperationShape(kind,name,undefined),expectedLiteral(kind==='primitive-literal'?'bool':'text-owned',0));
 }
});
test('literal limits and finite names refuse without coercion or public authority',{timeout:60000},()=>{
 let called=0;const foreign={valueOf(){called++;return 1;},toString(){called++;return 'owned-text-literal';}};
 for(const [kind,name,original]of [['primitive-literal','router_vec_u8_literal',primitiveVectorLiteralOperationShape],['owned-text-literal','router_owned_text_vec_literal',ownedTextVectorLiteralOperationShape]]){
  for(const count of [-1,65,1.5,Infinity,NaN,null,'0',1n,foreign]){assert.equal(original(name,count),null);assert.equal(vectorOperationShape(kind,name,count),null);}
  for(const invalid of [name+'\n',' '+name,'vec_u8_literal','router_vec_f64_literal','router_vec_usize_literal',null,foreign])assert.equal(vectorOperationShape(kind,invalid,0),null);
 }
 for(const kind of [null,'foreign','__proto__',foreign]){assert.throws(()=>vectorOperationShape(kind,'router_vec_bool_literal'));assert.throws(()=>emitVectorOperationDeclarations(kind));}assert.equal(called,0);
});
test('all three generated strict declaration modules preserve their entire independent originals',{timeout:60000},()=>{
 for(const [kind,name,count]of [['owned-text-vector','owned-text-vector-runtime.d.mts',8],['primitive-literal','primitive-vector-literal-runtime.d.mts',11],['owned-text-literal','owned-text-vector-literal-runtime.d.mts',1]]){
  const source=emitVectorOperationDeclarations(kind);assert.equal(source,readFileSync(join(ROOT,'tools/translation/extensions',name),'utf8'));assert.equal(source.split('export declare function ').length-1,count);assert.doesNotMatch(source,/\bany\b/u);
 }
 assert.match(emitVectorOperationDeclarations('primitive-literal'),/router_vec_u128_literal\(\.\.\.values: RustU128\[\]\): PrimitiveOwnedVector<RustU128>;/u);
 assert.match(emitVectorOperationDeclarations('owned-text-literal'),/\.\.\.values: string\[\]\): OwnedTextVector;/u);
});
test('three actual candidate parents and three unchanged declarations retain complete two-phase source histories',{timeout:60000},()=>{
 const proposal=proposeVectorOperationDescriptionSources(),plan=proposal.plan;assert.equal(plan.files.length,6);assert.equal(proposal.declarations.length,3);assert.equal(proposal.newFiles.length,1);assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.nativeBindingQualified,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.verification,'UNRUN');
 assert.deepEqual(plan.stages.map(stage=>stage.phase),['language','repository']);
 for(const row of plan.files){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);if(row.path.endsWith('.d.mts'))assert.equal(row.after,row.before);else assert.match(row.after,/vector-operation-descriptions-20261103\.mjs/u);}
 for(const stage of plan.stages)for(const row of stage.files){assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);}
 for(const row of proposal.newFiles){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);}
 const original=plan.files.map(row=>({path:row.path,language:row.language,source:row.before})),first=applyConcreteSourceRulePlan(original,plan),current=first.files.map(({path,language,source})=>({path,language,source}));assert.equal(first.applied,true);assert.equal(applyConcreteSourceRulePlan(current,plan).alreadyApplied,true);assert.deepEqual(restoreConcreteSourceRulePlan(current,plan).files.map(row=>row.source),original.map(row=>row.source));
 assert.throws(()=>applyConcreteSourceRulePlan(original.map((row,at)=>at===0?{...row,source:row.source+'// stale'}:row),plan));assert.throws(()=>applyConcreteSourceRulePlan(current.map((row,at)=>at===0?original[at]:row),plan));
 const text=plan.files.find(row=>row.path.endsWith('owned-text-vector-call-shape.mjs')),suffix=text.before.slice(text.before.indexOf('export function ownedTextVectorTypeWitness'));assert.equal(text.after.endsWith(suffix),true);
});
