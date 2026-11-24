import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Eight source-only authored cases; ALL UNRUN, no generator/trait execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction,astSyntaxText} from '../builtin-derive-ast-meta.mjs';
import {createBuiltinAstSourceSubstitution,assertBuiltinAstClosureApplication,isBuiltinAstClosureApplication} from '../builtin-ast-source-substitution.mjs';
import {createBuiltinVecRemoveSourcePlan,assertBuiltinVecRemoveSourcePlan,isBuiltinVecRemoveSourcePlan} from '../builtin-vec-remove-plan.mjs';
import {createBuiltinDeriveFieldAstBridge} from '../builtin-ast-field-construction.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies),generic='compiler/rustc_builtin_macros/src/deriving/generic/mod.rs';
function collect(node,predicate,result=[]){if(!node||typeof node!=='object')return result;if(predicate(node))result.push(node);for(const [key,value]of Object.entries(node))if(!['syntax','schema','recipe','import','typeSyntax','sourceBinding','original','declaredTypeSyntax'].includes(key))if(Array.isArray(value))value.forEach(value=>collect(value,predicate,result));else collect(value,predicate,result);return result;}
function application(name='create_struct_field_access_fields'){
  const stage=createBuiltinAstSourceSubstitution(profile),caller=stage.compile(originalAstFunction(profile,generic,name)),callee=stage.compile(originalAstFunction(profile,generic,'create_fields'));
  const calls=collect(caller.tree,value=>value.kind==='source-method-call'&&value.method==='create_fields');assert.equal(calls.length,1);
  return {stage,caller,callee,call:calls[0],value:stage.applyClosure(caller,callee,calls[0].span.start)};
}

test('actual create_fields Fn bound supplies three source arguments and the original declared return body',()=>{
  const {value}=application();assert.equal(value.callbackParameter.name,'mk_exprs');assert.equal(value.callbackBound.arguments.length,3);
  assert.deepEqual(value.callbackBound.arguments.map(astSyntaxText),['usize','& ast :: FieldDef','Span']);
  assert.equal(astSyntaxText(value.callbackBound.returnTypeSyntax),'Vec < P < ast :: Expr > >');
  assert.equal(value.bindings.length,3);assert.equal(value.sourceOwner.source,generic);
  assert.ok(collect(value.declaredReturnBodyMeta.tree,node=>node.tag==='applied-original-closure-slot').length);
  assert.equal(value.fnTraitOwnerEstablished,false);assert.equal(value.typeResolutionEstablished,false);assert.equal(value.selectedOwnerBangComplete,false);
});

test('fresh source closure slots refer to actual callback arguments rather than same-spelling enclosing names',()=>{
  const {caller,callee,value}=application();
  const bindings=new Map(caller.slots.map(slot=>[slot.id,slot])),calleeSlots=new Set(callee.slots.map(slot=>slot.id));
  for(const row of value.bindings){assert.equal(bindings.get(row.closureSlot).kind,'closure-parameter');assert.equal(calleeSlots.has(row.closureSlot),false);assert.equal(row.typeResolutionEstablished,false);assert.equal(row.argument.fragment.digest,callee.fragment.digest);}
  assert.ok(value.captures.some(row=>bindings.get(row.slotId).name==='cx'));assert.ok(value.captures.every(row=>row.captureModeEstablished===false));
  assert.equal(value.declaredReturnBodyMeta.fragment.digest,caller.fragment.digest);
});

test('private closure application rejects copied programs/results and unrelated source stages',()=>{
  const {stage,caller,callee,call,value}=application();assert.equal(isBuiltinAstClosureApplication(value),true);assert.equal(isBuiltinAstClosureApplication(structuredClone(value)),false);
  assert.throws(()=>stage.applyClosure(structuredClone(caller),callee,call.span.start),/privately paired/);
  assert.throws(()=>stage.applyClosure(caller,structuredClone(callee),call.span.start),/privately paired/);
  assert.throws(()=>createBuiltinAstSourceSubstitution(profile).applyClosure(caller,callee,call.span.start),/privately paired/);
  assert.throws(()=>assertBuiltinAstClosureApplication(structuredClone(value),stage,caller,callee),/original source programs/);
});

test('call-site/owner/callback selection cannot be changed by a proposed caller recipe',()=>{
  const {stage,caller,callee,call}=application();
  assert.throws(()=>stage.applyClosure(caller,callee,call.span.start+1),/absent or ambiguous/);
  const other=stage.compile(originalAstFunction(profile,generic,'mk_pattern_ident'));
  assert.throws(()=>stage.applyClosure(caller,other,call.span.start),/absent or ambiguous/);
  const pattern=application('create_struct_pattern_fields');assert.equal(pattern.value.bindings.length,3);
  assert.ok(collect(pattern.value.declaredReturnBodyMeta.tree,node=>node.kind==='source-method-call'&&node.method==='mk_pattern_ident').length);
  assert.equal(pattern.value.sourceMethodOwnershipEstablished,false);
});

