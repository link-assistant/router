// Independent expectations and complete source-replay case SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {BORROWED_PREDICATE_OPERATION_DESCRIPTIONS,borrowedPredicateOperationDescription,borrowedPredicateNativeArity,borrowedPredicateLoweredArity,borrowedPredicateReverseDescription,emitBorrowedPredicateDeclaration} from '../borrowed-predicate-operation-descriptions-20261103.mjs';
import {proposeBorrowedPredicateDescriptionSources} from '../borrowed-predicate-descriptions-20261103-profile.mjs';
import {applyConcreteSourceRulePlan,restoreConcreteSourceRulePlan} from '../concrete-source-rule-registry.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {borrowedJsonToolReverseOperation,borrowedJsonToolReverseRustCall} from '../borrowed-json-tool-20261103-reverse.mjs';
import {borrowedStandardMapReverseOperation,borrowedStandardMapReverseRustCall} from '../borrowed-standard-map-20261103-reverse.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
// Expectations deliberately do not derive their roles, arities, paths or limits
// from the descriptors under test or from emitted caller bodies.
const expected=[
 {id:'borrowed-json-tool:predicate',name:'borrowedJsonToolIsTranslatable',path:'crate::borrowed_json_tool_predicate_20261103::borrowed_json_tool_is_translatable',parameters:['borrowed-json-tool-input'],shared:[0],arity:1,minimum:1,maximum:1,original:borrowedJsonToolReverseOperation},
 {id:'borrowed-standard-map:literal-predicate',name:'router_borrowed_text_map_matches_literals',path:'crate::borrowed_standard_map_20261102::borrowed_text_map_matches_literals',parameters:['standard-text-map-input','str','literal-str-slice'],shared:[0,1,2],arity:3,minimum:2,maximum:66,original:borrowedStandardMapReverseOperation},
];
test('both original operation descriptions preserve exact forward and reverse roles without issuing proof',{timeout:60000},()=>{
 assert.equal(BORROWED_PREDICATE_OPERATION_DESCRIPTIONS.length,2);
 for(const row of expected){
  const description=borrowedPredicateOperationDescription(row.id),reverse=borrowedPredicateReverseDescription(row.id,row.name);
  assert.equal(description.javascriptName,row.name);assert.equal(description.rustPath,row.path);
  assert.equal(borrowedPredicateNativeArity(row.id),row.arity);assert.deepEqual(borrowedPredicateLoweredArity(row.id),{minimum:row.minimum,maximum:row.maximum});
  assert.deepEqual(reverse.parameters,row.parameters);assert.deepEqual(reverse.shared,row.shared);assert.deepEqual(reverse.consumed,[]);assert.equal(reverse.returns,'bool');assert.equal(reverse.returnedLoan,false);
  assert.deepEqual(reverse,row.original(row.name));assert.equal(reverse.containerEntryLimit,null);assert.equal(reverse.valueByteLimit,null);
  assert.equal(description.sourceAuthority,false);assert.equal(description.semanticAuthority,false);assert.equal(description.namespaceAuthority,false);assert.equal(description.privateCallerBindingQualified,false);assert.equal(description.receivingExecuted,false);
  assert.equal(Object.isFrozen(description),true);assert.equal(Object.isFrozen(description.parameters),true);assert.ok(description.parameters.every(Object.isFrozen));
  reverse.parameters.push('foreign');reverse.shared.length=0;assert.deepEqual(borrowedPredicateReverseDescription(row.id,row.name).parameters,row.parameters);assert.deepEqual(borrowedPredicateReverseDescription(row.id,row.name).shared,row.shared);
  assert.equal(borrowedPredicateReverseDescription(row.id,'shadowed_'+row.name),null);
 }
 assert.equal(borrowedPredicateOperationDescription('foreign'),null);
 for(const value of ['foreign',null,{},expected[0].name]){
  assert.throws(()=>borrowedPredicateNativeArity(value));assert.throws(()=>borrowedPredicateLoweredArity(value));assert.throws(()=>emitBorrowedPredicateDeclaration(value));assert.throws(()=>borrowedPredicateReverseDescription(value,expected[0].name));
 }
});
test('strict declaration emission retains both complete original pinned declaration sources',{timeout:60000},()=>{
 const files=[['borrowed-json-tool:predicate','borrowed-json-tool-predicate-20261103-runtime.d.mts'],['borrowed-standard-map:literal-predicate','borrowed-standard-map-20261102-runtime.d.mts']];
 for(const [id,name]of files)assert.equal(emitBorrowedPredicateDeclaration(id),readFileSync(join(ROOT,'tools/translation',name),'utf8'));
 assert.match(emitBorrowedPredicateDeclaration(files[0][0]),/\(tool: unknown\): boolean;/u);
 const map=emitBorrowedPredicateDeclaration(files[1][0]);assert.match(map,/BORROWED_MAP_LITERAL_LIMIT: 64;/u);assert.match(map,/map: ReadonlyMap<string, string>, key: string, literals: readonly string\[\],/u);
});
test('complete six-parent language/repository proposal has full intermediate CST and inverse source',{timeout:60000},()=>{
 const proposal=proposeBorrowedPredicateDescriptionSources(),plan=proposal.plan;
 assert.equal(plan.files.length,6);assert.equal(proposal.declarations.length,2);assert.equal(proposal.newFiles.length,1);
 assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.nativeBindingQualified,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.verification,'UNRUN');
 assert.deepEqual(plan.stages.map(stage=>stage.phase),['language','repository']);assert.deepEqual(plan.trace.map(stage=>stage.phase),['language','repository']);
 for(const row of plan.files){
  assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);
  if(row.path.endsWith('.d.mts'))assert.equal(row.after,row.before);
  else assert.match(row.after,/borrowed-predicate-operation-descriptions-20261103\.mjs/u);
 }
 for(const stage of plan.stages){
  assert.equal(stage.files.length,6);
  for(const row of stage.files){assert.equal(row.inverse,row.before);assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);}
 }
 for(const row of proposal.newFiles){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);assert.equal(row.semanticAuthority,false);}
 const original=plan.files.map(row=>({path:row.path,language:row.language,source:row.before})),applied=applyConcreteSourceRulePlan(original,plan),current=applied.files.map(({path,language,source})=>({path,language,source}));
 assert.equal(applied.applied,true);assert.equal(applyConcreteSourceRulePlan(current,plan).alreadyApplied,true);
 const restored=restoreConcreteSourceRulePlan(current,JSON.parse(JSON.stringify(plan)));assert.deepEqual(restored.files.map(row=>row.source),original.map(row=>row.source));
 for(let at=0;at<restored.files.length;at++)assert.equal(restored.files[at].history.inverse,current[at].source);
 const stale=original.map((row,at)=>at===0?{...row,source:row.source+'\n// stale whole parent\n'}:row);assert.throws(()=>applyConcreteSourceRulePlan(stale,plan));
 const partial=current.map((row,at)=>at===0?original[at]:row);assert.throws(()=>applyConcreteSourceRulePlan(partial,plan));
});
test('actual private forward issuers, whole-body checker and literal guards survive the proposed sharing',{timeout:60000},()=>{
 const {plan}=proposeBorrowedPredicateDescriptionSources();
 for(const row of plan.files.filter(row=>row.path.endsWith('-forward.mjs'))){
  // Source retention is deliberately separate from future semantic receiving.
  for(const guard of ['requireOriginalFromNamespaceCallbacks','requireOriginalPrimitiveTryFromChecker','withCompleteSourceClosingFence','withSourceInputValidation','metadataDigest','matchesParserFacts','requireCurrentPrivateCall'])assert.equal(row.after.split(guard).length,row.before.split(guard).length);
  assert.match(row.after,/borrowedPredicateNativeArity\(CONTRACT.id\)/u);
  if(row.path.includes('standard-map')){
   assert.ok(row.after.includes('function literalItems(syntax)'));assert.ok(row.after.includes('maximumLiteralCount'));assert.ok(row.after.includes('requireBorrowedString'));assert.ok(row.after.includes('checked literal operand required'));
  }else assert.ok(row.after.includes('requireBorrowedJsonToolType'));
 }
 const json=plan.files.find(row=>row.path.endsWith('json-tool-20261103-reverse.mjs'));
 assert.equal(json.after.slice(json.after.indexOf('export function validateBorrowedJsonToolReverseBody')),json.before.slice(json.before.indexOf('export function validateBorrowedJsonToolReverseBody')));
 const map=plan.files.find(row=>row.path.endsWith('standard-map-20261103-reverse.mjs'));
 for(const text of ['account(input)','copyMetadata(input)','function rustText(value)','unpaired surrogate literal refused','/^__ro_arg_[0-9]+$/u'])assert.equal(map.after.split(text).length,map.before.split(text).length);
});
test('independent existing native operand and maximum-literal refusal cases retain original boundaries',{timeout:60000},()=>{
 assert.equal(borrowedJsonToolReverseRustCall(expected[0].name,['__ro_arg_0']),expected[0].path+'(__ro_arg_0)');
 for(const args of [[],['__ro_arg_0','__ro_arg_1'],['effect()'],['tool']])assert.throws(()=>borrowedJsonToolReverseRustCall(expected[0].name,args));
 const sixtyFour=Array.from({length:64},(_,at)=>'name'+at),call=borrowedStandardMapReverseRustCall(expected[1].name,['__ro_arg_0','__ro_arg_1'],sixtyFour);
 assert.ok(call.startsWith(expected[1].path+'(__ro_arg_0, __ro_arg_1, &['));assert.ok(call.endsWith('"name63"])'));
 assert.throws(()=>borrowedStandardMapReverseRustCall(expected[1].name,['__ro_arg_0','__ro_arg_1'],[...sixtyFour,'name64']));
 for(const args of [[],['__ro_arg_0'],['__ro_arg_0','effect()'],['__ro_arg_0','__ro_arg_1','__ro_arg_2']])assert.throws(()=>borrowedStandardMapReverseRustCall(expected[1].name,args,[]));
 assert.throws(()=>borrowedStandardMapReverseRustCall(expected[1].name,['__ro_arg_0','__ro_arg_1'],['\ud800']));
});