test('closure application retains packed mutation and control without declaring a selected/closed body',()=>{
  const {value}=application(),body=value.declaredReturnBodyMeta;
  assert.ok(collect(body.tree,node=>node.tag==='original-assignment'&&node.mutationEstablished===false).length);
  assert.ok(collect(body.tree,node=>node.tag==='unselected-source-join'&&node.selectionEstablished===false).length);
  assert.ok(collect(body.tree,node=>node.tag==='source-built-ast-record'&&node.owner==='Expr').length);
  assert.equal(body.mutationControlEstablished,false);assert.equal(body.allocationPhaseBehavior,false);
  assert.equal(value.mutationControlEstablished,false);assert.equal(value.generatedImplBehavior,false);
});

test('Vec remove original bounds and order retain local panic function with no enclosing captures',()=>{
  const plan=createBuiltinVecRemoveSourcePlan(profile),statements=plan.remove.tree.statements;
  assert.equal(plan.sourceSha256,'550d150a5f0a546ea94e6a3b29a70007980f42c930d042d044e2d03ae9e36ae5');
  assert.equal(statements[0].tag,'original-local-function-definition');assert.equal(statements[0].name,'assert_failed');assert.deepEqual(statements[0].enclosingCaptureSlots,[]);
  assert.equal(statements[1].tag,'original-source-local');assert.equal(statements[1].binding.name,'len');assert.equal(statements[1].initializer.method,'len');
  const guard=statements[2];assert.equal(guard.tag,'original-source-branch');assert.equal(guard.condition.operator,'>=');assert.equal(guard.condition.left.binding.name,'index');assert.equal(guard.condition.right.binding.id,statements[1].binding.id);
  assert.equal(statements[3].tag,'original-unsafe-source-block');assert.equal(guard.selectionEstablished,false);
  assert.equal(plan.runtimeEvaluationEstablished,false);assert.equal(plan.dropBehaviorEstablished,false);
});

test('original ptr read/copy then set_len keep exact subtraction domains and never become JS array effects',()=>{
  const plan=createBuiltinVecRemoveSourcePlan(profile),unsafe=plan.remove.tree.statements.find(value=>value.tag==='original-unsafe-source-block');
  const read=collect(unsafe,value=>value.tag==='source-dataflow-call'&&value.path.join('::')==='ptr::read'),copy=collect(unsafe,value=>value.tag==='source-dataflow-call'&&value.path.join('::')==='ptr::copy');assert.equal(read.length,1);assert.equal(copy.length,1);
  assert.equal(copy[0].args[2].operator,'-');assert.equal(copy[0].args[2].left.operator,'-');assert.equal(copy[0].args[2].domainEstablished,false);
  const shrink=collect(unsafe,value=>value.tag==='source-dataflow-method'&&value.method==='set_len');assert.equal(shrink.length,1);assert.equal(shrink[0].args[0].operator,'-');assert.ok(copy[0].span.start<shrink[0].span.start);
  assert.equal(plan.pointerBehaviorEstablished,false);assert.equal(plan.allocationPhaseBehavior,false);assert.equal(plan.sourceMethodOwnershipEstablished,false);
  assert.equal(isBuiltinVecRemoveSourcePlan(structuredClone(plan)),false);assert.throws(()=>assertBuiltinVecRemoveSourcePlan(structuredClone(plan),profile),/original private source profile/);
});

test('actual invocation field bridge links source closure applications and removal without claiming bounds/StdVec ownership',()=>{
  const context=createDeriveFootprintContext({dependencies,compilationProfile:PRODUCTION_PROFILE,modules:[{file:'src/lib.rs',path:[],source:'mod data;'},{file:'src/data.rs',path:['data'],source:'#[derive(Clone,serde::Serialize)] struct Payload { value:String }'}]}),certificate=context.certificates[0];assert.ok(certificate);
  const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path.length===1&&path[0]==='Clone'));assert.ok(attribute);
  const bridge=createBuiltinDeriveFieldAstBridge({context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}});
  assert.equal(bridge.closureApplications.length,2);assert.equal(bridge.removeBridge.arguments[0].spelling,'0');assert.equal(bridge.removeBridge.methodOwnershipEstablished,false);assert.equal(bridge.removeBridge.boundsEstablished,false);assert.equal(bridge.removeBridge.mutationEstablished,false);
  assert.equal(bridge.rows[0].name.spelling,'value');assert.equal(bridge.rows[0].type.syntax,'String');assert.equal(bridge.fieldAstInputEstablished,false);assert.equal(bridge.selectedOwnerBangComplete,false);
});
